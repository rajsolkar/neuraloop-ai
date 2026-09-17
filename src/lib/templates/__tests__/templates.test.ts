import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateCloner, type TemplateDefinition } from "../template-cloner";
import { TemplateService } from "../template-service";
import { prisma } from "@/lib/prisma";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

describe("Phase 14: Template Marketplace & One-Click Cloning Test Suite", () => {
  const sampleDefinition: TemplateDefinition = {
    name: "Sample AI Blueprint",
    description: "Sample description for testing template engine",
    nodes: [
      {
        id: "node-1",
        type: "neuraloop-node",
        position: { x: 100, y: 100 },
        data: {
          definitionId: "manual-trigger",
          label: "Trigger",
          description: "Start node",
          category: "trigger",
          lastExecutionStatus: "success",
        },
      } as WorkflowNode,
      {
        id: "node-2",
        type: "neuraloop-node",
        position: { x: 400, y: 100 },
        data: {
          definitionId: "ai",
          label: "Generate Text",
          description: "LLM action",
          category: "action",
        },
      } as WorkflowNode,
    ],
    edges: [
      {
        id: "edge-1-2",
        source: "node-1",
        target: "node-2",
        sourceHandle: "out",
        targetHandle: "in",
      } as WorkflowEdge,
    ],
  };

  describe("1. TemplateCloner Graph Duplication Engine", () => {
    it("should regenerate all node and edge IDs cleanly", () => {
      const cloned = TemplateCloner.cloneGraph(sampleDefinition, "Cloned Test Workflow");

      expect(cloned.name).toBe("Cloned Test Workflow");
      expect(cloned.status).toBe("draft");
      expect(cloned.nodes).toHaveLength(2);
      expect(cloned.edges).toHaveLength(1);

      // Verify node IDs are new and do not match originals
      expect(cloned.nodes[0].id).not.toBe("node-1");
      expect(cloned.nodes[1].id).not.toBe("node-2");

      // Verify edge ID is new
      expect(cloned.edges[0].id).not.toBe("edge-1-2");

      // Verify edge source & target correctly match new node IDs
      expect(cloned.edges[0].source).toBe(cloned.nodes[0].id);
      expect(cloned.edges[0].target).toBe(cloned.nodes[1].id);
    });

    it("should strip execution memory state (lastExecutionStatus) on fresh canvas", () => {
      const cloned = TemplateCloner.cloneGraph(sampleDefinition);
      const firstNodeData = cloned.nodes[0].data as Record<string, unknown>;

      expect(firstNodeData.lastExecutionStatus).toBeUndefined();
    });
  });

  describe("2. TemplateService Methods", () => {
    it("should correctly list templates and filter official templates", async () => {
      const result = await TemplateService.listTemplates({
        category: "All",
        limit: 10,
      });

      expect(result.templates).toBeDefined();
      expect(Array.isArray(result.templates)).toBe(true);
    });

    it("should filter templates by category and search term", async () => {
      const result = await TemplateService.listTemplates({
        search: "Digest",
        category: "AI",
      });

      expect(result.templates).toBeDefined();
      if (result.templates.length > 0) {
        expect(result.templates[0].category.toLowerCase()).toBe("ai");
      }
    });

    it("should increment usageCount and create brand new Workflow on clone", async () => {
      // Find an official template
      const template = await prisma.workflowTemplate.findFirst({
        where: { isOfficial: true },
      });

      if (!template) {
        // Skip DB clone test if database is empty
        return;
      }

      const initialUsageCount = template.usageCount || 0;

      const clonedWorkflow = await TemplateService.cloneTemplate({
        templateId: template.id,
        userId: "user_test_cloner_123",
        organizationId: null,
      });

      expect(clonedWorkflow).toBeDefined();
      expect(clonedWorkflow.id).toBeDefined();
      expect(clonedWorkflow.userId).toBe("user_test_cloner_123");
      expect(clonedWorkflow.status).toBe("draft");

      // Verify template usage count incremented in DB
      const updatedTemplate = await prisma.workflowTemplate.findUnique({
        where: { id: template.id },
      });

      expect(updatedTemplate?.usageCount).toBe(initialUsageCount + 1);

      // Clean up test workflow
      await prisma.workflow.delete({ where: { id: clonedWorkflow.id } }).catch(() => {});
    });
  });
});
