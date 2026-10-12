import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowEngine } from "../engine";
import { ManualTriggerExecutor } from "../executors/manual-trigger";
import { AIExecutor } from "../executors/ai";
import { buildExecutionExpressionContext, resolveExpression, resolvePropertyPath } from "../expression";
import { STARTER_TEMPLATES } from "@/lib/templates/starter-templates";
import { TemplateCloner } from "@/lib/templates/template-cloner";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { POST as executeRoute } from "@/app/api/workflows/[id]/execute/route";
import type { ExecutionContext, WorkflowExecutionRecord } from "../types";
import { prisma } from "@/lib/prisma";

// Mock auth so API route can run in test environment
vi.mock("@/lib/auth/get-auth-user", () => ({
  requireAuthUser: vi.fn().mockResolvedValue({
    userId: "test-user-payload-123",
    orgId: null,
    errorResponse: null,
  }),
}));

// Mock rate limiting
vi.mock("@/lib/security/rate-limit", () => ({
  limitWorkflowExecution: vi.fn().mockResolvedValue({ success: true }),
  createRateLimitResponse: vi.fn(),
}));

// Mock concurrency limit
vi.mock("@/lib/security/concurrency-limit", () => ({
  checkExecutionConcurrency: vi.fn().mockResolvedValue({ allowed: true }),
}));

describe("Neuraloop — Async Payload Preservation & Notification Templates Regression Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. Canonical Execution Input Extraction & Validation in API Route", () => {
    it("preserves explicitly nested { input: { incidentReport: ... } } payload", async () => {
      const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const workflow = await WorkflowService.createWorkflow(
        {
          name: "API Input Test Workflow",
          nodes: [trigger],
          edges: [],
        },
        "test-user-payload-123",
      );

      const request = new Request(`http://localhost:3000/api/workflows/${workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: {
            incidentReport: "Database deadlock on orders cluster",
            chatId: "-100889977",
          },
        }),
      });

      const response = await executeRoute(request, { params: Promise.resolve({ id: workflow.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.execution).toBeDefined();
      expect(data.execution.input).toEqual({
        incidentReport: "Database deadlock on orders cluster",
        chatId: "-100889977",
      });

      await WorkflowService.deleteWorkflow(workflow.id, "test-user-payload-123");
    });

    it("extracts root fields as canonical input when payload is not wrapped in { input: ... }", async () => {
      const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const workflow = await WorkflowService.createWorkflow(
        {
          name: "Raw Root Payload Workflow",
          nodes: [trigger],
          edges: [],
        },
        "test-user-payload-123",
      );

      const request = new Request(`http://localhost:3000/api/workflows/${workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentReport: "Payment service 503 error rate spike",
          chatId: "-100223344",
        }),
      });

      const response = await executeRoute(request, { params: Promise.resolve({ id: workflow.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.execution.input).toEqual({
        incidentReport: "Payment service 503 error rate spike",
        chatId: "-100223344",
      });

      await WorkflowService.deleteWorkflow(workflow.id, "test-user-payload-123");
    });

    it("rejects malformed non-empty JSON with 400 error instead of silently defaulting to empty {}", async () => {
      const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const workflow = await WorkflowService.createWorkflow(
        {
          name: "Malformed JSON Test Workflow",
          nodes: [trigger],
          edges: [],
        },
        "test-user-payload-123",
      );

      const request = new Request(`http://localhost:3000/api/workflows/${workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformed json: missing_quotes, }",
      });

      const response = await executeRoute(request, { params: Promise.resolve({ id: workflow.id }) });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain("INVALID_JSON_PAYLOAD");

      await WorkflowService.deleteWorkflow(workflow.id, "test-user-payload-123");
    });

    it("falls back to trigger defaultPayload when submitted payload is empty", async () => {
      const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      trigger.data.config = {
        defaultPayload: {
          incidentReport: "Default sample cluster memory pressure",
          chatId: "-100556677",
        },
      };

      const workflow = await WorkflowService.createWorkflow(
        {
          name: "Default Payload Fallback Workflow",
          nodes: [trigger],
          edges: [],
        },
        "test-user-payload-123",
      );

      const request = new Request(`http://localhost:3000/api/workflows/${workflow.id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const response = await executeRoute(request, { params: Promise.resolve({ id: workflow.id }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.execution.input).toEqual({
        incidentReport: "Default sample cluster memory pressure",
        chatId: "-100556677",
      });

      await WorkflowService.deleteWorkflow(workflow.id, "test-user-payload-123");
    });
  });

  describe("2. Engine & Queue/Worker Input Recovery", () => {
    it("recovers input from DB execution record when engine is called with empty options.input", async () => {
      const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const workflow = await WorkflowService.createWorkflow(
        {
          name: "DB Input Recovery Workflow",
          nodes: [trigger],
          edges: [],
        },
        "test-user-payload-123",
      );

      const executionId = `exec-recovery-test-${Date.now()}`;

      if (process.env.DATABASE_URL) {
        const dbVersion = await prisma.workflowVersion.findFirst({
          where: { workflowId: workflow.id },
        });

        await prisma.workflowExecution.create({
          data: {
            id: executionId,
            workflowId: workflow.id,
            workflowVersionId: dbVersion?.id || `ver-rec-${workflow.id}`,
            userId: "test-user-payload-123",
            status: "queued",
            input: {
              incidentReport: "Recovered incident report from persisted queue record",
              chatId: "-100990011",
            },
          },
        });
      }

      // Invoke engine with executionId but WITHOUT options.input (simulating worker queue boundary)
      const execution = await WorkflowEngine.executeWorkflow({
        workflowId: workflow.id,
        executionId,
        input: {}, // Empty options.input!
        userId: "test-user-payload-123",
      });

      if (process.env.DATABASE_URL) {
        expect(execution.input).toEqual({
          incidentReport: "Recovered incident report from persisted queue record",
          chatId: "-100990011",
        });

        // Verify DB record input was not overwritten with {}
        const dbRecord = await prisma.workflowExecution.findUnique({ where: { id: executionId } });
        expect(dbRecord?.input).toEqual({
          incidentReport: "Recovered incident report from persisted queue record",
          chatId: "-100990011",
        });

        await prisma.nodeExecution.deleteMany({ where: { executionId } }).catch(() => {});
        await prisma.workflowExecution.delete({ where: { id: executionId } }).catch(() => {});
      }

      await WorkflowService.deleteWorkflow(workflow.id, "test-user-payload-123");
    });
  });

  describe("3. Manual Trigger Executor & Expression Resolution Pipeline", () => {
    it("ManualTriggerExecutor exposes root payload and defaultPayload to trigger output", async () => {
      const triggerNode = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      triggerNode.data.config = {
        defaultPayload: { defaultKey: "defaultValue" },
      };

      const result = await ManualTriggerExecutor.execute(
        triggerNode,
        { incidentReport: "High load average", chatId: "-10033" },
        { input: { incidentReport: "High load average", chatId: "-10033" } } as unknown as ExecutionContext,
      );

      expect(result.status).toBe("success");
      expect(result.output).toHaveProperty("incidentReport", "High load average");
      expect(result.output).toHaveProperty("chatId", "-10033");
      expect(result.output).toHaveProperty("defaultKey", "defaultValue");
      expect(result.output).toHaveProperty("source", "manual");
    });

    it("resolves trigger output in buildExecutionExpressionContext across input, $input, trigger, and steps", () => {
      const dummyContext: ExecutionContext = {
        workflowId: "wf-expr",
        workflowVersionId: "ver-expr",
        versionNumber: 1,
        executionId: "exec-expr",
        input: { incidentReport: "Network packet loss 30%" },
        nodeOutputs: {
          "node-trigger-1": {
            incidentReport: "Network packet loss 30%",
            chatId: "-100123",
            source: "manual",
          },
        },
        nodeInputs: {},
        nodeStatuses: { "node-trigger-1": "success" },
        metadata: {
          nodeTypes: { "node-trigger-1": "manual-trigger" },
        },
      };

      const exprContext = buildExecutionExpressionContext(dummyContext);

      expect(resolvePropertyPath(exprContext, "input.incidentReport")).toBe("Network packet loss 30%");
      expect(resolvePropertyPath(exprContext, "$input.incidentReport")).toBe("Network packet loss 30%");
      expect(resolvePropertyPath(exprContext, "trigger.incidentReport")).toBe("Network packet loss 30%");
      expect(resolvePropertyPath(exprContext, "steps.node-trigger-1.incidentReport")).toBe("Network packet loss 30%");
      expect(resolvePropertyPath(exprContext, "steps.manual-trigger.incidentReport")).toBe("Network packet loss 30%");
    });
  });

  describe("4. Incident Notification Templates: Severity & isUrgent Bidirectional Resolution", () => {
    it("automatically derives severity from isUrgent in expression context if omitted from AI output", () => {
      const dummyContext: ExecutionContext = {
        workflowId: "wf-sev",
        workflowVersionId: "ver-sev",
        versionNumber: 1,
        executionId: "exec-sev",
        input: {},
        nodeOutputs: {
          "node-ai-1": {
            json: {
              isUrgent: true,
              summary: "Payment timeout cluster failure",
              recommendedAction: "Failover gateway",
            },
          },
        },
        nodeInputs: {},
        nodeStatuses: { "node-ai-1": "success" },
        metadata: {
          nodeTypes: { "node-ai-1": "ai" },
        },
      };

      const exprContext = buildExecutionExpressionContext(dummyContext);

      // Verify severity is auto-derived as CRITICAL when isUrgent is true
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.severity")).toBe("CRITICAL");
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.severity")).toBe("CRITICAL");

      // Verify Telegram title template interpolates cleanly without [Missing: ...]
      const telegramTemplate =
        "🚨 *URGENT INCIDENT DETECTED* [Severity: {{steps.node-ai-1.json.severity}}]\n\n*Summary:* {{steps.node-ai-1.json.summary}}";
      const resolved = resolveExpression(telegramTemplate, exprContext);

      expect(resolved).not.toContain("[Missing:");
      expect(resolved).toContain("[Severity: CRITICAL]");
      expect(resolved).toContain("Payment timeout cluster failure");
    });

    it("automatically derives isUrgent when severity is present in AI JSON output", () => {
      const dummyContext: ExecutionContext = {
        workflowId: "wf-sev-2",
        workflowVersionId: "ver-sev-2",
        versionNumber: 1,
        executionId: "exec-sev-2",
        input: {},
        nodeOutputs: {
          "node-ai-1": {
            json: {
              severity: "LOW",
              summary: "Minor button padding alignment",
              recommendedAction: "Review in next sprint",
            },
          },
        },
        nodeInputs: {},
        nodeStatuses: { "node-ai-1": "success" },
        metadata: {
          nodeTypes: { "node-ai-1": "ai" },
        },
      };

      const exprContext = buildExecutionExpressionContext(dummyContext);

      // Email subject template
      const emailSubject =
        "[Notice] Routine Incident (Severity: {{steps.node-ai-1.json.severity}}): {{steps.node-ai-1.json.summary}}";
      const resolvedSubject = resolveExpression(emailSubject, exprContext);

      expect(resolvedSubject).not.toContain("[Missing:");
      expect(resolvedSubject).toBe("[Notice] Routine Incident (Severity: LOW): Minor button padding alignment");
    });

    it("verifies Starter 07 definition includes defaultPayload and severity across all notification nodes", () => {
      const starter07 = STARTER_TEMPLATES.find((t) => t.id === "starter-07-smart-ai-alert-router")!;
      expect(starter07).toBeDefined();

      const triggerNode = starter07.definition.nodes.find((n) => n.id === "node-trigger-1")!;
      const triggerConfig = (triggerNode.data?.config as Record<string, unknown>) || {};
      expect(triggerConfig).toHaveProperty("defaultPayload");
      const defaultPayload = triggerConfig.defaultPayload as Record<string, unknown>;
      expect(defaultPayload).toHaveProperty("incidentReport");
      expect(defaultPayload).toHaveProperty("chatId");

      const aiNode = starter07.definition.nodes.find((n) => n.id === "node-ai-1")!;
      const aiConfig = (aiNode.data?.config as Record<string, unknown>) || {};
      const aiPrompt = aiConfig.systemPrompt as string;
      expect(aiPrompt).toContain("severity");

      const telegramNode = starter07.definition.nodes.find((n) => n.id === "node-telegram-1")!;
      const telegramConfig = (telegramNode.data?.config as Record<string, unknown>) || {};
      const telegramText = telegramConfig.text as string;
      expect(telegramText).toContain("{{steps.node-ai-1.json.severity}}");

      const emailNode = starter07.definition.nodes.find((n) => n.id === "node-email-1")!;
      const emailConfig = (emailNode.data?.config as Record<string, unknown>) || {};
      const emailSubject = emailConfig.subject as string;
      expect(emailSubject).toContain("{{steps.node-ai-1.json.severity}}");
    });
  });
});
