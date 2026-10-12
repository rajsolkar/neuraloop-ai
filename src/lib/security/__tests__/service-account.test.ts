import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKeyPairSync } from "crypto";
import {
  validateServiceAccountJson,
  exchangeServiceAccountToken,
} from "../service-account";
import {
  maskSecret,
  CredentialService,
} from "../credential-service";

describe("Google Service Account Security & Auth Test Suite", () => {
  // Generate a valid ephemeral RSA 2048 keypair for RS256 testing
  const { privateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const validServiceAccount = {
    type: "service_account",
    project_id: "test-gcp-project",
    private_key_id: "key-id-12345",
    private_key: privateKey,
    client_email: "sheets-sync@test-gcp-project.iam.gserviceaccount.com",
    client_id: "1029384756",
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
  };

  const validJsonString = JSON.stringify(validServiceAccount);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. validateServiceAccountJson", () => {
    it("successfully validates and parses valid service account JSON", () => {
      const parsed = validateServiceAccountJson(validJsonString);
      expect(parsed.client_email).toBe("sheets-sync@test-gcp-project.iam.gserviceaccount.com");
      expect(parsed.private_key).toContain("BEGIN PRIVATE KEY");
      expect(parsed.project_id).toBe("test-gcp-project");
    });

    it("throws INVALID_SERVICE_ACCOUNT_JSON when string is empty or whitespace", () => {
      expect(() => validateServiceAccountJson("")).toThrow("INVALID_SERVICE_ACCOUNT_JSON");
      expect(() => validateServiceAccountJson("   ")).toThrow("cannot be empty");
    });

    it("throws INVALID_SERVICE_ACCOUNT_JSON when JSON is malformed", () => {
      expect(() => validateServiceAccountJson("{ invalid json")).toThrow("Value is not valid JSON");
    });

    it("throws INVALID_SERVICE_ACCOUNT_JSON when payload is an array or primitive", () => {
      expect(() => validateServiceAccountJson("[\"foo\", \"bar\"]")).toThrow("must be a JSON object");
      expect(() => validateServiceAccountJson("\"just a string\"")).toThrow("must be a JSON object");
    });

    it("throws when client_email is missing or not an email", () => {
      const missingEmail = JSON.stringify({
        ...validServiceAccount,
        client_email: undefined,
      });
      expect(() => validateServiceAccountJson(missingEmail)).toThrow("Missing or invalid 'client_email'");

      const invalidEmail = JSON.stringify({
        ...validServiceAccount,
        client_email: "not-an-email",
      });
      expect(() => validateServiceAccountJson(invalidEmail)).toThrow("Missing or invalid 'client_email'");
    });

    it("throws when private_key is missing or not a PEM key", () => {
      const missingKey = JSON.stringify({
        ...validServiceAccount,
        private_key: undefined,
      });
      expect(() => validateServiceAccountJson(missingKey)).toThrow("Missing or invalid 'private_key'");

      const nonPemKey = JSON.stringify({
        ...validServiceAccount,
        private_key: "plain-secret-password-12345",
      });
      expect(() => validateServiceAccountJson(nonPemKey)).toThrow("must be a PEM-formatted private key");
    });
  });

  describe("2. Secret Redaction & Masking", () => {
    it("masks service account credentials as sa:client_email and never exposes private keys", () => {
      const masked = maskSecret(validJsonString);
      expect(masked).toBe("sa:sheets-sync@test-gcp-project.iam.gserviceaccount.com");
      expect(masked).not.toContain("BEGIN PRIVATE KEY");
      expect(masked).not.toContain(validServiceAccount.private_key_id);
    });

    it("masks standard secrets to last 4 characters", () => {
      expect(maskSecret("AIzaSyAbcd1234XYZ9876")).toBe("••••••••9876");
      expect(maskSecret("short")).toBe("••••••••hort");
      expect(maskSecret("1234")).toBe("••••••••");
      expect(maskSecret("")).toBe("••••••••");
    });
  });

  describe("3. RS256 Token Minting & Exchange", () => {
    it("successfully creates and posts signed RS256 JWT assertion to Google OAuth", async () => {
      let assertionUsed = "";

      vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
        const urlStr = String(url);
        expect(urlStr).toBe("https://oauth2.googleapis.com/token");
        expect(init?.method).toBe("POST");

        const bodyStr = String(init?.body);
        expect(bodyStr).toContain("urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer");

        const params = new URLSearchParams(bodyStr);
        assertionUsed = params.get("assertion") || "";

        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "ya29.c.b0AXv0zTQ...",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        } as Response;
      });

      const res = await exchangeServiceAccountToken({
        client_email: validServiceAccount.client_email,
        private_key: validServiceAccount.private_key,
      });

      expect(res.success).toBe(true);
      expect(res.accessToken).toBe("ya29.c.b0AXv0zTQ...");
      expect(assertionUsed).toBeTruthy();

      // Verify JWT structure: header.claims.signature
      const parts = assertionUsed.split(".");
      expect(parts).toHaveLength(3);
      const header = JSON.parse(Buffer.from(parts[0], "base64").toString());
      const claims = JSON.parse(Buffer.from(parts[1], "base64").toString());
      expect(header.alg).toBe("RS256");
      expect(claims.iss).toBe(validServiceAccount.client_email);
      expect(claims.aud).toBe("https://oauth2.googleapis.com/token");
    });

    it("handles Google OAuth error responses cleanly", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: "invalid_grant",
            error_description: "Invalid JWT: Token must be a short-lived token (60 minutes) and in a reasonable epoch range.",
          }),
        } as Response;
      });

      const res = await exchangeServiceAccountToken({
        client_email: validServiceAccount.client_email,
        private_key: validServiceAccount.private_key,
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Invalid JWT");
    });
  });

  describe("4. Credential Service Connectivity & Provider Compatibility", () => {
    it("tests google-sheets-service-account connectivity with token exchange", async () => {
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "ya29.valid-test-token",
            expires_in: 3600,
          }),
        } as Response;
      });

      const result = await CredentialService.testCredentialConnectivity(
        "google-sheets-service-account",
        validJsonString,
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("Successfully authenticated Google Service Account");
      expect(result.message).toContain(validServiceAccount.client_email);
    });

    it("rejects invalid JSON structure in testCredentialConnectivity", async () => {
      const result = await CredentialService.testCredentialConnectivity(
        "google-sheets-service-account",
        "{\"type\": \"service_account\"}",
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain("Missing or invalid 'client_email'");
    });

    it("validates standard google-sheets API key format", async () => {
      const result = await CredentialService.testCredentialConnectivity(
        "google-sheets",
        "AIzaSyDemoGoogleApiKey12345",
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("API key format validated successfully");
    });

    it("validates standard google-sheets OAuth token format", async () => {
      const result = await CredentialService.testCredentialConnectivity(
        "google-sheets",
        "ya29.a0ARrdaM-exampleToken",
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain("OAuth token format validated successfully");
    });
  });
});
