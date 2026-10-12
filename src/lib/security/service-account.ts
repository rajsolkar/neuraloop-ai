import crypto from "crypto";

export interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  client_id?: string;
  [key: string]: unknown;
}

/**
 * Validates that a string is a valid Google Cloud Service Account JSON key.
 * Throws an Error with code INVALID_SERVICE_ACCOUNT_JSON if validation fails.
 */
export function validateServiceAccountJson(jsonString: string): ServiceAccountCredentials {
  if (!jsonString || typeof jsonString !== "string" || !jsonString.trim()) {
    throw new Error("INVALID_SERVICE_ACCOUNT_JSON: Service account JSON string cannot be empty.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString.trim());
  } catch {
    throw new Error("INVALID_SERVICE_ACCOUNT_JSON: Value is not valid JSON.");
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("INVALID_SERVICE_ACCOUNT_JSON: Service account must be a JSON object.");
  }

  const obj = parsed as Record<string, unknown>;

  const clientEmail = obj.client_email;
  if (!clientEmail || typeof clientEmail !== "string" || !clientEmail.trim() || !clientEmail.includes("@")) {
    throw new Error("INVALID_SERVICE_ACCOUNT_JSON: Missing or invalid 'client_email' in service account JSON.");
  }

  const privateKey = obj.private_key;
  if (!privateKey || typeof privateKey !== "string" || !privateKey.trim()) {
    throw new Error("INVALID_SERVICE_ACCOUNT_JSON: Missing or invalid 'private_key' in service account JSON.");
  }

  if (!privateKey.includes("BEGIN PRIVATE KEY") && !privateKey.includes("BEGIN RSA PRIVATE KEY")) {
    throw new Error("INVALID_SERVICE_ACCOUNT_JSON: 'private_key' must be a PEM-formatted private key.");
  }

  return {
    ...obj,
    client_email: clientEmail.trim(),
    private_key: privateKey.trim(),
  };
}

/**
 * Exchanges a Google Cloud Service Account JWT for an OAuth 2.0 Bearer access token
 * using RS256 signing via Node's native crypto module.
 */
export async function exchangeServiceAccountToken(
  sa: { client_email: string; private_key: string },
  scope: string = "https://www.googleapis.com/auth/spreadsheets",
): Promise<{ success: boolean; accessToken?: string; error?: string }> {
  try {
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: "RS256", typ: "JWT" };
    const claims = {
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    const base64url = (input: string) =>
      Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedClaims = base64url(JSON.stringify(claims));
    const signInput = `${encodedHeader}.${encodedClaims}`;

    const signer = crypto.createSign("RSA-SHA256");
    signer.update(signInput);
    const signature = signer
      .sign(sa.private_key, "base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    const jwt = `${signInput}.${signature}`;

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      const errMsg = data.error_description || data.error || `HTTP ${res.status}`;
      return { success: false, error: String(errMsg) };
    }

    if (!data.access_token) {
      return { success: false, error: "Token response did not contain an access_token." };
    }

    return { success: true, accessToken: data.access_token as string };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
