import { describe, expect, it } from "vitest";
import { buildExecutionExpressionContext, resolveExpression } from "../expression";
import { WorkflowEngine } from "../engine";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext, WorkflowExecutionRecord } from "../types";

function mockExecutionContext(): ExecutionContext {
  return {
    executionId: "exec-var-test",
    workflowId: "w-var-test",
    workflowVersionId: "ver-var-test",
    versionNumber: 1,
    input: { name: "Raj Solkar", body: { name: "Raj Solkar", amount: 500 } },
    nodeOutputs: {
      "n-code-1": { message: "Hello from code node", status: "ok" },
      "n-http-1": { data: { summary: "HTTP Request Succeeded" } },
    },
    nodeInputs: {},
    nodeStatuses: { "n-code-1": "success", "n-http-1": "success" },
    metadata: {
      nodeTypes: {
        "n-code-1": "code",
        "n-http-1": "http-request",
      },
    },
  };
}

describe("Variable Resolution & Data Propagation Engine", () => {
  it("resolves top-level latest node property: {{message}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("Result: {{message}}", exprCtx);
    expect(result).toBe("Result: Hello from code node");
  });

  it("resolves latest object property: {{latest.data.summary}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("Latest: {{latest.data.summary}}", exprCtx);
    expect(result).toBe("Latest: HTTP Request Succeeded");
  });

  it("resolves step-indexed definition ID: {{steps.code.message}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("Step: {{steps.code.message}}", exprCtx);
    expect(result).toBe("Step: Hello from code node");
  });

  it("resolves step direct definition alias: {{code.message}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("Direct Code: {{code.message}}", exprCtx);
    expect(result).toBe("Direct Code: Hello from code node");
  });

  it("resolves node ID indexed step property: {{steps.n-code-1.message}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("Node ID: {{steps.n-code-1.message}}", exprCtx);
    expect(result).toBe("Node ID: Hello from code node");
  });

  it("resolves root input properties: {{input.name}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("User: {{input.name}}", exprCtx);
    expect(result).toBe("User: Raj Solkar");
  });

  it("resolves trigger body properties: {{trigger.body.amount}}", () => {
    const ctx = mockExecutionContext();
    const exprCtx = buildExecutionExpressionContext(ctx);
    const result = resolveExpression("Amount: ${{trigger.body.amount}}", exprCtx);
    expect(result).toBe("Amount: $500");
  });

  describe("End-to-End Workflow Certification Pipelines", () => {
    it("certifies Webhook -> Code -> Telegram data passing", async () => {
      const origToken = process.env.TELEGRAM_BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = "mock_bot_token_123";

      const origFetch = global.fetch;
      global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
        if (String(url).includes("api.telegram.org")) {
          return new Response(JSON.stringify({ ok: true, result: { message_id: 999 } }), { status: 200 });
        }
        return origFetch(url, init);
      };

      try {
        const webhookNode = createWorkflowNode("webhook", { x: 0, y: 0 });
        webhookNode.id = "node-webhook";

        const codeNode = createWorkflowNode("code", { x: 200, y: 0 });
        codeNode.id = "node-code";
        codeNode.data.config = {
          code: 'return { message: "Hello " + input.name + " from Code Node" };',
        };

        const telegramNode = createWorkflowNode("telegram", { x: 400, y: 0 });
        telegramNode.id = "node-telegram";
        telegramNode.data.config = {
          chatId: "12345678",
          text: "", // Blank text -> should trigger {{message}} expression fallback
        };

        const edge1 = { id: "e1", source: "node-webhook", target: "node-code" };
        const edge2 = { id: "e2", source: "node-code", target: "node-telegram" };

        const wf = await WorkflowService.createWorkflow({
          name: "Webhook -> Code -> Telegram",
          nodes: [webhookNode, codeNode, telegramNode],
          edges: [edge1, edge2],
        });

        const result: WorkflowExecutionRecord = await WorkflowEngine.executeWorkflow({
          workflowId: wf.id,
          input: { name: "Raj" },
          metadata: { source: "webhook" },
        });

        const codeExec = result.nodeExecutions.find((n) => n.nodeId === "node-code");
        expect(codeExec?.status).toBe("success");
        expect(codeExec?.output?.message).toBe("Hello Raj from Code Node");

        const telegramExec = result.nodeExecutions.find((n) => n.nodeId === "node-telegram");
        expect(telegramExec?.status).toBe("success");
        expect(telegramExec?.output?.text).toBe("Hello Raj from Code Node");
      } finally {
        global.fetch = origFetch;
        if (origToken) process.env.TELEGRAM_BOT_TOKEN = origToken;
        else delete process.env.TELEGRAM_BOT_TOKEN;
      }
    });

    it("certifies Webhook -> Code -> Email data passing", async () => {
      const origSmtp = process.env.SMTP_HOST;
      process.env.SMTP_HOST = "smtp.mailtrap.io";

      try {
        const webhookNode = createWorkflowNode("webhook", { x: 0, y: 0 });
        webhookNode.id = "node-webhook";

        const codeNode = createWorkflowNode("code", { x: 200, y: 0 });
        codeNode.id = "node-code";
        codeNode.data.config = {
          code: 'return { message: "Notification for " + input.name, recipient: "sales@example.com" };',
        };

        const emailNode = createWorkflowNode("email", { x: 400, y: 0 });
        emailNode.id = "node-email";
        emailNode.data.config = {
          to: "sales@example.com",
          subject: "Pipeline Alert: {{name}}",
          body: "", // Blank body -> should resolve {{message}}
        };

        const edge1 = { id: "e1", source: "node-webhook", target: "node-code" };
        const edge2 = { id: "e2", source: "node-code", target: "node-email" };

        const wf = await WorkflowService.createWorkflow({
          name: "Webhook -> Code -> Email",
          nodes: [webhookNode, codeNode, emailNode],
          edges: [edge1, edge2],
        });

        const result: WorkflowExecutionRecord = await WorkflowEngine.executeWorkflow({
          workflowId: wf.id,
          input: { name: "Raj" },
          metadata: { source: "webhook" },
        });

        const emailExec = result.nodeExecutions.find((n) => n.nodeId === "node-email");
        expect(emailExec?.status).toBe("success");
        expect(emailExec?.output?.to).toBe("sales@example.com");
        expect(emailExec?.output?.subject).toBe("Pipeline Alert: Raj");
      } finally {
        if (origSmtp) process.env.SMTP_HOST = origSmtp;
        else delete process.env.SMTP_HOST;
      }
    });
  });
});
