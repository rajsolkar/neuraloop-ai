import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIExecutor } from "../executors/ai";
import { IfExecutor } from "../executors/if";
import { TelegramExecutor } from "../executors/telegram";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { CredentialService } from "@/lib/security/credential-service";
import type { ExecutionContext } from "../types";
import { buildExecutionExpressionContext, resolvePropertyPath, resolveExpression } from "../expression";

function mockContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    executionId: "exec-gemini-test",
    workflowId: "wf-gemini-test",
    workflowVersionId: "ver-gemini-test",
    versionNumber: 1,
    input: {
      incidentReport: "Payment gateway timeout rate spike to 85%",
      chatId: "-1001234567890",
    },
    nodeOutputs: {},
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {
      nodeTypes: {
        "node-ai-1": "ai",
        "node-if-1": "if",
        "node-telegram-1": "telegram",
      },
    },
    ...overrides,
  };
}

describe("Gemini AI Structured Output & Pipeline Regression Suite", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("1. Traced Max-Tokens & Request Configuration for Gemini", () => {
    it("honors configured maxTokens and passes responseMimeType & thinkingConfig to Gemini", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "test-gemini-key",
        metadata: null,
      });

      let capturedUrl = "";
      let capturedBody: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedUrl = url;
        if (init?.body) capturedBody = JSON.parse(init.body as string);
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        isUrgent: true,
                        summary: "Payment gateway degraded",
                        recommendedAction: "Failover gateway",
                      }),
                    },
                  ],
                },
                finishReason: "STOP",
              },
            ],
            usageMetadata: {
              promptTokenCount: 45,
              candidatesTokenCount: 28,
            },
          }),
        } as Response;
      });

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.id = "node-ai-1";
      node.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-1",
        model: "gemini-3.6-flash",
        prompt: "Classify incident: {{input.incidentReport}}",
        responseType: "json",
        maxTokens: 500,
        temperature: 0.2,
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, ctx.input, ctx);

      expect(result.status).toBe("success");
      expect(capturedUrl).toContain("models/gemini-3.6-flash:generateContent?key=test-gemini-key");
      expect(capturedBody).not.toBeNull();
      // Confirm maxOutputTokens is honored from config (500)
      expect(capturedBody.generationConfig.maxOutputTokens).toBe(500);
      // Confirm structured JSON mode is enforced
      expect(capturedBody.generationConfig.responseMimeType).toBe("application/json");
      // Confirm thinking budget is set to 0 to prevent thinking from exhausting the token budget
      expect(capturedBody.generationConfig.thinkingConfig.thinkingBudget).toBe(0);
    });
  });

  describe("2. Truncated Gemini JSON Handling & Provider Metadata", () => {
    it("fails with AI_JSON_TRUNCATED and preserves finishReason and rawText when Gemini hits MAX_TOKENS", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "test-gemini-key",
        metadata: null,
      });

      // Simulate Gemini truncating output mid-stream due to token exhaustion
      global.fetch = vi.fn().mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [{ text: '{"isUrgent":false,"summary":"' }],
                },
                finishReason: "MAX_TOKENS",
              },
            ],
            usageMetadata: {
              promptTokenCount: 120,
              candidatesTokenCount: 250,
            },
          }),
        } as Response;
      });

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.id = "node-ai-1";
      node.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-1",
        model: "gemini-3.6-flash",
        prompt: "Classify incident: {{input.incidentReport}}",
        responseType: "json",
        maxTokens: 250,
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, ctx.input, ctx);

      // Must NOT treat incomplete JSON as success
      expect(result.status).toBe("failed");
      expect(result.error).toContain("AI_JSON_TRUNCATED");
      expect(result.error).toContain("MAX_TOKENS");

      // Provider metadata must be preserved
      expect(result.output?.finishReason).toBe("MAX_TOKENS");
      expect(result.output?.isTruncated).toBe(true);
      expect(result.output?.rawText).toBe('{"isUrgent":false,"summary":"');
      expect(result.output?.json).toBeNull();
      expect(result.metrics?.isTruncated).toBe(true);
      expect(result.metrics?.finishReason).toBe("MAX_TOKENS");
    });
  });

  describe("3. Safe Automatic Retry on Truncated First Attempt", () => {
    it("safely retries with elevated token budget when initial attempt is truncated by MAX_TOKENS", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "test-gemini-key",
        metadata: null,
      });

      let callCount = 0;
      let secondCallTokens = 0;

      global.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        callCount++;
        const body = JSON.parse(init?.body as string);

        if (callCount === 1) {
          // First attempt: truncated by MAX_TOKENS
          return {
            ok: true,
            status: 200,
            json: async () => ({
              candidates: [
                {
                  content: {
                    parts: [{ text: '{"isUrgent":true,"summary":"' }],
                  },
                  finishReason: "MAX_TOKENS",
                },
              ],
              usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 100 },
            }),
          } as Response;
        }

        // Second attempt: retry with elevated token limit succeeds
        secondCallTokens = body.generationConfig.maxOutputTokens;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        isUrgent: true,
                        summary: "Database connection pool saturated",
                        recommendedAction: "Increase pool size to 50",
                      }),
                    },
                  ],
                },
                finishReason: "STOP",
              },
            ],
            usageMetadata: { promptTokenCount: 80, candidatesTokenCount: 160 },
          }),
        } as Response;
      });

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.id = "node-ai-1";
      node.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-1",
        model: "gemini-3.6-flash",
        prompt: "Classify incident: {{input.incidentReport}}",
        responseType: "json",
        maxTokens: 100,
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, ctx.input, ctx);

      // Verify retry occurred
      expect(callCount).toBe(2);
      expect(secondCallTokens).toBeGreaterThanOrEqual(2048);
      expect(result.status).toBe("success");
      expect(result.output?.isUrgent).toBe(true);
      expect(result.output?.summary).toBe("Database connection pool saturated");
      expect(result.output?.recommendedAction).toBe("Increase pool size to 50");
    });
  });

  describe("4. Exposing Structured JSON Fields to Downstream Resolution", () => {
    it("consistently exposes isUrgent, summary, and recommendedAction for downstream expressions", async () => {
      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "test-gemini-key",
        metadata: null,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      isUrgent: true,
                      summary: "API Gateway 502 error cascade",
                      recommendedAction: "Restart gateway cluster",
                    }),
                  },
                ],
              },
              finishReason: "STOP",
            },
          ],
          usageMetadata: { promptTokenCount: 50, candidatesTokenCount: 40 },
        }),
      } as Response);

      const node = createWorkflowNode("ai", { x: 0, y: 0 });
      node.id = "node-ai-1";
      node.data.config = {
        provider: "gemini",
        credentialId: "cred-gemini-1",
        model: "gemini-3.6-flash",
        prompt: "Classify incident: {{input.incidentReport}}",
        responseType: "json",
        maxTokens: 1000,
      };

      const ctx = mockContext();
      const result = await AIExecutor.execute(node, ctx.input, ctx);

      expect(result.status).toBe("success");

      // Build execution expression context with the AI node output
      const updatedCtx: ExecutionContext = {
        ...ctx,
        nodeOutputs: {
          "node-ai-1": result.output as Record<string, unknown>,
        },
        nodeStatuses: {
          "node-ai-1": "success",
        },
      };

      const exprContext = buildExecutionExpressionContext(updatedCtx);

      // 1. Path with .json.isUrgent
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.isUrgent")).toBe(true);
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.summary")).toBe("API Gateway 502 error cascade");
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.recommendedAction")).toBe("Restart gateway cluster");

      // 2. Direct path without .json
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.isUrgent")).toBe(true);
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.summary")).toBe("API Gateway 502 error cascade");
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.recommendedAction")).toBe("Restart gateway cluster");

      // 3. Template interpolation
      const template = "Urgent: {{steps.node-ai-1.json.summary}} | Action: {{steps.node-ai-1.json.recommendedAction}}";
      expect(resolveExpression(template, exprContext)).toBe(
        "Urgent: API Gateway 502 error cascade | Action: Restart gateway cluster",
      );
    });
  });

  describe("5. Downstream IF Evaluation with Truncated vs Valid JSON", () => {
    it("evaluates IF node to false with actualValue: 'N/A' when upstream AI node output is missing or truncated", async () => {
      const ifNode = createWorkflowNode("if", { x: 0, y: 0 });
      ifNode.id = "node-if-1";
      ifNode.data.config = {
        condition: {
          field: "steps.node-ai-1.json.isUrgent",
          operator: "is_true",
          value: "true",
          dataType: "boolean",
          mode: "basic",
        },
      };

      // Context where node-ai-1 has failed or has truncated output (no json.isUrgent)
      const failedAiCtx = mockContext({
        nodeOutputs: {
          "node-ai-1": {
            text: '{"isUrgent":false,"summary":"',
            rawText: '{"isUrgent":false,"summary":"',
            json: null,
            isTruncated: true,
            finishReason: "MAX_TOKENS",
          },
        },
        nodeStatuses: {
          "node-ai-1": "failed",
        },
      });

      const ifResult = await IfExecutor.execute(ifNode, failedAiCtx.input, failedAiCtx);

      expect(ifResult.status).toBe("success");
      expect(ifResult.output?.result).toBe(false);
      expect(ifResult.output?.actualValue).toBe("N/A");
      expect(ifResult.output?.selectedBranch).toBe("false");
      expect(ifResult.selectedHandle).toBe("false");
    });

    it("evaluates IF node to true with actualValue: true when upstream AI output is valid urgent JSON", async () => {
      const ifNode = createWorkflowNode("if", { x: 0, y: 0 });
      ifNode.id = "node-if-1";
      ifNode.data.config = {
        condition: {
          field: "steps.node-ai-1.json.isUrgent",
          operator: "is_true",
          value: "true",
          dataType: "boolean",
          mode: "basic",
        },
      };

      const validAiCtx = mockContext({
        nodeOutputs: {
          "node-ai-1": {
            isUrgent: true,
            summary: "Critical security alert",
            recommendedAction: "Isolate host",
            json: {
              isUrgent: true,
              summary: "Critical security alert",
              recommendedAction: "Isolate host",
            },
          },
        },
        nodeStatuses: {
          "node-ai-1": "success",
        },
      });

      const ifResult = await IfExecutor.execute(ifNode, validAiCtx.input, validAiCtx);

      expect(ifResult.status).toBe("success");
      expect(ifResult.output?.result).toBe(true);
      expect(ifResult.output?.actualValue).toBe(true);
      expect(ifResult.output?.selectedBranch).toBe("true");
      expect(ifResult.selectedHandle).toBe("true");
    });
  });

  describe("6. Downstream Telegram Missing-Variable Guard", () => {
    it("aborts Telegram dispatch when upstream AI output is truncated/missing, preventing [Missing: ...] sends", async () => {
      let telegramApiCalled = false;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("telegram.org")) {
          telegramApiCalled = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, result: { message_id: 1122 } }),
          } as Response;
        }
        return { ok: false, status: 500 } as Response;
      });

      process.env.TELEGRAM_BOT_TOKEN = "123456:mock-telegram-token";

      const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
      telegramNode.id = "node-telegram-1";
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "🚨 *URGENT INCIDENT DETECTED*\n\n*Summary:* {{steps.node-ai-1.json.summary}}\n*Action:* {{steps.node-ai-1.json.recommendedAction}}",
      };

      // Context where node-ai-1 is truncated / failed and has no summary or recommendedAction
      const failedContext = mockContext({
        nodeOutputs: {
          "node-ai-1": {
            text: '{"isUrgent":false,"summary":"',
            json: null,
            isTruncated: true,
          },
        },
        nodeStatuses: {
          "node-ai-1": "failed",
        },
      });

      const result = await TelegramExecutor.execute(telegramNode, failedContext.input, failedContext);

      // Must abort and not call Telegram API
      expect(result.status).toBe("failed");
      expect(result.error).toContain("TELEGRAM_MISSING_PAYLOAD");
      expect(telegramApiCalled).toBe(false);
    });

    it("aborts Telegram dispatch when valid JSON is missing required fields referenced by the template", async () => {
      let telegramApiCalled = false;

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("telegram.org")) {
          telegramApiCalled = true;
          return {
            ok: true,
            status: 200,
            json: async () => ({ ok: true, result: { message_id: 1123 } }),
          } as Response;
        }
        return { ok: false, status: 500 } as Response;
      });

      process.env.TELEGRAM_BOT_TOKEN = "123456:mock-telegram-token";

      const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
      telegramNode.id = "node-telegram-1";
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "🚨 *URGENT INCIDENT DETECTED*\n\n*Summary:* {{steps.node-ai-1.json.summary}}\n*Action:* {{steps.node-ai-1.json.recommendedAction}}",
      };

      // Context where node-ai-1 has isUrgent, but omitted recommendedAction
      const partialJsonContext = mockContext({
        nodeOutputs: {
          "node-ai-1": {
            isUrgent: true,
            summary: "Minor latency bump",
            json: {
              isUrgent: true,
              summary: "Minor latency bump",
              // recommendedAction is missing
            },
          },
        },
        nodeStatuses: {
          "node-ai-1": "success",
        },
      });

      const result = await TelegramExecutor.execute(telegramNode, partialJsonContext.input, partialJsonContext);

      // Must abort because recommendedAction is missing
      expect(result.status).toBe("failed");
      expect(result.error).toContain("TELEGRAM_MISSING_PAYLOAD");
      expect(result.error).toContain("steps.node-ai-1.json.recommendedAction");
      expect(telegramApiCalled).toBe(false);
    });
  });
});
