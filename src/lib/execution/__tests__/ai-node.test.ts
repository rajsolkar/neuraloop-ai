import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AIExecutor } from "../executors/ai";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { CredentialService } from "@/lib/security/credential-service";
import type { ExecutionContext } from "../types";
import { AIConfigSchema } from "@/lib/workflow/config-schemas";

function mockContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    executionId: "exec-ai-test",
    workflowId: "w-ai-test",
    workflowVersionId: "ver-ai-test",
    versionNumber: 1,
    input: { topic: "AI Automation", name: "Raj" },
    nodeOutputs: {
      "node-code": { message: "Hello from Code Node", recipient: "sales@example.com" },
    },
    nodeInputs: {},
    nodeStatuses: { "node-code": "success" },
    metadata: {
      nodeTypes: {
        "node-code": "code",
      },
    },
    ...overrides,
  };
}

describe("AI Node & OpenAI Integration Certification Suite", () => {
  const originalFetch = global.fetch;
  const originalOpenAiEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalOpenAiEnv) process.env.OPENAI_API_KEY = originalOpenAiEnv;
    else delete process.env.OPENAI_API_KEY;
  });

  describe("P1: Config Validation & Schema Persistence", () => {
    it("validates and defaults AI node configuration schema correctly", () => {
      const parsed = AIConfigSchema.parse({
        provider: "openai",
        model: "gpt-4o-mini",
        prompt: "Write a summary of {{topic}}",
        temperature: 0.7,
        maxTokens: 500,
        mode: "standard",
        responseType: "json",
      });

      expect(parsed.provider).toBe("openai");
      expect(parsed.model).toBe("gpt-4o-mini");
      expect(parsed.prompt).toBe("Write a summary of {{topic}}");
      expect(parsed.temperature).toBe(0.7);
      expect(parsed.maxTokens).toBe(500);
      expect(parsed.mode).toBe("standard");
      expect(parsed.responseType).toBe("json");
    });
  });

  describe("P2 & P4: Credential & Security Isolation", () => {
    it("fails execution with 'AI credential is required.' if credential and OPENAI_API_KEY are missing", async () => {
      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        model: "gpt-4o-mini",
        prompt: "Hello AI",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("AI credential is required.");
    });

    it("fails execution if selected credential cannot be found or decrypted", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue(null);

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-missing-123",
        model: "gpt-4o-mini",
        prompt: "Hello AI",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("Selected AI credential could not be found or decrypted.");
    });

    it("asserts workflow execution NEVER leaks or uses process.env.OPENAI_API_KEY when Vault credential is set", async () => {
      process.env.OPENAI_API_KEY = "CRITICAL_PLATFORM_KEY_DO_NOT_USE";

      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-user-decrypted-vault-key",
        metadata: null,
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Decrypted Key Output" } }],
          usage: { prompt_tokens: 10, completion_tokens: 15 },
        }),
      } as Response);
      global.fetch = fetchSpy;

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-user-key",
        model: "gpt-4o-mini",
        prompt: "Test BYOK isolation",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      const authHeader = fetchSpy.mock.calls[0][1]?.headers?.Authorization;
      expect(authHeader).toBe("Bearer sk-user-decrypted-vault-key");
      expect(authHeader).not.toContain("CRITICAL_PLATFORM_KEY_DO_NOT_USE");
    });
  });

  describe("P3: Variable Resolution Across Engine Context", () => {
    it("resolves variable expressions from {{name}}, {{steps.code.message}}, and {{topic}}", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-test-key",
        metadata: null,
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: "Greeting generated for Raj" } }],
          usage: { prompt_tokens: 20, completion_tokens: 30 },
        }),
      } as Response);
      global.fetch = fetchSpy;

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-123",
        model: "gpt-4o-mini",
        prompt: "Greeting for {{name}} regarding topic {{topic}}: {{steps.code.message}}",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
      expect(callBody.messages[0].content).toBe(
        "Greeting for Raj regarding topic AI Automation: Hello from Code Node",
      );
    });
  });

  describe("P4: Comprehensive API Error Handling", () => {
    it("fails with NODE_CONFIG_INVALID if prompt is empty", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-test-key",
        metadata: null,
      });

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-123",
        prompt: "   ",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("NODE_CONFIG_INVALID: AI prompt is required.");
    });

    it("handles OpenAI HTTP 401 Unauthorized cleanly", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-invalid-key",
        metadata: null,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({ error: { message: "Incorrect API key provided" } }),
      } as Response);

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-123",
        prompt: "Test Auth Error",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("AI_AUTH_ERROR: Invalid OpenAI API key or unauthorized.");
      // Ensure API key is NOT leaked in error message
      expect(result.error).not.toContain("sk-invalid-key");
    });

    it("handles OpenAI HTTP 429 Rate Limit cleanly", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-valid-key",
        metadata: null,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: async () => ({ error: { message: "Rate limit reached for requests" } }),
      } as Response);

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-123",
        prompt: "Test Rate Limit",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("AI_RATE_LIMIT: OpenAI rate limit exceeded or quota exhausted.");
    });

    it("handles malformed OpenAI responses missing choices array", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-valid-key",
        metadata: null,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ choices: [] }),
      } as Response);

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-123",
        prompt: "Test Malformed Response",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toBe("AI_MALFORMED_RESPONSE: OpenAI API response missing choices array.");
    });

    it("handles 15s timeout protection when API hangs", async () => {
      vi.useFakeTimers();

      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-valid-key",
        metadata: null,
      });

      global.fetch = vi.fn().mockImplementation((_url, options) => {
        return new Promise((_resolve, reject) => {
          options?.signal?.addEventListener("abort", () => {
            const err = new Error("The operation was aborted");
            err.name = "AbortError";
            reject(err);
          });
        });
      });

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "openai",
        credentialId: "cred-123",
        prompt: "Test Timeout",
      };

      const ctx = mockContext();
      const execPromise = AIExecutor.execute(node, {}, ctx);

      await vi.advanceTimersByTimeAsync(15001);

      const result = await execPromise;

      expect(result.status).toBe("failed");
      expect(result.error).toBe("AI_TIMEOUT: AI request timed out after 15s.");

      vi.useRealTimers();
    });
  });

  describe("P2: Provider Normalization (Claude & Gemini)", () => {
    it("executes Claude (Anthropic) provider with normalized parameters", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "sk-ant-user-key",
        metadata: null,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          content: [{ text: "Claude response text" }],
          usage: { input_tokens: 20, output_tokens: 40 },
        }),
      } as Response);

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "claude",
        credentialId: "cred-claude-123",
        model: "claude-3-5-sonnet-20241022",
        prompt: "Summarize topic",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output).toMatchObject({
        text: "Claude response text",
        provider: "claude",
        model: "claude-3-5-sonnet-20241022",
      });
    });

    it("executes Gemini 3.8 Flash provider with exact endpoint target", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "gemini-user-key",
        metadata: null,
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Gemini 3.8 Flash response" }] } }],
          usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 30 },
        }),
      } as Response);
      global.fetch = fetchSpy;

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-123",
        model: "gemini-3.8-flash",
        prompt: "Generate ideas",
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output).toMatchObject({
        text: "Gemini 3.8 Flash response",
        provider: "gemini",
        model: "gemini-3.8-flash",
      });

      const targetUrl = fetchSpy.mock.calls[0][0] as string;
      expect(targetUrl).toBe(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=gemini-user-key",
      );
    });

    it("executes Gemini 3.7 Flash and 3.5 Flash-Lite providers correctly", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "gemini-user-key",
        metadata: null,
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Gemini response text" }] } }],
        }),
      } as Response);
      global.fetch = fetchSpy;

      const node37 = createWorkflowNode("ai", { x: 0, y: 0 });
      node37.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-123",
        model: "gemini-3.7-flash",
        prompt: "Summarize text",
      };

      const ctx = mockContext();
      const res37 = await AIExecutor.execute(node37, {}, ctx);
      expect(res37.status).toBe("success");
      expect(fetchSpy.mock.calls[0][0]).toContain("models/gemini-3.7-flash:generateContent");

      const nodeLite = createWorkflowNode("ai", { x: 0, y: 0 });
      nodeLite.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-123",
        model: "gemini-3.5-flash-lite",
        prompt: "Quick summary",
      };

      const resLite = await AIExecutor.execute(nodeLite, {}, ctx);
      expect(resLite.status).toBe("success");
      expect(fetchSpy.mock.calls[1][0]).toContain("models/gemini-3.5-flash-lite:generateContent");
    });

    it("preserves legacy gemini-2.5-flash model without silent remapping", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "gemini-user-key",
        metadata: null,
      });

      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Legacy Gemini response text" }] } }],
        }),
      } as Response);
      global.fetch = fetchSpy;

      const nodeLegacy = createWorkflowNode("ai", { x: 0, y: 0 });
      nodeLegacy.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-123",
        model: "gemini-2.5-flash",
        prompt: "Legacy test",
      };

      const ctx = mockContext();
      const resLegacy = await AIExecutor.execute(nodeLegacy, {}, ctx);
      expect(resLegacy.status).toBe("success");
      expect(resLegacy.output?.model).toBe("gemini-2.5-flash");
      expect(fetchSpy.mock.calls[0][0]).toContain("models/gemini-2.5-flash:generateContent");
    });
  });
});
