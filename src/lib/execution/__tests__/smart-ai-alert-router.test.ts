import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowEngine } from "../engine";
import { STARTER_TEMPLATES } from "@/lib/templates/starter-templates";
import { TemplateCloner } from "@/lib/templates/template-cloner";
import { buildExecutionExpressionContext, resolveExpression, resolvePropertyPath } from "../expression";
import { IfExecutor } from "../executors/if";
import type { ExecutionContext, WorkflowExecutionRecord } from "../types";
import type { Workflow } from "@/types/workflow";

// Mock external APIs so integration nodes run predictably without external internet in unit tests
vi.mock("nodemailer", () => ({
  default: {
    createTransport: () => ({
      sendMail: vi.fn().mockResolvedValue({
        accepted: ["team@example.com"],
        rejected: [],
        messageId: "<msg-test-123@example.com>",
        response: "250 OK",
      }),
    }),
  },
}));

describe("Smart AI Alert Router — Production Readiness & Branching", () => {
  const starter07 = STARTER_TEMPLATES.find((t) => t.id === "starter-07-smart-ai-alert-router")!;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe("1. AI Output JSON & Expression Resolution Engine", () => {
    it("resolves nested AI JSON outputs through buildExecutionExpressionContext", () => {
      const dummyContext: ExecutionContext = {
        workflowId: "wf_test",
        workflowVersionId: "ver_test",
        versionNumber: 1,
        executionId: "exec_test",
        input: { chatId: "-100998877", incidentReport: "Cluster memory spike" },
        nodeOutputs: {
          "node-ai-1": {
            text: '{"isUrgent": true, "summary": "Cluster memory spike at 98%", "recommendedAction": "Restart worker pods"}',
            json: {
              isUrgent: true,
              summary: "Cluster memory spike at 98%",
              recommendedAction: "Restart worker pods",
            },
            provider: "openai",
            responseType: "json",
          },
        },
        nodeInputs: {},
        nodeStatuses: {},
        metadata: {},
      };

      const exprContext = buildExecutionExpressionContext(dummyContext);

      // 1. Direct path lookup
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.isUrgent")).toBe(true);
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.summary")).toBe("Cluster memory spike at 98%");
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.json.recommendedAction")).toBe("Restart worker pods");

      // 2. Resilient shorthand without .json
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.summary")).toBe("Cluster memory spike at 98%");
      expect(resolvePropertyPath(exprContext, "steps.node-ai-1.isUrgent")).toBe(true);

      // 3. Input resolution
      expect(resolvePropertyPath(exprContext, "input.chatId")).toBe("-100998877");

      // 4. Multi-variable template interpolation for Telegram
      const telegramTemplate =
        "🚨 *URGENT INCIDENT DETECTED*\n\n*Summary:* {{steps.node-ai-1.json.summary}}\n*Action:* {{steps.node-ai-1.json.recommendedAction}}";
      const resolvedText = resolveExpression(telegramTemplate, exprContext);

      expect(resolvedText).toContain("Summary:* Cluster memory spike at 98%");
      expect(resolvedText).toContain("Action:* Restart worker pods");
    });
  });

  describe("2. Starter 07 Urgent Path (TRUE Branch -> Telegram Executed, Email Skipped)", () => {
    it("evaluates IF condition to TRUE (actualValue: true) and routes to Telegram while skipping Email", async () => {
      // Mock fetch for Telegram API call
      const globalFetch = global.fetch;
      const prevBotToken = process.env.TELEGRAM_BOT_TOKEN;
      process.env.TELEGRAM_BOT_TOKEN = "test-bot-token-123456";

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes("api.telegram.org")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              ok: true,
              result: { message_id: 8899, text: "Delivered" },
            }),
          };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      });

      const urgentWorkflow: Workflow = {
        id: "wf-urgent-test",
        name: starter07.definition.name,
        description: starter07.definition.description,
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedAt: null,
        nodes: starter07.definition.nodes,
        edges: starter07.definition.edges,
      };

      // Mock cached output for AI node simulating an urgent incident
      const cachedAiOutput = {
        text: '{"isUrgent": true, "summary": "Payment gateway 45% error rate", "recommendedAction": "Failover to secondary gateway"}',
        json: {
          isUrgent: true,
          summary: "Payment gateway 45% error rate",
          recommendedAction: "Failover to secondary gateway",
        },
        provider: "openai",
        responseType: "json",
      };

      // Execute workflow through engine using replay/cached outputs for trigger & AI
      const execResult: WorkflowExecutionRecord = await WorkflowEngine.executeWorkflow({
        workflowId: urgentWorkflow.id,
        workflow: urgentWorkflow,
        input: {
          incidentReport: "Payment gateway 45% error rate",
          chatId: "-1001234567890",
        },
        metadata: {
          cachedNodeOutputs: {
            "node-trigger-1": { triggered: true },
            "node-ai-1": cachedAiOutput,
          },
        },
      });

      // Verify overall execution succeeded
      expect(execResult.status).toBe("success");

      // Verify IF node evaluated to TRUE with actualValue: true
      const ifNodeExec = execResult.nodeExecutions.find((n) => n.nodeId === "node-if-1")!;
      expect(ifNodeExec.status).toBe("success");
      expect(ifNodeExec.output?.result).toBe(true);
      expect(ifNodeExec.output?.actualValue).toBe(true);
      expect(ifNodeExec.output?.selectedBranch).toBe("true");

      // Verify Telegram node was executed on TRUE branch
      const telegramExec = execResult.nodeExecutions.find((n) => n.nodeId === "node-telegram-1")!;
      expect(telegramExec).toBeDefined();
      expect(telegramExec.status).toBe("success");
      expect(telegramExec.output?.delivered).toBe(true);
      expect(telegramExec.output?.text).toContain("Payment gateway 45% error rate");

      // Verify Email node on FALSE branch was cleanly SKIPPED
      const emailExec = execResult.nodeExecutions.find((n) => n.nodeId === "node-email-1")!;
      expect(emailExec).toBeDefined();
      expect(emailExec.status).toBe("skipped");
      expect(emailExec.duration).toBe(0);

      process.env.TELEGRAM_BOT_TOKEN = prevBotToken;
      global.fetch = globalFetch;
    });
  });

  describe("3. Starter 07 Routine Path (FALSE Branch -> Email Executed, Telegram Skipped)", () => {
    it("evaluates IF condition to FALSE (actualValue: false) and routes to Email while skipping Telegram", async () => {
      const routineWorkflow: Workflow = {
        id: "wf-routine-test",
        name: starter07.definition.name,
        description: starter07.definition.description,
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedAt: null,
        nodes: starter07.definition.nodes,
        edges: starter07.definition.edges,
      };

      // Mock cached output for AI node simulating non-urgent routine event
      const cachedAiOutput = {
        text: '{"isUrgent": false, "summary": "Minor UI cosmetic alignment on footer", "recommendedAction": "Log in backlog"}',
        json: {
          isUrgent: false,
          summary: "Minor UI cosmetic alignment on footer",
          recommendedAction: "Log in backlog",
        },
        provider: "openai",
        responseType: "json",
      };

      // Provide temporary environment variables for SMTP so Email node can send
      const prevHost = process.env.SMTP_HOST;
      const prevUser = process.env.SMTP_USER;
      process.env.SMTP_HOST = "smtp.example.com";
      process.env.SMTP_USER = "alerts@example.com";

      const execResult: WorkflowExecutionRecord = await WorkflowEngine.executeWorkflow({
        workflowId: routineWorkflow.id,
        workflow: routineWorkflow,
        input: {
          incidentReport: "Minor UI cosmetic alignment on footer",
          chatId: "-1001234567890",
        },
        metadata: {
          cachedNodeOutputs: {
            "node-trigger-1": { triggered: true },
            "node-ai-1": cachedAiOutput,
          },
        },
      });

      // Restore env vars
      process.env.SMTP_HOST = prevHost;
      process.env.SMTP_USER = prevUser;

      // Verify overall execution succeeded
      expect(execResult.status).toBe("success");

      // Verify IF node evaluated to FALSE with actualValue: false (NEVER "N/A"!)
      const ifNodeExec = execResult.nodeExecutions.find((n) => n.nodeId === "node-if-1")!;
      expect(ifNodeExec.status).toBe("success");
      expect(ifNodeExec.output?.result).toBe(false);
      expect(ifNodeExec.output?.actualValue).toBe(false);
      expect(ifNodeExec.output?.selectedBranch).toBe("false");

      // Verify Email node was executed on FALSE branch
      const emailExec = execResult.nodeExecutions.find((n) => n.nodeId === "node-email-1")!;
      expect(emailExec).toBeDefined();
      expect(emailExec.status).toBe("success");
      expect(emailExec.output?.to).toBe("team@example.com");
      expect(emailExec.output?.subject).toContain("Minor UI cosmetic alignment");

      // Verify Telegram node on TRUE branch was cleanly SKIPPED
      const telegramExec = execResult.nodeExecutions.find((n) => n.nodeId === "node-telegram-1")!;
      expect(telegramExec).toBeDefined();
      expect(telegramExec.status).toBe("skipped");
      expect(telegramExec.duration).toBe(0);
    });
  });

  describe("4. DAG Branch Convergence", () => {
    it("does not skip a downstream node if at least one active predecessor path succeeded", async () => {
      // Create a diamond workflow: Trigger -> IF -> (True: Node A, False: Node B) -> Rejoin Node C
      const diamondWorkflow: Workflow = {
        id: "wf-diamond-test",
        name: "Diamond Convergence Test",
        description: "Diamond Convergence Test",
        status: "published",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedAt: null,
        nodes: [
          {
            id: "node-trig",
            type: "neuraloop-node",
            position: { x: 0, y: 0 },
            data: { definitionId: "manual-trigger", label: "Trigger", description: "Trigger", category: "trigger", config: {} },
          },
          {
            id: "node-cond",
            type: "neuraloop-node",
            position: { x: 100, y: 0 },
            data: {
              definitionId: "if",
              label: "Condition",
              description: "Condition",
              category: "logic",
              config: { condition: { field: "takeBranchA", operator: "is_true" } },
            },
          },
          {
            id: "node-branch-a",
            type: "neuraloop-node",
            position: { x: 200, y: -50 },
            data: {
              definitionId: "transform",
              label: "Branch A",
              description: "Branch A",
              category: "action",
              config: { expression: '{"branch": "A"}' },
            },
          },
          {
            id: "node-branch-b",
            type: "neuraloop-node",
            position: { x: 200, y: 50 },
            data: {
              definitionId: "transform",
              label: "Branch B",
              description: "Branch B",
              category: "action",
              config: { expression: '{"branch": "B"}' },
            },
          },
          {
            id: "node-rejoin-c",
            type: "neuraloop-node",
            position: { x: 300, y: 0 },
            data: {
              definitionId: "transform",
              label: "Rejoin C",
              description: "Rejoin C",
              category: "action",
              config: { expression: '{"rejoined": true}' },
            },
          },
        ],
        edges: [
          { id: "e1", source: "node-trig", target: "node-cond" },
          { id: "e2", source: "node-cond", target: "node-branch-a", sourceHandle: "true" },
          { id: "e3", source: "node-cond", target: "node-branch-b", sourceHandle: "false" },
          { id: "e4", source: "node-branch-a", target: "node-rejoin-c" },
          { id: "e5", source: "node-branch-b", target: "node-rejoin-c" },
        ],
      };

      const execResult = await WorkflowEngine.executeWorkflow({
        workflowId: diamondWorkflow.id,
        workflow: diamondWorkflow,
        input: { takeBranchA: true },
      });

      expect(execResult.status).toBe("success");

      const nodeA = execResult.nodeExecutions.find((n) => n.nodeId === "node-branch-a")!;
      const nodeB = execResult.nodeExecutions.find((n) => n.nodeId === "node-branch-b")!;
      const nodeC = execResult.nodeExecutions.find((n) => n.nodeId === "node-rejoin-c")!;

      expect(nodeA.status).toBe("success");
      expect(nodeB.status).toBe("skipped");
      // Node C receives from both A and B. Because A was taken and succeeded, C MUST execute!
      expect(nodeC.status).toBe("success");
    });
  });

  describe("5. Starter 07 Template Cloning & Expression Remapping", () => {
    it("clones Starter 07 with regenerated IDs, sanitized secrets, and remapped expressions", () => {
      const cloned = TemplateCloner.cloneGraph(starter07.definition, "My AI Alert Router");

      expect(cloned.name).toBe("My AI Alert Router");
      expect(cloned.nodes.length).toBe(starter07.definition.nodes.length);
      expect(cloned.edges.length).toBe(starter07.definition.edges.length);

      // Verify all node IDs are new and unique
      const clonedIds = cloned.nodes.map((n) => n.id);
      expect(new Set(clonedIds).size).toBe(cloned.nodes.length);
      expect(clonedIds.every((id) => id.startsWith("n-cloned-"))).toBe(true);

      // Find cloned nodes
      const clonedAi = cloned.nodes.find((n) => n.data.definitionId === "ai")!;
      const clonedIf = cloned.nodes.find((n) => n.data.definitionId === "if")!;
      const clonedTelegram = cloned.nodes.find((n) => n.data.definitionId === "telegram")!;
      const clonedEmail = cloned.nodes.find((n) => n.data.definitionId === "email")!;

      // 1. IF condition field was remapped from steps.node-ai-1.json.isUrgent to steps.<clonedAi.id>.json.isUrgent
      const ifConfig = (clonedIf.data.config as Record<string, unknown>) ?? {};
      const ifCond = ifConfig.condition as Record<string, unknown>;
      expect(ifCond.field).toBe(`steps.${clonedAi.id}.json.isUrgent`);

      // 2. Telegram message remapped
      const telegramConfig = (clonedTelegram.data.config as Record<string, unknown>) ?? {};
      const telegramText = telegramConfig.text as string;
      expect(telegramText).toContain(`steps.${clonedAi.id}.json.summary`);
      expect(telegramText).toContain(`steps.${clonedAi.id}.json.recommendedAction`);

      // 3. Email subject and body remapped
      const emailConfig = (clonedEmail.data.config as Record<string, unknown>) ?? {};
      const emailSubject = emailConfig.subject as string;
      const emailBody = emailConfig.body as string;
      expect(emailSubject).toContain(`steps.${clonedAi.id}.json.summary`);
      expect(emailBody).toContain(`steps.${clonedAi.id}.json.summary`);
      expect(emailBody).toContain(`steps.${clonedAi.id}.json.recommendedAction`);

      // 4. Sensitive credentials wiped clean for security
      const aiConfig = (clonedAi.data.config as Record<string, unknown>) ?? {};
      expect(aiConfig.credentialId).toBe("");
      expect(telegramConfig.credentialId).toBe("");
      expect(emailConfig.credentialId).toBe("");
    });
  });
});
