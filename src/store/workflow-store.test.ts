import { beforeEach, describe, expect, it } from "vitest";
import { useWorkflowStore } from "@/store/workflow-store";

function resetStore() {
  useWorkflowStore.setState({ workflows: [], hydrated: true, loading: false, error: null });
}

describe("workflow-store Phase 2", () => {
  beforeEach(resetStore);

  it("creates a draft workflow with a stable id and empty canvas", () => {
    const id = useWorkflowStore
      .getState()
      .createWorkflow({ name: "  Inbound Triage  " });

    const workflow = useWorkflowStore
      .getState()
      .workflows.find((w) => w.id === id);
    expect(workflow).toBeDefined();
    expect(workflow?.name).toBe("Inbound Triage");
    expect(workflow?.status).toBe("draft");
    expect(workflow?.createdAt).toBeTruthy();
    expect(workflow?.savedAt).toBeNull();
    expect(workflow?.nodes).toEqual([]);
    expect(workflow?.edges).toEqual([]);
  });

  it("falls back to a default name", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    expect(
      useWorkflowStore.getState().workflows.find((w) => w.id === id)?.name,
    ).toBe("Untitled Workflow");
  });

  it("updates content and bumps updatedAt", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    const before = useWorkflowStore.getState().workflows[0].updatedAt;

    useWorkflowStore
      .getState()
      .updateWorkflowContent(id, { name: "Renamed", description: "Hi" });

    const workflow = useWorkflowStore.getState().workflows[0];
    expect(workflow.name).toBe("Renamed");
    expect(workflow.description).toBe("Hi");
    expect(workflow.updatedAt >= before).toBe(true);
  });

  it("duplicates a workflow with remapped node/edge ids", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useWorkflowStore.getState().updateWorkflowContent(id, {
      name: "Original",
      nodes: [
        { id: "a", position: { x: 0, y: 0 }, data: {} } as never,
        { id: "b", position: { x: 100, y: 0 }, data: {} } as never,
      ],
      edges: [{ id: "e1", source: "a", target: "b" }] as never,
    });

    const copyId = useWorkflowStore.getState().duplicateWorkflow(id);
    const copy = useWorkflowStore
      .getState()
      .workflows.find((w) => w.id === copyId);

    expect(copy).toBeDefined();
    expect(copy?.name).toBe("Original (copy)");
    expect(copy?.status).toBe("draft");
    expect(copy?.nodes).toHaveLength(2);
    expect(copy?.nodes[0].id).not.toBe("a");
    expect(copy?.edges[0].source).toBe(copy?.nodes[0].id);
    expect(copy?.edges[0].target).toBe(copy?.nodes[1].id);
    expect(copy?.edges[0].source).not.toBe("a");
  });

  it("returns null when duplicating a missing workflow", () => {
    expect(useWorkflowStore.getState().duplicateWorkflow("nope")).toBeNull();
  });

  it("deletes a workflow", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useWorkflowStore.getState().deleteWorkflow(id);
    expect(useWorkflowStore.getState().workflows).toHaveLength(0);
  });

  it("sets workflow status", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useWorkflowStore.getState().setWorkflowStatus(id, "published");
    expect(useWorkflowStore.getState().workflows[0].status).toBe("published");
  });

  it("uses the hydrated flag to signal persistence readiness", () => {
    expect(useWorkflowStore.getState().hydrated).toBe(true);
    useWorkflowStore.setState({ hydrated: false });
    expect(useWorkflowStore.getState().hydrated).toBe(false);
    useWorkflowStore.setState({ hydrated: true });
    expect(useWorkflowStore.getState().hydrated).toBe(true);
  });

  it("fetches workflows into store and sets hydrated flag", async () => {
    useWorkflowStore.setState({ workflows: [], hydrated: false });
    const list = await useWorkflowStore.getState().fetchWorkflows();
    expect(list.length).toBeGreaterThan(0);
    expect(useWorkflowStore.getState().hydrated).toBe(true);
  });

  it("saves workflow to server and updates savedAt timestamp", async () => {
    const id = await useWorkflowStore.getState().createWorkflowAsync({ name: "Server Save Test" });
    const saved = await useWorkflowStore.getState().saveWorkflowToServer(id, { name: "Persisted Title" });
    expect(saved).not.toBeNull();
    expect(saved?.name).toBe("Persisted Title");
    expect(saved?.savedAt).toBeTruthy();
  });
});