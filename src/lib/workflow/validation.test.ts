import { describe, expect, it } from "vitest";
import { WorkflowDefinitionSchema } from "./validation";
import { createWorkflowNode } from "./create-node";

describe("Workflow Zod Validation Schema", () => {
  it("passes a valid canonical workflow structure", () => {
    const nodeA = createWorkflowNode("webhook", { x: 0, y: 0 });
    const nodeB = createWorkflowNode("openai", { x: 200, y: 0 });
    const edge = {
      id: "e1",
      source: nodeA.id,
      target: nodeB.id,
      sourceHandle: "out",
      targetHandle: "in",
    };

    const validPayload = {
      name: "Triage Bot",
      description: "Auto triage inbound hooks",
      status: "draft",
      nodes: [nodeA, nodeB],
      edges: [edge],
    };

    const result = WorkflowDefinitionSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("rejects unsupported/unregistered node definition IDs", () => {
    const invalidNode = createWorkflowNode("unknown-def", { x: 0, y: 0 });
    const payload = {
      name: "Bad Def",
      description: "",
      status: "draft",
      nodes: [invalidNode],
      edges: [],
    };

    const result = WorkflowDefinitionSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Unsupported or unregistered node definition ID");
    }
  });

  it("rejects duplicate node IDs", () => {
    const nodeA = createWorkflowNode("schedule", { x: 0, y: 0 });
    const nodeB = { ...nodeA }; // Duplicate node ID

    const payload = {
      name: "Dup Nodes",
      description: "",
      status: "draft",
      nodes: [nodeA, nodeB],
      edges: [],
    };

    const result = WorkflowDefinitionSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Duplicate node ID detected");
    }
  });

  it("rejects orphan edges referencing non-existent node IDs", () => {
    const nodeA = createWorkflowNode("webhook", { x: 0, y: 0 });
    const orphanEdge = {
      id: "e1",
      source: nodeA.id,
      target: "missing-node-id",
    };

    const payload = {
      name: "Orphan Edge",
      description: "",
      status: "draft",
      nodes: [nodeA],
      edges: [orphanEdge],
    };

    const result = WorkflowDefinitionSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Orphan edge target node ID not found");
    }
  });

  it("rejects self-loop connections", () => {
    const nodeA = createWorkflowNode("webhook", { x: 0, y: 0 });
    const selfLoopEdge = {
      id: "e1",
      source: nodeA.id,
      target: nodeA.id,
    };

    const payload = {
      name: "Self Loop",
      description: "",
      status: "draft",
      nodes: [nodeA],
      edges: [selfLoopEdge],
    };

    const result = WorkflowDefinitionSchema.safeParse(payload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("Self-loop connection rejected");
    }
  });
});
