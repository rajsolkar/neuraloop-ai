import crypto from "crypto";

export interface OAuthProviderConfig {
  id: string;
  name: string;
  icon: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl?: string;
  scopes: string[];
  pkce?: boolean;
  getClientCredentials: () => { clientId: string; clientSecret: string };
  getAuthorizeParams?: () => Record<string, string>;
  parseProfile?: (profileData: Record<string, unknown>) => { email?: string; name?: string; avatar?: string };
}

export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
  google: {
    id: "google",
    name: "Google Workspace",
    icon: "Globe",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
    scopes: [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/spreadsheets",
    ],
    pkce: true,
    getClientCredentials: () => ({
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "demo-google-client-id",
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "demo-google-client-secret",
    }),
    getAuthorizeParams: () => ({
      access_type: "offline",
      prompt: "consent",
    }),
    parseProfile: (data) => ({
      email: (data.email as string) || undefined,
      name: (data.name as string) || undefined,
      avatar: (data.picture as string) || undefined,
    }),
  },

  github: {
    id: "github",
    name: "GitHub",
    icon: "GitBranch",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    userInfoUrl: "https://api.github.com/user",
    scopes: ["read:user", "user:email", "repo"],
    pkce: false,
    getClientCredentials: () => ({
      clientId: process.env.GITHUB_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "demo-github-client-id",
      clientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || "demo-github-client-secret",
    }),
    parseProfile: (data) => ({
      email: (data.email as string) || (data.login ? `${data.login}@github.com` : undefined),
      name: (data.name as string) || (data.login as string) || undefined,
      avatar: (data.avatar_url as string) || undefined,
    }),
  },

  slack: {
    id: "slack",
    name: "Slack",
    icon: "MessageSquare",
    authorizeUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    userInfoUrl: "https://slack.com/api/users.identity",
    scopes: ["chat:write", "channels:read", "users:read"],
    pkce: false,
    getClientCredentials: () => ({
      clientId: process.env.SLACK_OAUTH_CLIENT_ID || process.env.NEXT_PUBLIC_SLACK_CLIENT_ID || "demo-slack-client-id",
      clientSecret: process.env.SLACK_OAUTH_CLIENT_SECRET || "demo-slack-client-secret",
    }),
    parseProfile: (data) => {
      const user = data.user as Record<string, unknown> | undefined;
      return {
        email: (user?.email as string) || undefined,
        name: (user?.name as string) || undefined,
        avatar: (user?.image_192 as string) || undefined,
      };
    },
  },
};

export function getOAuthProvider(providerId: string): OAuthProviderConfig | null {
  return OAUTH_PROVIDERS[providerId.toLowerCase()] || null;
}

export function generatePkceChallenge(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString("hex");
  const codeChallenge = crypto
    .createHash("sha256")
    .update(codeVerifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  return { codeVerifier, codeChallenge };
}

export function buildAuthorizeUrl(
  providerId: string,
  redirectUri: string,
  state: string,
): { url: string; codeVerifier?: string } | null {
  const provider = getOAuthProvider(providerId);
  if (!provider) return null;

  const { clientId } = provider.getClientCredentials();
  const url = new URL(provider.authorizeUrl);
  url.searchParams.append("client_id", clientId);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("scope", provider.scopes.join(" "));
  url.searchParams.append("state", state);

  if (provider.getAuthorizeParams) {
    const extraParams = provider.getAuthorizeParams();
    for (const [k, v] of Object.entries(extraParams)) {
      url.searchParams.append(k, v);
    }
  }

  let codeVerifier: string | undefined = undefined;
  if (provider.pkce) {
    const pkce = generatePkceChallenge();
    codeVerifier = pkce.codeVerifier;
    url.searchParams.append("code_challenge", pkce.codeChallenge);
    url.searchParams.append("code_challenge_method", "S256");
  }

  return { url: url.toString(), codeVerifier };
}

export async function exchangeCodeForTokens(
  providerId: string,
  code: string,
  redirectUri: string,
  codeVerifier?: string,
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType?: string;
  rawResponse?: Record<string, unknown>;
}> {
  const provider = getOAuthProvider(providerId);
  if (!provider) throw new Error(`OAUTH_PROVIDER_UNKNOWN: Provider '${providerId}' is not registered.`);

  const { clientId, clientSecret } = provider.getClientCredentials();
  const bodyParams = new URLSearchParams();
  bodyParams.append("client_id", clientId);
  bodyParams.append("client_secret", clientSecret);
  bodyParams.append("code", code);
  bodyParams.append("grant_type", "authorization_code");
  bodyParams.append("redirect_uri", redirectUri);
  if (codeVerifier) {
    bodyParams.append("code_verifier", codeVerifier);
  }

  const res = await fetch(provider.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: bodyParams.toString(),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`OAUTH_TOKEN_EXCHANGE_FAILED: ${data.error_description || data.error || res.statusText}`);
  }

  return {
    accessToken: (data.access_token as string) || (data.authed_user?.access_token as string) || "",
    refreshToken: (data.refresh_token as string) || undefined,
    expiresIn: typeof data.expires_in === "number" ? data.expires_in : undefined,
    tokenType: (data.token_type as string) || "Bearer",
    rawResponse: data as Record<string, unknown>,
  };
}

export async function fetchUserProfile(
  providerId: string,
  accessToken: string,
): Promise<{ email?: string; name?: string; avatar?: string }> {
  const provider = getOAuthProvider(providerId);
  if (!provider || !provider.userInfoUrl) {
    return { name: provider?.name || providerId };
  }

  try {
    const res = await fetch(provider.userInfoUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        "User-Agent": "Neuraloop-OAuth-Client",
      },
    });

    if (!res.ok) return { name: provider.name };
    const data = await res.json();
    return provider.parseProfile ? provider.parseProfile(data) : { name: provider.name };
  } catch (err) {
    console.warn(`OAuth profile fetch warning for ${providerId}:`, err);
    return { name: provider.name };
  }
}
