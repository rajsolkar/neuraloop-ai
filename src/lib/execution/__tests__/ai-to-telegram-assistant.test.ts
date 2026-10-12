import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getExecutor } from "../executors/registry";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "../types";
import type { WorkflowNode } from "@/types/workflow";
import { resolveExpression, buildExecutionExpressionContext } from "../expression";
import { TemplateCloner } from "@/lib/templates/template-cloner";
import { STARTER_TEMPLATES } from "@/lib/templates/starter-templates";
import { CredentialService } from "@/lib/security/credential-service";

describe("Starter 03: AI-to-Telegram Assistant Regression Suite", () => {
  const originalFetch = globalThis.fetch;
  const originalOpenAiKey = process.env.OPENAI_API_KEY;
  const originalTelegramToken = process.env.TELEGRAM_BOT_TOKEN;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.OPENAI_API_KEY = "sk-mock-openai-api-key";
    process.env.TELEGRAM_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrSTUvwxYZ";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalOpenAiKey !== undefined) {
      process.env.OPENAI_API_KEY = originalOpenAiKey;
    } else {
      delete process.env.OPENAI_API_KEY;
    }
    if (originalTelegramToken !== undefined) {
      process.env.TELEGRAM_BOT_TOKEN = originalTelegramToken;
    } else {
      delete process.env.TELEGRAM_BOT_TOKEN;
    }
  });

  function createAssistantContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
    return {
      executionId: "exec-assistant-1",
      workflowId: "wf-assistant-1",
      workflowVersionId: "ver-assistant-1",
      versionNumber: 1,
      input: {
        customerQuery: "My payment was deducted twice for order 12345",
        chatId: "-1001234567890",
      },
      nodeOutputs: {
        "node-trigger-1": {
          customerQuery: "My payment was deducted twice for order 12345",
          chatId: "-1001234567890",
          source: "manual",
        },
      },
      nodeInputs: {},
      nodeStatuses: {
        "node-trigger-1": "success",
      },
      metadata: {
        nodeTypes: {
          "node-trigger-1": "manual-trigger",
          "node-ai-1": "ai",
          "node-telegram-1": "telegram",
        },
      },
      ...overrides,
    };
  }

  describe("1. Customer Query Propagation & Relevant AI Response", () => {
    it("supplies customer query to AI prompt and produces a relevant response for order 12345", async () => {
      let capturedAiRequestBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("openai.com")) {
          if (init?.body) {
            capturedAiRequestBody = JSON.parse(init.body as string);
          }
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content:
                      "Hello! I see that order 12345 was charged twice. Our billing team will refund the duplicate charge of $49.99 within 3-5 business days.",
                  },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 35, completion_tokens: 32 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const aiExecutor = getExecutor("ai")!;
      const aiNode = createWorkflowNode("ai", { x: 440, y: 160 });
      aiNode.id = "node-ai-1";
      aiNode.data.config = {
        provider: "openai",
        model: "gpt-4o-mini",
        prompt: "Provide a helpful and polite response to this customer query: {{input.customerQuery}}",
        maxTokens: 300,
      };

      const ctx = createAssistantContext();
      const aiResult = await aiExecutor.execute(aiNode, ctx.input, ctx);

      expect(aiResult.status).toBe("success");
      expect(aiResult.output?.text).toContain("order 12345");
      expect(aiResult.output?.text).toContain("duplicate charge");

      // Verify the AI prompt received the actual customer query
      expect(capturedAiRequestBody).not.toBeNull();
      const messages = ((capturedAiRequestBody as unknown) as { messages: Array<{ role: string; content: string }> }).messages;
      const userMessage = messages.find((m) => m.role === "user");
      expect(userMessage?.content).toBe(
        "Provide a helpful and polite response to this customer query: My payment was deducted twice for order 12345",
      );
    });

    it("forwards AI response to Telegram with complete message content", async () => {
      let capturedTelegramBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("telegram.org")) {
          if (init?.body) {
            capturedTelegramBody = JSON.parse(init.body as string);
          }
          return new Response(
            JSON.stringify({
              ok: true,
              result: { message_id: 8820, chat: { id: -1001234567890 } },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const ctx = createAssistantContext({
        nodeOutputs: {
          "node-trigger-1": {
            customerQuery: "My payment was deducted twice for order 12345",
            chatId: "-1001234567890",
          },
          "node-ai-1": {
            text: "Hello! We have refunded the duplicate transaction for order 12345.",
          },
        },
      });

      const telegramExecutor = getExecutor("telegram")!;
      const telegramNode = createWorkflowNode("telegram", { x: 780, y: 160 });
      telegramNode.id = "node-telegram-1";
      telegramNode.data.config = {
        chatId: "{{input.chatId}}",
        text: "*Customer Support Response:*\n\n{{steps.node-ai-1.text}}",
      };

      const result = await telegramExecutor.execute(telegramNode, ctx.input, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.delivered).toBe(true);
      expect(result.output?.messageId).toBe(8820);

      expect(capturedTelegramBody).not.toBeNull();
      expect(capturedTelegramBody?.chat_id).toBe("-1001234567890");
      expect(capturedTelegramBody?.text).toBe(
        "*Customer Support Response:*\n\nHello! We have refunded the duplicate transaction for order 12345.",
      );
    });
  });

  describe("2. Explicit Missing Customer Input Handling", () => {
    it("fails with AI_REQUIRED_INPUT_MISSING when customerQuery is missing from input", async () => {
      const aiExecutor = getExecutor("ai")!;
      const aiNode = createWorkflowNode("ai", { x: 440, y: 160 });
      aiNode.id = "node-ai-1";
      aiNode.data.config = {
        provider: "openai",
        model: "gpt-4o-mini",
        prompt: "Provide a helpful and polite response to this customer query: {{input.customerQuery}}",
      };

      // Empty input payload: no customerQuery provided
      const ctx = createAssistantContext({
        input: {},
        nodeOutputs: {
          "node-trigger-1": { source: "manual" },
        },
      });

      const aiResult = await aiExecutor.execute(aiNode, ctx.input, ctx);

      // Must fail explicitly rather than silently sending empty query to LLM
      expect(aiResult.status).toBe("failed");
      expect(aiResult.error).toContain("AI_REQUIRED_INPUT_MISSING");
      expect(aiResult.error).toContain("customerQuery");
    });

    it("prevents Telegram dispatch when upstream AI text is missing", async () => {
      const telegramExecutor = getExecutor("telegram")!;
      const telegramNode = createWorkflowNode("telegram", { x: 780, y: 160 });
      telegramNode.id = "node-telegram-1";
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "*Customer Support Response:*\n\n{{steps.node-ai-1.text}}",
      };

      // Upstream node-ai-1 produced no text output
      const ctx = createAssistantContext({
        nodeOutputs: {
          "node-trigger-1": { source: "manual" },
        },
      });

      const result = await telegramExecutor.execute(telegramNode, ctx.input, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("TELEGRAM_MISSING_PAYLOAD");
    });
  });

  describe("3. Observable Missing Expression Placeholders", () => {
    it("renders observable [Missing: ...] placeholder instead of silent blank field", () => {
      const contextData = {
        input: {
          customerQuery: "How do I upgrade my plan?",
        },
      };

      // Template references missing customerName and orderId
      const template = "Customer: {{input.customerName}}, Order: {{input.orderId}}, Query: {{input.customerQuery}}";
      const resolved = resolveExpression(template, contextData, { observableMissing: true });

      expect(resolved).toBe(
        "Customer: [Missing: input.customerName], Order: [Missing: input.orderId], Query: How do I upgrade my plan?",
      );
    });

    it("surfaces observable missing fields in Telegram message text", async () => {
      let capturedTelegramBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("telegram.org")) {
          if (init?.body) {
            capturedTelegramBody = JSON.parse(init.body as string);
          }
          return new Response(
            JSON.stringify({ ok: true, result: { message_id: 101 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const ctx = createAssistantContext({
        input: {
          customerQuery: "Refund inquiry",
          chatId: "-1001234567890",
          // customerName omitted
        },
        nodeOutputs: {
          "node-ai-1": {
            text: "We have reviewed your request.",
          },
        },
      });

      const telegramExecutor = getExecutor("telegram")!;
      const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "*Support Ticket*\nCustomer: {{input.customerName}}\nResponse: {{steps.node-ai-1.text}}",
      };

      const result = await telegramExecutor.execute(telegramNode, ctx.input, ctx);
      expect(result.status).toBe("success");

      const sentText = (capturedTelegramBody as { text: string }).text;
      expect(sentText).toContain("Customer: [Missing: input.customerName]");
      expect(sentText).toContain("Response: We have reviewed your request.");
    });
  });

  describe("4. End-to-End Cloned Starter 03 Execution", () => {
    it("runs cloned Starter 03 workflow end-to-end with TemplateCloner remapped node IDs", async () => {
      let capturedTelegramBody: any = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("openai.com")) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: {
                    content: "To connect a custom domain, visit Settings > Domains and add your CNAME record.",
                  },
                  finish_reason: "stop",
                },
              ],
              usage: { prompt_tokens: 28, completion_tokens: 18 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("telegram.org")) {
          if (init?.body) {
            capturedTelegramBody = JSON.parse(init.body as string);
          }
          return new Response(
            JSON.stringify({ ok: true, result: { message_id: 4092 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      // 1. Clone Starter 03
      const starter03 = STARTER_TEMPLATES[2];
      expect(starter03.id).toBe("starter-03-ai-telegram-assistant");
      const clonedWorkflow = TemplateCloner.cloneGraph(starter03.definition, "My Cloned Assistant");

      const triggerNode = clonedWorkflow.nodes.find((n) => n.data.definitionId === "manual-trigger")!;
      const aiNode = clonedWorkflow.nodes.find((n) => n.data.definitionId === "ai")!;
      const telegramNode = clonedWorkflow.nodes.find((n) => n.data.definitionId === "telegram")!;

      expect(triggerNode.id).toMatch(/^n-cloned-/);
      expect(aiNode.id).toMatch(/^n-cloned-/);
      expect(telegramNode.id).toMatch(/^n-cloned-/);

      // Verify remapped expression in telegram node points to remapped AI node ID
      const telegramText = String((telegramNode.data.config as Record<string, unknown>).text);
      expect(telegramText).toContain(aiNode.id);
      expect(telegramText).not.toContain("node-ai-1");

      // 2. Execute Trigger Node
      const inputPayload = {
        customerQuery: "How do I connect a custom domain to my account?",
        chatId: "-1001234567890",
      };

      const triggerExecutor = getExecutor("manual-trigger")!;
      const triggerResult = await triggerExecutor.execute(triggerNode, inputPayload, {} as ExecutionContext);
      expect(triggerResult.status).toBe("success");

      // 3. Execute AI Node
      const executionCtx: ExecutionContext = {
        executionId: "exec-cloned-assistant",
        workflowId: "wf-cloned-assistant",
        workflowVersionId: "ver-cloned-assistant",
        versionNumber: 1,
        input: inputPayload,
        nodeOutputs: {
          [triggerNode.id]: triggerResult.output as Record<string, unknown>,
        },
        nodeInputs: {},
        nodeStatuses: {
          [triggerNode.id]: "success",
        },
        metadata: {
          nodeTypes: {
            [triggerNode.id]: "manual-trigger",
            [aiNode.id]: "ai",
            [telegramNode.id]: "telegram",
          },
        },
      };

      const aiExecutor = getExecutor("ai")!;
      const aiResult = await aiExecutor.execute(aiNode, inputPayload, executionCtx);
      expect(aiResult.status).toBe("success");
      expect(aiResult.output?.text).toContain("Settings > Domains");

      // 4. Update Context & Execute Telegram Node
      executionCtx.nodeOutputs[aiNode.id] = aiResult.output as Record<string, unknown>;
      executionCtx.nodeStatuses[aiNode.id] = "success";

      const telegramExecutor = getExecutor("telegram")!;
      const telegramResult = await telegramExecutor.execute(telegramNode, inputPayload, executionCtx);
      expect(telegramResult.status).toBe("success");

      expect(capturedTelegramBody).not.toBeNull();
      expect(capturedTelegramBody?.chat_id).toBe("-1001234567890");
      expect(capturedTelegramBody?.text).toContain("Settings > Domains");
    });
  });

  describe("5. Duplicate Dispatch & Repeated Execution Isolation", () => {
    it("prevents duplicate Telegram dispatch if node has already been delivered in the current context", async () => {
      let callCount = 0;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("telegram.org")) {
          callCount++;
          return new Response(
            JSON.stringify({ ok: true, result: { message_id: 5501 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const telegramExecutor = getExecutor("telegram")!;
      const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
      telegramNode.id = "node-telegram-1";
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "Important notification",
      };

      const ctx = createAssistantContext();

      // First run: dispatches to Telegram
      const firstResult = await telegramExecutor.execute(telegramNode, ctx.input, ctx);
      expect(firstResult.status).toBe("success");
      expect(callCount).toBe(1);

      // Context now records this node as success and delivered
      ctx.nodeStatuses["node-telegram-1"] = "success";
      ctx.nodeOutputs["node-telegram-1"] = firstResult.output as Record<string, unknown>;

      // Second run in same context: should skip duplicate dispatch
      const secondResult = await telegramExecutor.execute(telegramNode, ctx.input, ctx);
      expect(secondResult.status).toBe("success");
      expect(secondResult.output?.messageId).toBe(5501);
      expect(callCount).toBe(1); // Call count did not increase
    });

    it("repeated executions with different customer queries produce distinct isolated responses", async () => {
      const generatedResponses: string[] = [];

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("openai.com")) {
          const body = JSON.parse(init?.body as string);
          const userPrompt = body.messages.find((m: { role: string }) => m.role === "user").content;
          const query = userPrompt.split("query: ")[1];
          const reply = `Response for: ${query}`;
          return new Response(
            JSON.stringify({
              choices: [{ message: { content: reply }, finish_reason: "stop" }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("telegram.org")) {
          const body = JSON.parse(init?.body as string);
          generatedResponses.push(body.text);
          return new Response(
            JSON.stringify({ ok: true, result: { message_id: 1 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const queries = [
        "Payment issue for order 101",
        "How do I reset my password?",
        "Shipping delay on order 202",
      ];

      const aiExecutor = getExecutor("ai")!;
      const telegramExecutor = getExecutor("telegram")!;

      for (let i = 0; i < queries.length; i++) {
        const query = queries[i];
        const ctx = createAssistantContext({
          executionId: `exec-${i}`,
          input: { customerQuery: query, chatId: "123456" },
        });

        const aiNode = createWorkflowNode("ai", { x: 0, y: 0 });
        aiNode.id = "node-ai-1";
        aiNode.data.config = {
          provider: "openai",
          prompt: `Provide a helpful response to this customer query: {{input.customerQuery}}`,
        };

        const aiRes = await aiExecutor.execute(aiNode, ctx.input, ctx);
        expect(aiRes.status).toBe("success");

        ctx.nodeOutputs["node-ai-1"] = aiRes.output as Record<string, unknown>;
        ctx.nodeStatuses["node-ai-1"] = "success";

        const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
        telegramNode.id = "node-telegram-1";
        telegramNode.data.config = {
          chatId: "123456",
          text: "{{steps.node-ai-1.text}}",
        };

        const tgRes = await telegramExecutor.execute(telegramNode, ctx.input, ctx);
        expect(tgRes.status).toBe("success");
      }

      // Verify all 3 executions produced completely distinct messages
      expect(generatedResponses).toHaveLength(3);
      expect(generatedResponses[0]).toBe("Response for: Payment issue for order 101");
      expect(generatedResponses[1]).toBe("Response for: How do I reset my password?");
      expect(generatedResponses[2]).toBe("Response for: Shipping delay on order 202");
    });
  });

  describe("6. Long Responses, Truncation & Markdown Entity Fallback", () => {
    it("flags isTruncated: true when model hits maxTokens length limit", async () => {
      globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("openai.com")) {
          return new Response(
            JSON.stringify({
              choices: [
                {
                  message: { content: "Here is the response that was abruptly cut off mid-sentence because..." },
                  finish_reason: "length",
                },
              ],
              usage: { prompt_tokens: 50, completion_tokens: 300 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const aiExecutor = getExecutor("ai")!;
      const aiNode = createWorkflowNode("ai", { x: 0, y: 0 });
      aiNode.data.config = {
        provider: "openai",
        prompt: "Provide a response to query: {{input.customerQuery}}",
        maxTokens: 300,
      };

      const ctx = createAssistantContext();
      const result = await aiExecutor.execute(aiNode, ctx.input, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.finishReason).toBe("length");
      expect(result.output?.isTruncated).toBe(true);
      expect(result.metrics?.isTruncated).toBe(true);
    });

    it("safely truncates Telegram messages exceeding 4096 characters", async () => {
      let capturedBody: any = null;
      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("telegram.org")) {
          if (init?.body) capturedBody = JSON.parse(init.body as string);
          return new Response(
            JSON.stringify({ ok: true, result: { message_id: 9901 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const longAiText = "A".repeat(5000);
      const ctx = createAssistantContext({
        nodeOutputs: {
          "node-ai-1": { text: longAiText },
        },
      });

      const telegramExecutor = getExecutor("telegram")!;
      const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "{{steps.node-ai-1.text}}",
      };

      const result = await telegramExecutor.execute(telegramNode, ctx.input, ctx);
      expect(result.status).toBe("success");
      expect(result.output?.isTruncated).toBe(true);

      const sentText = (capturedBody as { text: string }).text;
      expect(sentText.length).toBeLessThanOrEqual(4096);
      expect(sentText).toContain("[Message truncated to 4096 chars for Telegram limit]");
    });

    it("falls back to plain text when Telegram rejects unescaped Markdown entities", async () => {
      let attempts = 0;
      let finalParseMode: string | undefined;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("telegram.org")) {
          attempts++;
          const body = JSON.parse(init?.body as string);
          finalParseMode = body.parse_mode;

          // First attempt with Markdown fails due to unescaped entity
          if (body.parse_mode === "Markdown") {
            return new Response(
              JSON.stringify({
                ok: false,
                error_code: 400,
                description: "Bad Request: can't parse entities: Character '_' is reserved and must be escaped",
              }),
              { status: 400, headers: { "Content-Type": "application/json" } },
            );
          }

          // Second attempt without Markdown succeeds
          return new Response(
            JSON.stringify({ ok: true, result: { message_id: 7712 } }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      });

      const ctx = createAssistantContext({
        nodeOutputs: {
          "node-ai-1": {
            // Text containing unescaped Markdown characters (snake_case variable and underscore)
            text: "Please check your order_status_id and tracking_number_key in the dashboard.",
          },
        },
      });

      const telegramExecutor = getExecutor("telegram")!;
      const telegramNode = createWorkflowNode("telegram", { x: 0, y: 0 });
      telegramNode.data.config = {
        chatId: "-1001234567890",
        text: "{{steps.node-ai-1.text}}",
      };

      const result = await telegramExecutor.execute(telegramNode, ctx.input, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.delivered).toBe(true);
      expect(result.output?.messageId).toBe(7712);
      expect(attempts).toBe(2); // Automatically fell back to plain text on second attempt
      expect(finalParseMode).toBeUndefined(); // Plain text sent
    });
  });
});
