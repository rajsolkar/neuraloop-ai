import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { AIExecutor } from "../executors/ai";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { CredentialService } from "@/lib/security/credential-service";
import type { ExecutionContext } from "../types";

function mockContext(): ExecutionContext {
  return {
    executionId: "exec-ai-test",
    workflowId: "w-ai-test",
    workflowVersionId: "ver-ai-test",
    versionNumber: 1,
    input: { topic: "AI Automation" },
    nodeOutputs: {},
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
  };
}

describe("Phase 15.5: Unified AI Node & BYOK Architecture", () => {
  const originalFetch = global.fetch;
  const originalOpenAiEnv = process.env.OPENAI_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = "env-platform-owner-secret-key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env.OPENAI_API_KEY = originalOpenAiEnv;
  });

  it("fails execution with 'AI credential is required.' if credentialId is missing", async () => {
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

  it("executes OpenAI provider and returns normalized output format", async () => {
    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "sk-user-openai-key",
      metadata: null,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "OpenAI response text" } }],
        usage: { prompt_tokens: 15, completion_tokens: 25 },
      }),
    } as Response);

    const node = createWorkflowNode("ai", { x: 0, y: 0 });
    node.data.config = {
      provider: "openai",
      credentialId: "cred-openai-123",
      model: "gpt-4o-mini",
      prompt: "Explain {{input.topic}}",
    };

    const ctx = mockContext();
    const result = await AIExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      text: "OpenAI response text",
      provider: "openai",
      model: "gpt-4o-mini",
      usage: {
        inputTokens: 15,
        outputTokens: 25,
        estimatedCost: 0.000017,
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer sk-user-openai-key",
        }),
      }),
    );
  });

  it("executes Claude (Anthropic) provider and returns normalized output format", async () => {
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
      usage: {
        inputTokens: 20,
        outputTokens: 40,
        estimatedCost: 0.00066,
      },
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.anthropic.com/v1/messages",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-api-key": "sk-ant-user-key",
          "anthropic-version": "2023-06-01",
        }),
      }),
    );
  });

  it("executes Gemini provider and returns normalized output format", async () => {
    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "gemini-user-key",
      metadata: null,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Gemini response text" }] } }],
        usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 30 },
      }),
    } as Response);

    const node = createWorkflowNode("ai", { x: 0, y: 0 });
    node.data.config = {
      provider: "gemini",
      credentialId: "cred-gemini-123",
      model: "gemini-2.5-flash",
      prompt: "Generate ideas",
    };

    const ctx = mockContext();
    const result = await AIExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(result.output).toMatchObject({
      text: "Gemini response text",
      provider: "gemini",
      model: "gemini-2.5-flash",
      usage: {
        inputTokens: 10,
        outputTokens: 30,
        estimatedCost: 0.00001,
      },
    });
  });

  it("asserts workflow execution NEVER uses process.env.OPENAI_API_KEY", async () => {
    process.env.OPENAI_API_KEY = "CRITICAL_PLATFORM_KEY_DO_NOT_USE";

    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "user-decrypted-secret-key",
      metadata: null,
    });

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Success" } }],
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
    await AIExecutor.execute(node, {}, ctx);

    const authHeader = fetchSpy.mock.calls[0][1]?.headers?.Authorization;
    expect(authHeader).toBe("Bearer user-decrypted-secret-key");
    expect(authHeader).not.toContain("CRITICAL_PLATFORM_KEY_DO_NOT_USE");
  });
});
