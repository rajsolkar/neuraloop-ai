import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowPlanner } from "../workflow-planner";
import { WorkflowValidator } from "../workflow-validator";
import { WorkflowGenerationService } from "../workflow-generator";

describe("Phase 20: Nori AI Workflow Architect v2 Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Intent Extraction & Constraint Enforcement", () => {
    it("Prompt 1: 'Every morning summarize AI news and send it to Telegram.'", () => {
      const intent = WorkflowPlanner.extractIntent("Every morning summarize AI news and send it to Telegram.");
      expect(intent.trigger).toBe("schedule");
      expect(intent.requiredNodes).toContain("schedule");
      expect(intent.requiredNodes).toContain("http-request");
      expect(intent.requiredNodes).toContain("ai");
      expect(intent.requiredNodes).toContain("telegram");
      expect(intent.forbiddenNodes).toHaveLength(0);
    });

    it("Prompt 2: 'Ingest webhook leads, qualify with AI, and use Telegram instead of Slack.'", () => {
      const intent = WorkflowPlanner.extractIntent("Ingest webhook leads, qualify with AI, and use Telegram instead of Slack.");
      expect(intent.trigger).toBe("webhook");
      expect(intent.requiredNodes).toContain("webhook");
      expect(intent.requiredNodes).toContain("ai");
      expect(intent.requiredNodes).toContain("telegram");
      expect(intent.forbiddenNodes).toContain("slack");
      expect(intent.requiredNodes).not.toContain("slack");
    });

    it("Prompt 3: 'Fetch weather via HTTP every hour and post to Slack. Do not use AI.'", () => {
      const intent = WorkflowPlanner.extractIntent("Fetch weather via HTTP every hour and post to Slack. Do not use AI.");
      expect(intent.trigger).toBe("schedule");
      expect(intent.requiredNodes).toContain("schedule");
      expect(intent.requiredNodes).toContain("http-request");
      expect(intent.requiredNodes).toContain("slack");
      expect(intent.forbiddenNodes).toContain("ai");
      expect(intent.requiredNodes).not.toContain("ai");
    });

    it("Prompt 4: 'Every Monday read new rows from Google Sheets, format with Transform, and send an email for each item.'", () => {
      const intent = WorkflowPlanner.extractIntent("Every Monday read new rows from Google Sheets, format with Transform, and send an email for each item.");
      expect(intent.trigger).toBe("schedule");
      expect(intent.requiredNodes).toContain("schedule");
      expect(intent.requiredNodes).toContain("google-sheets");
      expect(intent.requiredNodes).toContain("transform");
      expect(intent.requiredNodes).toContain("loop");
      expect(intent.requiredNodes).toContain("email");
    });

    it("Prompt 5: 'Ingest lead webhook, check if score > 50 with IF, if true send email, if false log to Google Sheets.'", () => {
      const intent = WorkflowPlanner.extractIntent("Ingest lead webhook, check if score > 50 with IF, if true send email, if false log to Google Sheets.");
      expect(intent.trigger).toBe("webhook");
      expect(intent.requiredNodes).toContain("webhook");
      expect(intent.requiredNodes).toContain("if");
      expect(intent.requiredNodes).toContain("email");
      expect(intent.requiredNodes).toContain("google-sheets");
    });

    it("Prompt 6: 'Ingest support ticket webhook, route by priority using Switch: high priority to Telegram, medium priority to Slack, default to Email.'", () => {
      const intent = WorkflowPlanner.extractIntent("Ingest support ticket webhook, route by priority using Switch: high priority to Telegram, medium priority to Slack, default to Email.");
      expect(intent.trigger).toBe("webhook");
      expect(intent.requiredNodes).toContain("webhook");
      expect(intent.requiredNodes).toContain("switch");
      expect(intent.requiredNodes).toContain("telegram");
      expect(intent.requiredNodes).toContain("slack");
      expect(intent.requiredNodes).toContain("email");
    });

    it("Prompt 7: 'Listen for incoming webhook, process payload with Code node, and return HTTP Webhook Response.'", () => {
      const intent = WorkflowPlanner.extractIntent("Listen for incoming webhook, process payload with Code node, and return HTTP Webhook Response.");
      expect(intent.trigger).toBe("webhook");
      expect(intent.requiredNodes).toContain("webhook");
      expect(intent.requiredNodes).toContain("code");
      expect(intent.requiredNodes).toContain("webhook-response");
    });

    it("Prompt 8: 'Manual trigger, delay 30 minutes, then send Discord embed alert.'", () => {
      const intent = WorkflowPlanner.extractIntent("Manual trigger, delay 30 minutes, then send Discord embed alert.");
      expect(intent.trigger).toBe("manual-trigger");
      expect(intent.requiredNodes).toContain("manual-trigger");
      expect(intent.requiredNodes).toContain("delay");
      expect(intent.requiredNodes).toContain("discord");
    });

    it("Prompt 9: 'Schedule daily run, fetch GitHub API with HTTP Request and fetch news API with HTTP Request, merge outputs, summarize with AI, send to Telegram.'", () => {
      const intent = WorkflowPlanner.extractIntent("Schedule daily run, fetch GitHub API with HTTP Request and fetch news API with HTTP Request, merge outputs, summarize with AI, send to Telegram.");
      expect(intent.trigger).toBe("schedule");
      expect(intent.requiredNodes).toContain("schedule");
      expect(intent.requiredNodes).toContain("http-request");
      expect(intent.requiredNodes).toContain("merge");
      expect(intent.requiredNodes).toContain("ai");
      expect(intent.requiredNodes).toContain("telegram");
    });

    it("Prompt 10: 'Webhook lead input, filter out missing emails, set variable status=\\'VALIDATED\\', notify Telegram.'", () => {
      const intent = WorkflowPlanner.extractIntent("Webhook lead input, filter out missing emails, set variable status='VALIDATED', notify Telegram.");
      expect(intent.trigger).toBe("webhook");
      expect(intent.requiredNodes).toContain("webhook");
      expect(intent.requiredNodes).toContain("filter");
      expect(intent.requiredNodes).toContain("set-variable");
      expect(intent.requiredNodes).toContain("telegram");
    });
  });

  describe("2. Full Generation Pipeline & Validation", () => {
    it("should generate a valid workflow graph matching prompt 2 constraints (Telegram present, Slack absent)", async () => {
      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Ingest webhook leads, qualify with AI, and use Telegram instead of Slack.",
      });

      expect(result.validation.isValid).toBe(true);
      expect(result.plan.requiredNodes).toContain("telegram");
      expect(result.plan.forbiddenNodes).toContain("slack");

      const nodeDefs = result.workflow.nodes.map((n) => n.data.type || n.id);
      const defIds = result.workflow.nodes.map((n) => {
        // extract definitionId from node configuration or label/id
        return n.data.label;
      });

      expect(result.workflow.nodes.some((n) => n.id.includes("telegram") || n.data.label.toLowerCase().includes("telegram"))).toBe(true);
      expect(result.workflow.nodes.some((n) => n.id.includes("slack") || n.data.label.toLowerCase().includes("slack"))).toBe(false);
    });

    it("should generate a valid workflow graph matching prompt 3 constraints (No AI)", async () => {
      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Fetch weather via HTTP every hour and post to Slack. Do not use AI.",
      });

      expect(result.validation.isValid).toBe(true);
      expect(result.plan.forbiddenNodes).toContain("ai");

      const hasAi = result.workflow.nodes.some((n) => n.id.includes("ai") || n.data.label.toLowerCase().includes("ai agent"));
      expect(hasAi).toBe(false);
    });
  });
});
