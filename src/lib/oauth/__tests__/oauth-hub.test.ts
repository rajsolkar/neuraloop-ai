import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getOAuthProvider, buildAuthorizeUrl } from "../provider-registry";
import { getExecutor } from "@/lib/execution/executors/registry";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "@/lib/execution/types";

function mockContext(): ExecutionContext {
  return {
    executionId: "exec-oauth-123",
    workflowId: "w-oauth-123",
    workflowVersionId: "ver-oauth-123",
    versionNumber: 1,
    input: { event: "push" },
    nodeOutputs: {},
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
  };
}

describe("Phase 18: OAuth 2.0 Connection Hub Test Suite", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Provider Registry", () => {
    it("returns OAuth provider config for google, github, and slack", () => {
      const google = getOAuthProvider("google");
      const github = getOAuthProvider("github");
      const slack = getOAuthProvider("slack");

      expect(google).not.toBeNull();
      expect(google?.name).toBe("Google Workspace");
      expect(google?.pkce).toBe(true);

      expect(github).not.toBeNull();
      expect(github?.name).toBe("GitHub");

      expect(slack).not.toBeNull();
      expect(slack?.name).toBe("Slack");
    });

    it("builds valid authorization URL with state and PKCE parameters", () => {
      const result = buildAuthorizeUrl("google", "https://app.neuraloop.ai/api/oauth/callback", "state_secret_123");
      expect(result).not.toBeNull();
      expect(result?.url).toContain("accounts.google.com");
      expect(result?.url).toContain("state=state_secret_123");
      expect(result?.url).toContain("code_challenge=");
      expect(result?.codeVerifier).toBeDefined();
    });
  });

  describe("HTTP Request Pro OAuth Integration", () => {
    it("executes HTTP request using oauth_connection authType with bearer token", async () => {
      const executor = getExecutor("http-request")!;
      const node = createWorkflowNode("http-request", { x: 0, y: 0 });
      node.data.config = {
        method: "GET",
        url: "https://api.github.com/user",
        authType: "oauth_connection",
        connectionProvider: "github",
        bearerToken: "oauth_access_token_xyz",
      };

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-type": "application/json" }),
        text: () => Promise.resolve(JSON.stringify({ login: "rajsolkar", id: 12345 })),
      } as Response);

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.status).toBe(200);
      expect(result.output?.data).toEqual({ login: "rajsolkar", id: 12345 });
    });
  });
});
