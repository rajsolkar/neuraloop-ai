import { describe, it, expect } from "vitest";
import { mapIntentToNodeDefinition } from "./node-mapping";
import { applyAutoLayout } from "./auto-layout";
import { GeneratedWorkflowSchema } from "./schema";
import {
  WorkflowGenerationService,
  checkRateLimit,
  generateOfflineWorkflow,
} from "./workflow-generator";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

describe("Phase 6 — AI Workflow Generation Unit & Integration Tests", () => {
  describe("1. Node Mapping Layer", () => {
    it("should map webhook keywords to webhook definitionId", () => {
      const res = mapIntentToNodeDefinition("When an incoming webhook receives data");
      expect(res.definitionId).toBe("webhook");
      expect(res.category).toBe("trigger");
    });

    it("should map schedule keywords to schedule definitionId", () => {
      const res = mapIntentToNodeDefinition("Every day at 8 AM");
      expect(res.definitionId).toBe("schedule");
      expect(res.category).toBe("trigger");
    });

    it("should map decision keywords to if definitionId", () => {
      const res = mapIntentToNodeDefinition("check if lead score is above 80");
      expect(res.definitionId).toBe("if");
      expect(res.category).toBe("logic");
    });

    it("should map slack keywords to slack definitionId", () => {
      const res = mapIntentToNodeDefinition("post a message to slack channel");
      expect(res.definitionId).toBe("slack");
      expect(res.category).toBe("action");
    });
  });

  describe("2. Structured Output Zod Schema Validation", () => {
    it("should validate a correct generated workflow graph", () => {
      const validGraph = {
        name: "Lead Processing Workflow",
        description: "Ingests lead and evaluates score",
        nodes: [
          { id: "node-1", definitionId: "webhook", label: "Webhook Trigger", config: { path: "/lead" } },
          { id: "node-2", definitionId: "if", label: "Check Score", config: { fieldPath: "score", operator: ">", value: "80" } },
        ],
        edges: [
          { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        ],
      };

      const parsed = GeneratedWorkflowSchema.parse(validGraph);
      expect(parsed.name).toBe("Lead Processing Workflow");
      expect(parsed.nodes).toHaveLength(2);
    });

    it("should reject malformed workflow JSON (missing name)", () => {
      const invalidGraph = {
        description: "No name provided",
        nodes: [],
      };

      expect(() => GeneratedWorkflowSchema.parse(invalidGraph)).toThrow();
    });

    it("should reject invalid node definitionId", () => {
      const invalidNodeGraph = {
        name: "Bad Node Test",
        nodes: [
          { id: "n1", definitionId: "non-existent-type", label: "Unknown Node" },
        ],
      };

      expect(() => GeneratedWorkflowSchema.parse(invalidNodeGraph)).toThrow();
    });
  });

  describe("3. Algorithmic Auto-Layout Engine", () => {
    it("should assign left-to-right x positions and separate IF branches vertically", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "n1";
      const n2 = createWorkflowNode("if", { x: 0, y: 0 });
      n2.id = "n2";
      const n3 = createWorkflowNode("email", { x: 0, y: 0 });
      n3.id = "n3";
      const n4 = createWorkflowNode("slack", { x: 0, y: 0 });
      n4.id = "n4";

      const nodes: WorkflowNode[] = [n1, n2, n3, n4];

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "n1", target: "n2", sourceHandle: "out", targetHandle: "in" },
        { id: "e2", source: "n2", target: "n3", sourceHandle: "true", targetHandle: "in" },
        { id: "e3", source: "n2", target: "n4", sourceHandle: "false", targetHandle: "in" },
      ];

      const layout = applyAutoLayout(nodes, edges);

      const layoutN1 = layout.nodes.find((n) => n.id === "n1")!;
      const layoutN2 = layout.nodes.find((n) => n.id === "n2")!;
      const layoutN3 = layout.nodes.find((n) => n.id === "n3")!;
      const layoutN4 = layout.nodes.find((n) => n.id === "n4")!;

      expect(layoutN1.position.x).toBe(100);
      expect(layoutN2.position.x).toBeGreaterThan(layoutN1.position.x);
      expect(layoutN3.position.x).toBeGreaterThan(layoutN2.position.x);
      expect(layoutN4.position.x).toBeGreaterThan(layoutN2.position.x);

      // TRUE branch n3 and FALSE branch n4 must be vertically separated
      expect(Math.abs(layoutN3.position.y - layoutN4.position.y)).toBeGreaterThanOrEqual(140);
    });
  });

  describe("4. Rate Limiting", () => {
    it("should allow up to 20 requests and block the 21st request", () => {
      const clientId = `test-client-${Math.random()}`;

      for (let i = 0; i < 20; i++) {
        const check = checkRateLimit(clientId);
        expect(check.allowed).toBe(true);
      }

      const blockedCheck = checkRateLimit(clientId);
      expect(blockedCheck.allowed).toBe(false);
      expect(blockedCheck.remaining).toBe(0);
    });
  });

  describe("5. Offline Generator & Case Scenarios", () => {
    it("Case 1 & 2: Webhook -> IF -> Email (TRUE) / Slack (FALSE)", () => {
      const graph = generateOfflineWorkflow(
        "When a webhook receives a lead, check if score is above 80, send an email if true, post to Slack if false.",
      );

      expect(graph.nodes.some((n) => n.definitionId === "webhook")).toBe(true);
      expect(graph.nodes.some((n) => n.definitionId === "if")).toBe(true);
      expect(graph.nodes.some((n) => n.definitionId === "email")).toBe(true);
      expect(graph.nodes.some((n) => n.definitionId === "slack")).toBe(true);

      const ifEdges = graph.edges.filter((e) => e.source.includes("2"));
      expect(ifEdges.some((e) => e.sourceHandle === "true")).toBe(true);
      expect(ifEdges.some((e) => e.sourceHandle === "false")).toBe(true);
    });

    it("Case 3: Schedule -> HTTP Request -> Slack", () => {
      const graph = generateOfflineWorkflow("Every day at 8 AM fetch weather data and post it to Slack.");

      expect(graph.nodes[0].definitionId).toBe("schedule");
      expect(graph.nodes[1].definitionId).toBe("http-request");
      expect(graph.nodes[2].definitionId).toBe("slack");
    });

    it("Case 4: Customer Signup -> Delay -> Welcome Email", () => {
      const graph = generateOfflineWorkflow("When a new customer signs up, wait 1 hour then send a welcome email.");

      expect(graph.nodes.some((n) => n.definitionId === "manual-trigger")).toBe(true);
      expect(graph.nodes.some((n) => n.definitionId === "delay")).toBe(true);
      expect(graph.nodes.some((n) => n.definitionId === "email")).toBe(true);
    });
  });

  describe("6. WorkflowGenerationService Integration Pipeline", () => {
    it("should generate a complete validated workflow with auto-layout and node default configs", async () => {
      const result = await WorkflowGenerationService.generateWorkflow({
        prompt: "When a webhook receives a lead, check if score > 80 and send email.",
        clientId: `client-test-${Math.random()}`,
      });

      expect(result.workflow.name).toBeDefined();
      expect(result.workflow.nodes.length).toBeGreaterThanOrEqual(2);
      expect(result.workflow.edges.length).toBeGreaterThanOrEqual(1);
      expect(result.generationId).toBeDefined();

      // Check node layout positions were populated
      for (const node of result.workflow.nodes) {
        expect(node.position.x).toBeGreaterThan(0);
        expect(node.position.y).toBeGreaterThan(0);
        expect(node.data.config).toBeDefined();
      }
    });

    it("should throw error on empty prompt", async () => {
      await expect(
        WorkflowGenerationService.generateWorkflow({
          prompt: "",
          clientId: `empty-test-${Math.random()}`,
        }),
      ).rejects.toThrow("PROMPT_REQUIRED");
    });
  });
});
