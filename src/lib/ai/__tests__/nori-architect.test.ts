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

    it("Part 4 Case A: 'Send the summary to Telegram instead of Slack.'", async () => {
      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Every morning summarize AI news. Send the summary to Telegram instead of Slack.",
      });

      expect(result.validation.isValid).toBe(true);

      const hasSlackInGraph = result.workflow.nodes.some((n) => n.id.includes("slack") || n.data.label.toLowerCase().includes("slack"));
      expect(hasSlackInGraph).toBe(false);

      expect(result.plan.integrations.some((i) => i.toLowerCase().includes("slack"))).toBe(false);
      expect(result.plan.credentialsNeeded.some((c) => c.toLowerCase().includes("slack"))).toBe(false);

      const hasTelegramInGraph = result.workflow.nodes.some((n) => n.id.includes("telegram") || n.data.label.toLowerCase().includes("telegram"));
      expect(hasTelegramInGraph).toBe(true);
      expect(result.plan.integrations.some((i) => i.toLowerCase().includes("telegram"))).toBe(true);
    });

    it("Part 4 Case B: 'Send the summary to Slack instead of Telegram.'", async () => {
      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Every morning summarize AI news. Send the summary to Slack instead of Telegram.",
      });

      expect(result.validation.isValid).toBe(true);

      const hasTelegramInGraph = result.workflow.nodes.some((n) => n.id.includes("telegram") || n.data.label.toLowerCase().includes("telegram"));
      expect(hasTelegramInGraph).toBe(false);

      expect(result.plan.integrations.some((i) => i.toLowerCase().includes("telegram"))).toBe(false);
      expect(result.plan.credentialsNeeded.some((c) => c.toLowerCase().includes("telegram"))).toBe(false);

      const hasSlackInGraph = result.workflow.nodes.some((n) => n.id.includes("slack") || n.data.label.toLowerCase().includes("slack"));
      expect(hasSlackInGraph).toBe(true);
      expect(result.plan.integrations.some((i) => i.toLowerCase().includes("slack"))).toBe(true);
    });

    it("Part 4 Case C: 'Do not use AI.'", async () => {
      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Fetch weather via HTTP every hour and post to Slack. Do not use AI.",
      });

      expect(result.validation.isValid).toBe(true);

      const hasAiInGraph = result.workflow.nodes.some((n) => n.id.includes("ai") || n.data.label.toLowerCase().includes("ai agent"));
      expect(hasAiInGraph).toBe(false);

      expect(result.plan.credentialsNeeded.some((c) => c.toLowerCase().includes("ai provider"))).toBe(false);
      expect(result.plan.integrations.some((i) => i.toLowerCase().includes("openai"))).toBe(false);
    });

    it("Part 5: Complex non-deterministic prompt", async () => {
      const prompt = "Every weekday at 9 AM, fetch AI and technology news from an HTTP API, filter out irrelevant articles, summarize the remaining articles using AI, format the result, and send it to Telegram. Do not use Slack.";
      const result = await WorkflowGenerationService.generateWorkflow({ prompt });

      expect(result.validation.isValid).toBe(true);
      expect(result.plan.forbiddenNodes).toContain("slack");
      expect(result.plan.integrations.some((i) => i.toLowerCase().includes("slack"))).toBe(false);
      expect(result.workflow.nodes.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("7. Provenance & Gemini Fallback Diagnostics", () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      process.env = { ...originalEnv };
      vi.restoreAllMocks();
    });

    it("A. Gemini success: returns mode = 'gemini-3.8-flash', fallback = false", async () => {
      process.env.GEMINI_API_KEY = "test-valid-key";
      const validGraphJson = JSON.stringify({
        name: "Test Gemini Workflow",
        description: "Generated by Gemini",
        nodes: [
          { id: "node-1", definitionId: "manual-trigger", label: "Manual Trigger" },
          { id: "node-2", definitionId: "telegram", label: "Telegram Alert" },
        ],
        edges: [
          { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        ],
      });

      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              { content: { parts: [{ text: validGraphJson }] } },
            ],
          }),
        } as Response;
      });

      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Manual trigger then send Telegram alert",
      });

      expect(result.mode).toBe("gemini-3.8-flash");
      expect(result.fallback).toBe(false);
      expect(result.fallbackReason).toBeNull();
      expect(result.fallbackMessage).toBeNull();
    });

    it("B. Gemini HTTP 503: returns mode = 'offline-generator', fallback = true, fallbackReason = 'gemini_unavailable'", async () => {
      process.env.GEMINI_API_KEY = "test-valid-key";
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 503,
          text: async () => "Service Unavailable",
        } as Response;
      });

      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Manual trigger then send Telegram alert",
      });

      expect(result.mode).toBe("offline-generator");
      expect(result.fallback).toBe(true);
      expect(result.fallbackReason).toBe("gemini_unavailable");
      expect(result.fallbackMessage).toBe("Gemini is temporarily unavailable, so Nori used its deterministic fallback.");
    });

    it("C. Gemini timeout: returns fallback = true, fallbackReason = 'gemini_unavailable'", async () => {
      process.env.GEMINI_API_KEY = "test-valid-key";
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        throw new Error("AbortError: operation timed out");
      });

      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Manual trigger then send Telegram alert",
      });

      expect(result.fallback).toBe(true);
      expect(result.fallbackReason).toBe("gemini_unavailable");
      expect(result.fallbackMessage).toContain("Gemini is temporarily unavailable");
    });

    it("D. Missing API key: returns fallback = true, fallbackReason = 'gemini_not_configured'", async () => {
      delete process.env.GEMINI_API_KEY;
      delete process.env.GOOGLE_API_KEY;
      delete process.env.OPENAI_API_KEY;

      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Manual trigger then send Telegram alert",
      });

      expect(result.fallback).toBe(true);
      expect(result.fallbackReason).toBe("gemini_not_configured");
      expect(result.fallbackMessage).toContain("Gemini API key is not configured");
    });

    it("E. Invalid API key: returns fallback = true, fallbackReason = 'gemini_auth_error'", async () => {
      process.env.GEMINI_API_KEY = "invalid-key";
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return {
          ok: false,
          status: 400,
          text: async () => JSON.stringify({ error: { message: "API key not valid." } }),
        } as Response;
      });

      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Manual trigger then send Telegram alert",
      });

      expect(result.fallback).toBe(true);
      expect(result.fallbackReason).toBe("gemini_auth_error");
      expect(result.fallbackMessage).toContain("Gemini authentication failed");
    });

    it("F. Malformed Gemini response: returns fallback = true, fallbackReason = 'gemini_invalid_response'", async () => {
      process.env.GEMINI_API_KEY = "test-valid-key";
      vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            candidates: [
              { content: { parts: [{ text: "{ malformed json ... }" }] } },
            ],
          }),
        } as Response;
      });

      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "Manual trigger then send Telegram alert",
      });

      expect(result.fallback).toBe(true);
      expect(result.fallbackReason).toBe("gemini_invalid_response");
      expect(result.fallbackMessage).toContain("Gemini generated an invalid response");
    });
  });
});
