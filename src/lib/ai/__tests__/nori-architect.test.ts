import { describe, it, expect, vi, beforeEach } from "vitest";
import { WorkflowPlanner, generateConciseWorkflowName } from "../workflow-planner";
import { WorkflowValidator } from "../workflow-validator";
import { WorkflowGenerationService } from "../workflow-generator";
import { GeneratedWorkflowSchema, normalizeWorkflowName } from "../schema";

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

  describe("2. Workflow Name Normalization & Concise Name Generation", () => {
    it("F. empty/whitespace name -> fallback to 'AI Generated Workflow'", () => {
      expect(normalizeWorkflowName("")).toBe("AI Generated Workflow");
      expect(normalizeWorkflowName("   ")).toBe("AI Generated Workflow");
      expect(normalizeWorkflowName(null)).toBe("AI Generated Workflow");
    });

    it("G. name containing excessive whitespace -> collapsed whitespace", () => {
      expect(normalizeWorkflowName("   Daily    AI   News   to  Telegram   ")).toBe("Daily AI News to Telegram");
    });

    it("E. Gemini-generated name > 100 characters -> normalized cleanly <= 100 chars", () => {
      const longName = "A".repeat(150);
      const normalized = normalizeWorkflowName(longName);
      expect(normalized.length).toBeLessThanOrEqual(100);
      expect(normalized.length).toBe(100);

      const parsed = GeneratedWorkflowSchema.parse({
        name: longName,
        nodes: [{ id: "n1", definitionId: "manual-trigger", label: "Manual Trigger" }],
        edges: [],
      });
      expect(parsed.name.length).toBeLessThanOrEqual(100);
    });

    it("Requirement 13: 105-character prompt -> concise workflow name", () => {
      const prompt = "Every morning at 9 AM, fetch the latest AI news, summarize it using AI, and send the summary to Telegram.";
      expect(prompt.length).toBe(105);

      const plan = WorkflowPlanner.createPlan(prompt);
      const name = generateConciseWorkflowName(prompt, plan);
      expect(name).toBe("Daily AI News to Telegram");
      expect(name.length).toBeLessThanOrEqual(100);
    });
  });

  describe("3. Full Generation Pipeline & Regression Test Cases", () => {
    it("A. 105-character prompt generation", async () => {
      const prompt = "Every morning at 9 AM, fetch the latest AI news, summarize it using AI, and send the summary to Telegram.";
      expect(prompt.length).toBe(105);

      const result = await WorkflowGenerationService.generateWorkflow({ prompt });
      expect(result.validation.isValid).toBe(true);
      expect(result.workflow.name.length).toBeLessThanOrEqual(100);
      expect(result.workflow.name).toBe("Daily AI News to Telegram");
      expect(result.workflow.nodes.map((n) => n.data.label)).toEqual([
        "Schedule Trigger",
        "HTTP Request Pro",
        "AI Agent / LLM",
        "Telegram",
      ]);
    });

    it("B. 200-character prompt generation", async () => {
      const prompt = "When a new customer signs up via form submission on our marketing website, extract their contact details, evaluate their business potential using AI, format the output, and notify our team on Telegram.";
      expect(prompt.length).toBeGreaterThan(200);

      const result = await WorkflowGenerationService.generateWorkflow({ prompt });
      expect(result.validation.isValid).toBe(true);
      expect(result.workflow.name.length).toBeLessThanOrEqual(100);
      expect(result.workflow.name).toContain("Telegram");
    });

    it("C. 500-character prompt generation", async () => {
      const prompt = "Every Monday morning at 8:00 AM UTC, query our PostgreSQL database for all unassigned high priority support tickets filed over the weekend, summarize each ticket's core issue using Gemini AI, format the triage notes with Transform data node, append the processed ticket details into a Google Sheets tracking log, and dispatch an urgent notification with action items directly to our team's designated Telegram channel for immediate resolution.";
      expect(prompt.length).toBeGreaterThan(400);

      const result = await WorkflowGenerationService.generateWorkflow({ prompt });
      expect(result.validation.isValid).toBe(true);
      expect(result.workflow.name.length).toBeLessThanOrEqual(100);
    });

    it("D. short prompt generation", async () => {
      const prompt = "Daily Telegram alert.";
      const result = await WorkflowGenerationService.generateWorkflow({ prompt });
      expect(result.validation.isValid).toBe(true);
      expect(result.workflow.name.length).toBeLessThanOrEqual(100);
    });
  });
});
