import { describe, it, expect, vi, beforeEach } from "vitest";
import { NODE_KNOWLEDGE_SPECS, ARCHITECTURE_PATTERNS, OFFICIAL_TEMPLATE_SPECS } from "../workflow-knowledge-base";
import { TemplateMatcher } from "../template-matcher";
import { WorkflowPlanner } from "../workflow-planner";
import { WorkflowValidator } from "../workflow-validator";
import { WorkflowOptimizer } from "../workflow-optimizer";
import { ArchitectureScorer } from "../architecture-scorer";
import { WorkflowExplainer } from "../workflow-explainer";
import { WorkflowRefiner } from "../workflow-refiner";
import { WorkflowGenerationService } from "../workflow-generator";

describe("Phase 20: AI Workflow Architect v2 Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. Workflow Knowledge Base Specifications", () => {
    it("should contain specifications for all 20 registered nodes", () => {
      const keys = Object.keys(NODE_KNOWLEDGE_SPECS);
      expect(keys.length).toBeGreaterThanOrEqual(20);
      expect(NODE_KNOWLEDGE_SPECS["webhook"]).toBeDefined();
      expect(NODE_KNOWLEDGE_SPECS["telegram"]).toBeDefined();
      expect(NODE_KNOWLEDGE_SPECS["google-sheets"]).toBeDefined();
      expect(NODE_KNOWLEDGE_SPECS["loop"]).toBeDefined();
      expect(NODE_KNOWLEDGE_SPECS["switch"]).toBeDefined();
      expect(NODE_KNOWLEDGE_SPECS["transform"]).toBeDefined();
    });

    it("should contain specifications for 18 official marketplace templates and 5 patterns", () => {
      expect(OFFICIAL_TEMPLATE_SPECS.length).toBe(18);
      expect(ARCHITECTURE_PATTERNS.length).toBe(5);
    });
  });

  describe("2. Tiered Template Similarity Adaptation", () => {
    it("should return matchMode 'useTemplate' for high similarity score (>= 0.85)", () => {
      const result = TemplateMatcher.matchAndAdapt("Daily AI Summary telegram productivity schedule tip");
      expect(result.matched).toBe(true);
      expect(result.matchMode).toBe("useTemplate");
      expect(result.similarityScore).toBeGreaterThanOrEqual(0.85);
      expect(result.adaptedWorkflow).toBeDefined();
    });

    it("should return matchMode 'useTemplateAsStartingPoint' for moderate similarity (0.60 - 0.84)", () => {
      const result = TemplateMatcher.matchAndAdapt("Daily AI Summary and send telegram update");
      expect(result.matched).toBe(true);
      expect(result.matchMode).toBe("useTemplateAsStartingPoint");
    });

    it("should return matchMode 'generateFromScratch' for low similarity (< 0.60)", () => {
      const result = TemplateMatcher.matchAndAdapt("custom internal satellite data processing queue");
      expect(result.matched).toBe(false);
      expect(result.matchMode).toBe("generateFromScratch");
    });
  });

  describe("3. Credential-Aware Multi-Stage Planner", () => {
    it("should bind GitHub OAuth connection when GitHub OAuth is active in user context", () => {
      const plan = WorkflowPlanner.createPlan("Monitor GitHub PRs and send Slack summary", {
        availableOAuthConnections: ["github", "slack"],
      });

      expect(plan.actions).toContain("HTTP Request Pro");
      expect(plan.integrations).toContain("GitHub API");
      expect(plan.credentialsNeeded.some((c) => c.includes("Active GitHub OAuth Connection"))).toBe(true);
    });

    it("should flag required connection when OAuth connection is missing in user context", () => {
      const plan = WorkflowPlanner.createPlan("Monitor GitHub PRs and send Slack summary", {
        availableOAuthConnections: [],
      });

      expect(plan.credentialsNeeded.some((c) => c.includes("Required Connection: GitHub OAuth Connection"))).toBe(true);
    });
  });

  describe("4. Graph Validator & Non-Destructive Optimizer", () => {
    it("should validate valid workflow graph with 0 errors", () => {
      const workflow = {
        name: "Test Flow",
        description: "Valid graph",
        nodes: [
          { id: "node-1", definitionId: "schedule" as const, label: "Schedule", config: {} },
          { id: "node-2", definitionId: "ai" as const, label: "AI Process", config: { prompt: "Test prompt" } },
        ],
        edges: [{ id: "e1", source: "node-1", target: "node-2" }],
      };

      const result = WorkflowValidator.validateGraph(workflow);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return non-destructive optimization suggestions without mutating graph", () => {
      const workflow = {
        name: "Test Flow",
        description: "Graph with consecutive AI nodes",
        nodes: [
          { id: "node-1", definitionId: "manual-trigger" as const, label: "Trigger", config: {} },
          { id: "node-2", definitionId: "ai" as const, label: "AI 1", config: {} },
          { id: "node-3", definitionId: "ai" as const, label: "AI 2", config: {} },
        ],
        edges: [
          { id: "e1", source: "node-1", target: "node-2" },
          { id: "e2", source: "node-2", target: "node-3" },
        ],
      };

      const result = WorkflowOptimizer.optimizeGraph(workflow);
      expect(result.optimizations.hasOptimizations).toBe(true);
      expect(result.optimizations.suggestions[0].type).toBe("merge_ai_nodes");
      expect(result.workflow.nodes.length).toBe(3); // Unmodified (non-destructive)
    });
  });

  describe("5. Architecture Scorer", () => {
    it("should compute a high architecture score for a well-structured graph", () => {
      const workflow = {
        name: "High Quality Workflow",
        description: "Valid graph",
        nodes: [
          { id: "node-1", definitionId: "schedule" as const, label: "Schedule", config: {} },
          { id: "node-2", definitionId: "ai" as const, label: "AI", config: { prompt: "Summarize" } },
        ],
        edges: [{ id: "e1", source: "node-1", target: "node-2" }],
      };

      const result = ArchitectureScorer.computeScore(workflow);
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.feedback).toBeDefined();
    });
  });

  describe("6. Natural Language Explainer & Cost Estimation", () => {
    it("should compute accurate AI cost estimates and step descriptions", () => {
      const workflow = {
        name: "AI Flow",
        description: "AI processing flow",
        nodes: [
          { id: "node-1", definitionId: "schedule" as const, label: "Schedule", config: {} },
          { id: "node-2", definitionId: "ai" as const, label: "AI Step 1", config: {} },
          { id: "node-3", definitionId: "ai" as const, label: "AI Step 2", config: {} },
        ],
        edges: [],
      };

      const explanation = WorkflowExplainer.explainWorkflow(workflow);
      expect(explanation.steps).toHaveLength(3);
      expect(explanation.estimatedCost).toBe(0.007); // 2 AI nodes * $0.0035
    });
  });

  describe("7. Conversational 'Ask Nori' Refinements", () => {
    it("should replace Telegram node with Discord node when user requests", () => {
      const current = {
        name: "Alert Workflow",
        description: "Alerts via Telegram",
        nodes: [
          { id: "node-1", definitionId: "webhook" as const, label: "Webhook", config: {} },
          { id: "node-2", definitionId: "telegram" as const, label: "Send Telegram Alert", config: { chatId: "@channel" } },
        ],
        edges: [{ id: "e1", source: "node-1", target: "node-2" }],
      };

      const refined = WorkflowRefiner.refineWorkflow(current, "Replace Telegram with Discord");
      expect(refined.modified).toBe(true);
      expect(refined.workflow.nodes[1].definitionId).toBe("discord");
    });
  });
});
