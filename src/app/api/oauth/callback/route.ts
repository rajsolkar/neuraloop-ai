import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { encryptSecret } from "@/lib/security/credential-service";
import { exchangeCodeForTokens, fetchUserProfile, getOAuthProvider } from "@/lib/oauth/provider-registry";

const SECRET_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "neuraloop-default-secret-key-32b!";

function decryptState(encryptedStr: string): Record<string, unknown> | null {
  try {
    const [ivHex, encrypted, authTagHex] = encryptedStr.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const key = crypto.scryptSync(SECRET_KEY, "oauth-state-salt", 32);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return JSON.parse(decrypted);
  } catch (err) {
    console.warn("OAuth state cookie decryption failed:", err);
    return null;
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateParam = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const host = req.headers.get("host") || "localhost:3000";
  const protocol = host.includes("localhost") ? "http" : "https";
  const redirectUri = `${protocol}://${host}/api/oauth/callback`;

  if (errorParam) {
    return NextResponse.redirect(`${protocol}://${host}/settings/connections?error=${encodeURIComponent(errorParam)}`);
  }

  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/neuraloop_oauth_state=([^;]+)/);
  const stateCookie = match ? match[1] : null;

  if (!stateCookie) {
    return NextResponse.redirect(`${protocol}://${host}/settings/connections?error=OAUTH_STATE_COOKIE_MISSING`);
  }

  const stateData = decryptState(stateCookie);
  if (!stateData || stateData.state !== stateParam) {
    return NextResponse.redirect(`${protocol}://${host}/settings/connections?error=OAUTH_STATE_INVALID`);
  }

  const providerId = (stateData.provider as string) || "google";
  const userId = (stateData.userId as string) || "user_demo_123";
  const orgId = (stateData.orgId as string) || null;
  const codeVerifier = (stateData.codeVerifier as string) || undefined;

  try {
    // 1. Exchange authorization code for OAuth tokens
    const tokens = await exchangeCodeForTokens(providerId, code || "", redirectUri, codeVerifier);

    // 2. Fetch user profile identity (email, name, avatar)
    const profile = await fetchUserProfile(providerId, tokens.accessToken);

    const provider = getOAuthProvider(providerId);
    const providerName = provider?.name || providerId.toUpperCase();
    const accountEmail = profile.email || profile.name || `${providerId}_account`;
    const credName = `${providerName} Connection (${accountEmail})`;

    const expiresInSec = tokens.expiresIn || 3600;
    const expiresAtMs = Date.now() + expiresInSec * 1000;

    // 3. Store encrypted token payload in Vault Credential
    const vaultPayload = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: expiresAtMs,
      provider: providerId,
      scopes: provider?.scopes || [],
      rawResponse: tokens.rawResponse,
    };

    const { encryptedValue, iv } = encryptSecret(JSON.stringify(vaultPayload));

    const credentialRecord = await prisma.credential.create({
      data: {
        userId,
        organizationId: orgId,
        name: credName,
        provider: providerId,
        encryptedValue,
        iv,
        metadata: {
          accountEmail: profile.email || null,
          accountName: profile.name || null,
          accountAvatar: profile.avatar || null,
          scopes: provider?.scopes || [],
          isOAuth: true,
          expiresAt: new Date(expiresAtMs).toISOString(),
        },
        lastUsedAt: new Date(),
      },
    });

    // 4. Create or Update OAuthConnection record in DB
    await prisma.oAuthConnection.upsert({
      where: { id: credentialRecord.id },
      create: {
        id: credentialRecord.id,
        userId,
        organizationId: orgId,
        provider: providerId,
        accountEmail: profile.email || null,
        accountName: profile.name || null,
        accountAvatar: profile.avatar || null,
        scopes: provider?.scopes || [],
        credentialId: credentialRecord.id,
        status: "active",
        lastRefreshedAt: new Date(),
        expiresAt: new Date(expiresAtMs),
        lastUsedAt: new Date(),
      },
      update: {
        accountEmail: profile.email || null,
        accountName: profile.name || null,
        accountAvatar: profile.avatar || null,
        status: "active",
        lastRefreshedAt: new Date(),
        expiresAt: new Date(expiresAtMs),
        lastUsedAt: new Date(),
      },
    });

    const res = NextResponse.redirect(`${protocol}://${host}/settings/connections?connected=true&provider=${providerId}`);
    res.cookies.delete("neuraloop_oauth_state");
    return res;
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("OAuth callback error:", err);
    return NextResponse.redirect(`${protocol}://${host}/settings/connections?error=${encodeURIComponent(errorMsg)}`);
  }
}
