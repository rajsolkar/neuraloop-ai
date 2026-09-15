import { describe, it, expect } from "vitest";
import { sanitizeEdges, sanitizeGraph } from "./serialize";
import { createWorkflowNode } from "./create-node";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

describe("React Flow Edge Rendering & Graph Integrity Sanitizer Tests", () => {
  describe("1. Invalid Edge Removal (Missing Node References)", () => {
    it("should remove edges whose source node does not exist", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "node-1";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "missing-source", target: "node-1" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1]);
      expect(cleanEdges).toHaveLength(0);
    });

    it("should remove edges whose target node does not exist", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "node-1";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "node-1", target: "missing-target" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1]);
      expect(cleanEdges).toHaveLength(0);
    });

    it("should retain valid edges connecting existing nodes", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "node-1";
      const n2 = createWorkflowNode("slack", { x: 100, y: 0 });
      n2.id = "node-2";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "node-1", target: "node-2" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1, n2]);
      expect(cleanEdges).toHaveLength(1);
      expect(cleanEdges[0].id).toBe("e1");
    });
  });

  describe("2. Self-Loop Prevention", () => {
    it("should strip self-loop edges where source === target", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "node-1";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "node-1", target: "node-1" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1]);
      expect(cleanEdges).toHaveLength(0);
    });
  });

  describe("3. Duplicate Edge Prevention", () => {
    it("should strip duplicate edges with duplicate IDs", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "node-1";
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.id = "node-2";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "node-1", target: "node-2" },
        { id: "e1", source: "node-1", target: "node-2" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1, n2]);
      expect(cleanEdges).toHaveLength(1);
    });

    it("should strip duplicate edges connecting the exact same handles", () => {
      const n1 = createWorkflowNode("if", { x: 0, y: 0 });
      n1.id = "node-1";
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.id = "node-2";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "node-1", sourceHandle: "true", target: "node-2", targetHandle: "in" },
        { id: "e2", source: "node-1", sourceHandle: "true", target: "node-2", targetHandle: "in" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1, n2]);
      expect(cleanEdges).toHaveLength(1);
      expect(cleanEdges[0].id).toBe("e1");
    });

    it("should allow distinct handle connections (e.g. TRUE path and FALSE path)", () => {
      const n1 = createWorkflowNode("if", { x: 0, y: 0 });
      n1.id = "node-1";
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.id = "node-2";
      const n3 = createWorkflowNode("slack", { x: 100, y: 100 });
      n3.id = "node-3";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "node-1", sourceHandle: "true", target: "node-2", targetHandle: "in" },
        { id: "e2", source: "node-1", sourceHandle: "false", target: "node-3", targetHandle: "in" },
      ];

      const cleanEdges = sanitizeEdges(edges, [n1, n2, n3]);
      expect(cleanEdges).toHaveLength(2);
    });
  });

  describe("4. Node Deletion Edge Cleanup", () => {
    it("should automatically remove all incoming and outgoing edges when a node is deleted", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      n1.id = "n1";
      const n2 = createWorkflowNode("if", { x: 100, y: 0 });
      n2.id = "n2";
      const n3 = createWorkflowNode("email", { x: 200, y: 0 });
      n3.id = "n3";

      const edges: WorkflowEdge[] = [
        { id: "e1", source: "n1", target: "n2" },
        { id: "e2", source: "n2", target: "n3" },
      ];

      // Simulate deleting node n2
      const remainingNodes = [n1, n3];
      const cleanEdges = sanitizeEdges(edges, remainingNodes);

      expect(cleanEdges).toHaveLength(0); // Both e1 (target=n2) and e2 (source=n2) are purged!
    });
  });

  describe("5. AI Workflow Import / Regeneration Graph Integrity", () => {
    it("should purge stale edges and sanitize graph when importing AI generated workflows", () => {
      const oldNodes: WorkflowNode[] = [
        createWorkflowNode("manual-trigger", { x: 0, y: 0 }),
      ];
      oldNodes[0].id = "old-1";

      const aiNodes: WorkflowNode[] = [
        createWorkflowNode("webhook", { x: 0, y: 0 }),
        createWorkflowNode("email", { x: 100, y: 0 }),
      ];
      aiNodes[0].id = "ai-1";
      aiNodes[1].id = "ai-2";

      const mixedEdges: WorkflowEdge[] = [
        { id: "stale-1", source: "old-1", target: "ai-1" },
        { id: "valid-1", source: "ai-1", target: "ai-2" },
      ];

      const graph = sanitizeGraph({
        nodes: aiNodes,
        edges: mixedEdges,
      });

      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
      expect(graph.edges[0].id).toBe("valid-1");
    });
  });
});
