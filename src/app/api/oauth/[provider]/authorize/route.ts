import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { buildAuthorizeUrl, getOAuthProvider } from "@/lib/oauth/provider-registry";
import crypto from "crypto";

const SECRET_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "neuraloop-default-secret-key-32b!";

function encryptState(data: object): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.scryptSync(SECRET_KEY, "oauth-state-salt", 32);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let encrypted = cipher.update(JSON.stringify(data), "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return `${iv.toString("hex")}:${encrypted}:${authTag}`;
}

export async function GET(
  req: Request,
  props: { params: Promise<{ provider: string }> }
) {
  const { provider: rawProvider } = await props.params;
  const providerId = rawProvider.toLowerCase();
  const provider = getOAuthProvider(providerId);

  if (!provider) {
    return NextResponse.json(
      { error: `OAUTH_PROVIDER_UNKNOWN: Provider '${providerId}' is not supported.` },
      { status: 400 }
    );
  }

  let userId = "user_demo_123";
  let orgId: string | undefined = undefined;

  try {
    const authObj = await auth();
    if (authObj?.userId) {
      userId = authObj.userId;
      orgId = authObj.orgId || undefined;
    }
  } catch (err) {
    console.warn("Clerk auth optional check in OAuth authorize:", err);
  }

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/oauth/callback`;

  const rawState = crypto.randomBytes(16).toString("hex");
  const authUrlResult = buildAuthorizeUrl(providerId, redirectUri, rawState);

  if (!authUrlResult) {
    return NextResponse.json(
      { error: `OAUTH_AUTHORIZE_FAILED: Could not construct authorize URL for '${providerId}'.` },
      { status: 500 }
    );
  }

  const statePayload = {
    state: rawState,
    provider: providerId,
    userId,
    orgId,
    codeVerifier: authUrlResult.codeVerifier,
    redirectUri,
    createdAt: Date.now(),
  };

  const encryptedState = encryptState(statePayload);
  const res = NextResponse.redirect(authUrlResult.url);

  res.cookies.set("neuraloop_oauth_state", encryptedState, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600, // 10 minutes expiry
    path: "/",
  });

  return res;
}
