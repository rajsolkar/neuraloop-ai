import { describe, expect, it } from "vitest";
import {
  HttpRequestConfigSchema,
  OpenAiConfigSchema,
  SlackConfigSchema,
  EmailConfigSchema,
  ScheduleConfigSchema,
  WebhookConfigSchema,
  IfConfigSchema,
  FilterConfigSchema,
  DelayConfigSchema,
  getDefaultNodeConfig,
  validateNodeConfig,
} from "./config-schemas";
import { WorkflowDefinitionSchema } from "./validation";
import { createWorkflowNode } from "./create-node";

describe("Phase 3 Node Configuration Schemas & Validation", () => {
  it("generates defaults for all 10 node types", () => {
    const definitions = [
      "manual-trigger",
      "webhook",
      "schedule",
      "http-request",
      "openai",
      "slack",
      "email",
      "if",
      "filter",
      "delay",
    ];

    for (const defId of definitions) {
      const defaultConfig = getDefaultNodeConfig(defId);
      expect(defaultConfig).toBeDefined();
      const validation = validateNodeConfig(defId, defaultConfig);
      expect(validation.success).toBe(true);
    }
  });

  describe("HTTP Request Config", () => {
    it("validates a valid HTTP request configuration", () => {
      const valid = {
        method: "POST",
        url: "https://api.example.com/v1/data",
        queryParams: [{ key: "limit", value: "10" }],
        headers: [{ key: "Content-Type", value: "application/json" }],
        bodyType: "json",
        body: '{"foo":"bar"}',
      };
      const result = HttpRequestConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects invalid HTTP method", () => {
      const invalid = { method: "INVALID_METHOD", url: "https://example.com" };
      const result = HttpRequestConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("OpenAI Config", () => {
    it("validates a valid OpenAI configuration", () => {
      const valid = {
        model: "gpt-4o",
        prompt: "Summarize text",
        temperature: 0.5,
        maxTokens: 500,
      };
      const result = OpenAiConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects temperature out of bounds", () => {
      const invalid = { model: "gpt-4o", prompt: "Hi", temperature: 3.5 };
      const result = OpenAiConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Slack Config", () => {
    it("validates Slack channel and message", () => {
      const valid = { channel: "#sales", message: "New lead alert!" };
      const result = SlackConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("Email Config", () => {
    it("validates Email configuration", () => {
      const valid = {
        to: "user@example.com",
        cc: "team@example.com",
        bcc: "",
        subject: "Daily Report",
        body: "Hello world",
      };
      const result = EmailConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("Schedule Config", () => {
    it("validates frequency and cron expression", () => {
      const valid = {
        frequency: "cron",
        cronExpression: "0 9 * * 1-5",
        time: "09:00",
        timezone: "UTC",
      };
      const result = ScheduleConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("Webhook Config", () => {
    it("validates webhook path and method", () => {
      const valid = {
        method: "POST",
        path: "/webhooks/incoming",
        responseMode: "on_received",
      };
      const result = WebhookConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("IF Node Config & TRUE/FALSE Handles", () => {
    it("validates IF condition rule", () => {
      const valid = {
        condition: {
          field: "score",
          operator: "greater_than",
          value: "80",
        },
      };
      const result = IfConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("validates workflow graph containing IF node with TRUE and FALSE branch edges", () => {
      const ifNode = createWorkflowNode("if", { x: 0, y: 0 });
      const slackNode = createWorkflowNode("slack", { x: 200, y: -50 });
      const emailNode = createWorkflowNode("email", { x: 200, y: 50 });

      const trueEdge = {
        id: "e-true",
        source: ifNode.id,
        target: slackNode.id,
        sourceHandle: "true",
        targetHandle: "in",
      };

      const falseEdge = {
        id: "e-false",
        source: ifNode.id,
        target: emailNode.id,
        sourceHandle: "false",
        targetHandle: "in",
      };

      const workflowGraph = {
        name: "IF Branching Pipeline",
        description: "Branch to Slack or Email based on condition",
        status: "draft",
        nodes: [ifNode, slackNode, emailNode],
        edges: [trueEdge, falseEdge],
      };

      const result = WorkflowDefinitionSchema.safeParse(workflowGraph);
      expect(result.success).toBe(true);
    });

    it("rejects IF node edges with invalid sourceHandle names", () => {
      const ifNode = createWorkflowNode("if", { x: 0, y: 0 });
      const slackNode = createWorkflowNode("slack", { x: 200, y: 0 });

      const invalidEdge = {
        id: "e-invalid",
        source: ifNode.id,
        target: slackNode.id,
        sourceHandle: "invalid_handle_name",
        targetHandle: "in",
      };

      const workflowGraph = {
        name: "Bad IF Handle",
        description: "",
        status: "draft",
        nodes: [ifNode, slackNode],
        edges: [invalidEdge],
      };

      const result = WorkflowDefinitionSchema.safeParse(workflowGraph);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid IF node sourceHandle: invalid_handle_name');
      }
    });
  });

  describe("Filter Config", () => {
    it("validates filter condition rule", () => {
      const valid = {
        condition: { field: "status", operator: "equals", value: "active" },
      };
      const result = FilterConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe("Delay Config", () => {
    it("validates positive duration and unit", () => {
      const valid = { duration: 10, unit: "minutes" };
      const result = DelayConfigSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects negative or zero duration", () => {
      const invalid = { duration: -5, unit: "seconds" };
      const result = DelayConfigSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("Server Validation Integration", () => {
    it("rejects a workflow where node.data.config violates node Zod schema", () => {
      const badOpenAiNode = {
        ...createWorkflowNode("openai", { x: 0, y: 0 }),
        data: {
          definitionId: "openai",
          label: "OpenAI",
          description: "",
          category: "action" as const,
          config: {
            model: "gpt-4o",
            prompt: "Hi",
            temperature: 99, // Invalid temperature > 2
          },
        },
      };

      const workflowGraph = {
        name: "Bad Config Graph",
        description: "",
        status: "draft",
        nodes: [badOpenAiNode],
        edges: [],
      };

      const result = WorkflowDefinitionSchema.safeParse(workflowGraph);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Invalid node config for openai");
      }
    });
  });
});
