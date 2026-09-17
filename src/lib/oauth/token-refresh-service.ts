import { prisma } from "@/lib/prisma";
import { CredentialService, encryptSecret } from "@/lib/security/credential-service";
import { getOAuthProvider } from "./provider-registry";

export interface DecryptedOAuthPayload {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  tokenType?: string;
  provider: string;
  scopes?: string[];
}

export class TokenRefreshService {
  static async getValidAccessToken(
    connectionOrCredentialId: string,
    userId?: string,
  ): Promise<string> {
    if (!connectionOrCredentialId) {
      throw new Error("OAUTH_MISSING_ID: Connection or Credential ID is required.");
    }

    // 1. Check if input is an OAuthConnection ID
    let oauthConn = await prisma.oAuthConnection.findFirst({
      where: {
        OR: [
          { id: connectionOrCredentialId },
          { credentialId: connectionOrCredentialId },
        ],
      },
    });

    const targetCredentialId = oauthConn ? oauthConn.credentialId : connectionOrCredentialId;

    // 2. Fetch & Decrypt secret payload from Vault
    const resolvedCred = await CredentialService.getDecryptedCredential(targetCredentialId, userId);
    if (!resolvedCred || !resolvedCred.secret) {
      throw new Error(`OAUTH_CREDENTIAL_NOT_FOUND: Could not load Vault credential '${targetCredentialId}'.`);
    }

    let payload: DecryptedOAuthPayload;
    try {
      payload = JSON.parse(resolvedCred.secret);
    } catch {
      // If secret is raw token string, return directly
      return resolvedCred.secret;
    }

    const { accessToken, refreshToken, expiresAt, provider: providerId } = payload;

    // 3. Check if token requires background refresh (if expiring in <= 5 mins)
    const BUFFER_MS = 5 * 60 * 1000;
    const isExpiring = typeof expiresAt === "number" && Date.now() + BUFFER_MS >= expiresAt;

    if (isExpiring && refreshToken && providerId) {
      const provider = getOAuthProvider(providerId);
      if (provider) {
        try {
          const { clientId, clientSecret } = provider.getClientCredentials();
          const bodyParams = new URLSearchParams();
          bodyParams.append("client_id", clientId);
          bodyParams.append("client_secret", clientSecret);
          bodyParams.append("grant_type", "refresh_token");
          bodyParams.append("refresh_token", refreshToken);

          const res = await fetch(provider.tokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              Accept: "application/json",
            },
            body: bodyParams.toString(),
          });

          const data = await res.json();
          if (res.ok && data.access_token) {
            const newAccessToken = data.access_token as string;
            const newRefreshToken = (data.refresh_token as string) || refreshToken;
            const expiresInSec = typeof data.expires_in === "number" ? data.expires_in : 3600;
            const newExpiresAt = Date.now() + expiresInSec * 1000;

            const updatedPayload: DecryptedOAuthPayload = {
              ...payload,
              accessToken: newAccessToken,
              refreshToken: newRefreshToken,
              expiresAt: newExpiresAt,
            };

            const updatedSecretStr = JSON.stringify(updatedPayload);
            const { encryptedValue, iv } = encryptSecret(updatedSecretStr);

            // Update Vault Credential in DB
            await prisma.credential.update({
              where: { id: targetCredentialId },
              data: {
                encryptedValue,
                iv,
                lastUsedAt: new Date(),
              },
            });

            // Update OAuthConnection record in DB
            if (oauthConn) {
              await prisma.oAuthConnection.update({
                where: { id: oauthConn.id },
                data: {
                  status: "active",
                  lastRefreshedAt: new Date(),
                  expiresAt: new Date(newExpiresAt),
                  lastUsedAt: new Date(),
                },
              });
            }

            return newAccessToken;
          }
        } catch (err) {
          console.warn(`Token refresh failed for ${providerId} (${targetCredentialId}):`, err);
        }
      }
    }

    // 4. Update lastUsedAt timestamp on successful token access
    if (oauthConn) {
      await prisma.oAuthConnection.update({
        where: { id: oauthConn.id },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});
    }

    return accessToken || resolvedCred.secret;
  }
}
