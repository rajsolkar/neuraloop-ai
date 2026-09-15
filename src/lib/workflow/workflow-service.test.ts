import { describe, expect, it } from "vitest";
import { WorkflowService } from "./workflow-service";
import { createWorkflowNode } from "./create-node";
import { sanitizeNodes } from "./serialize";

describe("WorkflowService & Versioning Foundation", () => {
  it("creates a workflow and initializes version 1", async () => {
    const workflow = await WorkflowService.createWorkflow({
      name: "Versioned Bot",
      description: "Testing initial version creation",
    });

    expect(workflow.id).toBeTruthy();
    expect(workflow.name).toBe("Versioned Bot");
    expect(workflow.status).toBe("draft");

    const versions = await WorkflowService.getWorkflowVersions(workflow.id);
    expect(versions).toHaveLength(1);
    expect(versions[0].version).toBe(1);
  });

  it("increments version number and preserves version snapshots on update", async () => {
    const created = await WorkflowService.createWorkflow({ name: "Doc Flow" });
    const node = createWorkflowNode("http-request", { x: 50, y: 50 });

    const updated = await WorkflowService.updateWorkflow(created.id, {
      name: "Doc Flow v2",
      nodes: [node],
      createVersion: true,
    });

    expect(updated.name).toBe("Doc Flow v2");
    expect(updated.nodes).toHaveLength(1);
    expect(updated.savedAt).toBeTruthy();

    const versions = await WorkflowService.getWorkflowVersions(created.id);
    expect(versions.length).toBeGreaterThanOrEqual(2);
    expect(versions[0].version).toBe(2);
  });

  it("duplicates a workflow with remapped node and edge IDs", async () => {
    const nodeA = createWorkflowNode("webhook", { x: 0, y: 0 });
    const nodeB = createWorkflowNode("slack", { x: 200, y: 0 });
    const edge = { id: "e1", source: nodeA.id, target: nodeB.id };

    const original = await WorkflowService.createWorkflow({
      name: "Original Pipeline",
      nodes: [nodeA, nodeB],
      edges: [edge],
    });

    const copy = await WorkflowService.duplicateWorkflow(original.id);
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe("Original Pipeline (copy)");
    expect(copy.nodes).toHaveLength(2);
    expect(copy.nodes[0].id).not.toBe(nodeA.id);
    expect(copy.edges[0].source).toBe(copy.nodes[0].id);
  });

  it("deletes a workflow and returns true", async () => {
    const created = await WorkflowService.createWorkflow({ name: "To Delete" });
    const deleted = await WorkflowService.deleteWorkflow(created.id);
    expect(deleted).toBe(true);

    const fetched = await WorkflowService.getWorkflow(created.id);
    expect(fetched).toBeNull();
  });

  it("sanitizes ephemeral React Flow properties before version persistence", () => {
    const rawNode = {
      ...createWorkflowNode("email", { x: 10, y: 10 }),
      selected: true,
      dragging: true,
      measured: { width: 250, height: 100 },
    };

    const sanitized = sanitizeNodes([rawNode]);
    expect(sanitized[0].selected).toBe(false);
    expect(sanitized[0].dragging).toBe(false);
    expect(sanitized[0].measured).toBeUndefined();
  });
});
