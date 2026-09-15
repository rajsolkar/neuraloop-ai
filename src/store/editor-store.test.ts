import { beforeEach, describe, expect, it } from "vitest";
import { useEditorStore } from "@/store/editor-store";
import {
  NODE_DEFINITIONS,
  NODE_CATEGORY_ORDER,
  getNodeDefinition,
} from "@/lib/workflow";
import { createWorkflowNode } from "@/lib/workflow";
import { useWorkflowStore } from "@/store/workflow-store";

function resetStore() {
  useWorkflowStore.setState({ workflows: [], hydrated: true, loading: false, error: null });
  useEditorStore.setState({
    workflowId: null,
    notFound: false,
    name: "Untitled Workflow",
    description: "",
    status: "draft",
    nodes: [],
    edges: [],
    past: [],
    future: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    dirty: false,
    lastSavedAt: null,
    dragStartSnapshot: null,
  });
}

describe("node library", () => {
  it("exposes a healthy registry of definitions", () => {
    expect(NODE_DEFINITIONS.length).toBe(10);
  });

  it("has unique definition ids", () => {
    const ids = NODE_DEFINITIONS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("sorts every definition into a known category", () => {
    for (const definition of NODE_DEFINITIONS) {
      expect(NODE_CATEGORY_ORDER).toContain(definition.category);
      expect(getNodeDefinition(definition.id)).toBe(definition);
    }
  });

  it("marks trigger-type definitions", () => {
    const triggers = NODE_DEFINITIONS.filter((d) => d.isTrigger);
    expect(triggers.map((t) => t.id).sort()).toEqual([
      "manual-trigger",
      "schedule",
      "webhook",
    ]);
  });
});

describe("editor-store", () => {
  beforeEach(resetStore);

  it("loads a workflow into the editor session", () => {
    const id = useWorkflowStore.getState().createWorkflow({ name: "Session" });
    useWorkflowStore.getState().updateWorkflowContent(id, {
      nodes: [createWorkflowNode("openai", { x: 10, y: 10 })],
      edges: [],
    });

    useEditorStore.getState().loadWorkflow(id);

    const state = useEditorStore.getState();
    expect(state.name).toBe("Session");
    expect(state.workflowId).toBe(id);
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0].selected).toBe(false);
    expect(state.dirty).toBe(false);
  });

  it("marks a missing workflow as not found", () => {
    useEditorStore.getState().loadWorkflow("missing");
    expect(useEditorStore.getState().notFound).toBe(true);
  });

  it("defers the not-found verdict until the collection hydrates", () => {
    useWorkflowStore.setState({ hydrated: false });
    useEditorStore.getState().loadWorkflow("missing");
    expect(useEditorStore.getState().notFound).toBe(false);
    expect(useEditorStore.getState().pendingWorkflowId).toBe("missing");

    // Rehydration resolves -> pending load re-runs and reports not found.
    useWorkflowStore.setState({ hydrated: true });
    expect(useEditorStore.getState().notFound).toBe(true);
    expect(useEditorStore.getState().pendingWorkflowId).toBeNull();
  });

  it("adds a node, selects it, and pushes history", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);

    const node = useEditorStore
      .getState()
      .addNode("openai", { x: 40, y: 40 });

    const state = useEditorStore.getState();
    expect(node).not.toBeNull();
    expect(state.nodes).toHaveLength(1);
    expect(state.nodes[0]).toMatchObject({
      data: { definitionId: "openai", category: "action" },
    });
    expect(state.nodes[0].selected).toBe(true);
    expect(state.selectedNodeId).toBe(node?.id);
    expect(state.dirty).toBe(true);
    expect(state.past).toHaveLength(1);
    expect(state.workflowId).not.toBeNull();
  });

  it("ignores unknown definition ids", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    expect(useEditorStore.getState().addNode("nope", { x: 0, y: 0 })).toBeNull();
    expect(useEditorStore.getState().nodes).toHaveLength(0);
  });

  it("undoes and redoes node additions", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    useEditorStore.getState().addNode("delay", { x: 0, y: 0 });
    expect(useEditorStore.getState().nodes).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nodes).toHaveLength(0);
    expect(useEditorStore.getState().dirty).toBe(true);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().nodes).toHaveLength(1);
  });

  it("undoes a node movement performed by dragging", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    const node = useEditorStore.getState().addNode("filter", { x: 0, y: 0 });
    if (!node) throw new Error("setup failed");

    useEditorStore.getState().onNodeDragStart();
    useEditorStore
      .getState()
      .updateNodePosition(node.id, { x: 300, y: 120 });
    useEditorStore.getState().onNodeDragStop();

    expect(useEditorStore.getState().nodes[0].position).toEqual({
      x: 300,
      y: 120,
    });

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().nodes[0].position).toEqual({ x: 0, y: 0 });
  });

  it("does not push history when a drag does not move anything", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    useEditorStore.getState().addNode("email", { x: 0, y: 0 });

    const before = useEditorStore.getState().past.length;
    useEditorStore.getState().onNodeDragStart();
    useEditorStore.getState().onNodeDragStop();
    expect(useEditorStore.getState().past.length).toBe(before);
  });

  it("connects nodes and rejects duplicates and self loops", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    const a = useEditorStore.getState().addNode("webhook", { x: 0, y: 0 });
    const b = useEditorStore.getState().addNode("openai", { x: 300, y: 0 });
    if (!a || !b) throw new Error("setup failed");

    useEditorStore
      .getState()
      .onConnect({ source: a.id, target: b.id, sourceHandle: "out", targetHandle: "in" });
    expect(useEditorStore.getState().edges).toHaveLength(1);
    expect(useEditorStore.getState().edges[0].selected).toBe(true);

    // duplicate is rejected
    useEditorStore
      .getState()
      .onConnect({ source: a.id, target: b.id, sourceHandle: "out", targetHandle: "in" });
    expect(useEditorStore.getState().edges).toHaveLength(1);

    // self loop is rejected
    useEditorStore
      .getState()
      .onConnect({ source: a.id, target: a.id, sourceHandle: "out", targetHandle: "in" });
    expect(useEditorStore.getState().edges).toHaveLength(1);
  });

  it("removes a node and its connected edges", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    const a = useEditorStore.getState().addNode("webhook", { x: 0, y: 0 });
    const b = useEditorStore.getState().addNode("slack", { x: 300, y: 0 });
    if (!a || !b) throw new Error("setup failed");
    useEditorStore
      .getState()
      .onConnect({ source: a.id, target: b.id, sourceHandle: "out", targetHandle: "in" });

    useEditorStore.getState().removeNode(a.id);
    expect(useEditorStore.getState().nodes).toHaveLength(1);
    expect(useEditorStore.getState().edges).toHaveLength(0);
  });

  it("undoes the keyboard deletion of a node + its edge in ONE step", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    const a = useEditorStore.getState().addNode("webhook", { x: 0, y: 0 });
    const b = useEditorStore.getState().addNode("slack", { x: 300, y: 0 });
    if (!a || !b) throw new Error("setup failed");
    useEditorStore
      .getState()
      .onConnect({ source: a.id, target: b.id, sourceHandle: "out", targetHandle: "in" });

    // React Flow dispatches node-removal and edge-removal separately.
    useEditorStore
      .getState()
      .applyNodeChanges([{ type: "remove", id: a.id }]);
    useEditorStore
      .getState()
      .applyEdgeChanges([{ type: "remove", id: getEdgeId() }]);
    expect(useEditorStore.getState().nodes).toHaveLength(1);
    expect(useEditorStore.getState().edges).toHaveLength(0);

    // Both deletions belong to the SAME history entry -> single undo restores both.
    const pastBefore = useEditorStore.getState().past.length;
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().past.length).toBe(pastBefore - 1);
    expect(useEditorStore.getState().nodes).toHaveLength(2);
    expect(useEditorStore.getState().edges).toHaveLength(1);
  });

  function getEdgeId() {
    const edges = useEditorStore.getState().edges;
    if (edges.length === 0) return "";
    return edges[edges.length - 1].id;
  }

  it("saveWorkflow stores the session into the collection", () => {
    const id = useWorkflowStore.getState().createWorkflow({ name: "Keeper" });
    useEditorStore.getState().loadWorkflow(id);
    useEditorStore.getState().updateWorkflowMetadata({ name: "Saved name" });

    expect(useEditorStore.getState().saveWorkflow()).toBe(true);
    expect(useEditorStore.getState().dirty).toBe(false);
    expect(useWorkflowStore.getState().workflows[0].name).toBe("Saved name");
    expect(useWorkflowStore.getState().workflows[0].savedAt).toBeTruthy();
  });

  it("saveWorkflow returns false with no active workflow", () => {
    expect(useEditorStore.getState().saveWorkflow()).toBe(false);
  });

  it("undoes and redoes node config modifications", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    const node = useEditorStore.getState().addNode("http-request", { x: 0, y: 0 });
    if (!node) throw new Error("setup failed");

    // Update config
    useEditorStore.getState().updateNode(node.id, {
      config: { method: "POST", url: "https://api.example.com" },
    });

    const updatedNode = useEditorStore.getState().nodes[0];
    const updatedConfig = updatedNode.data.config as Record<string, unknown>;
    expect(updatedConfig?.method).toBe("POST");
    expect(updatedConfig?.url).toBe("https://api.example.com");

    // Undo config update
    useEditorStore.getState().undo();
    const undoneNode = useEditorStore.getState().nodes[0];
    const undoneConfig = undoneNode.data.config as Record<string, unknown>;
    expect(undoneConfig?.method).toBe("GET");
    expect(undoneConfig?.url).toBe("");

    // Redo config update
    useEditorStore.getState().redo();
    const redoneNode = useEditorStore.getState().nodes[0];
    const redoneConfig = redoneNode.data.config as Record<string, unknown>;
    expect(redoneConfig?.method).toBe("POST");
  });

  it("preserves sourceHandle true and false on IF node connections", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);
    const ifNode = useEditorStore.getState().addNode("if", { x: 0, y: 0 });
    const slackNode = useEditorStore.getState().addNode("slack", { x: 300, y: 0 });
    const emailNode = useEditorStore.getState().addNode("email", { x: 300, y: 150 });
    if (!ifNode || !slackNode || !emailNode) throw new Error("setup failed");

    useEditorStore.getState().onConnect({
      source: ifNode.id,
      target: slackNode.id,
      sourceHandle: "true",
      targetHandle: "in",
    });

    useEditorStore.getState().onConnect({
      source: ifNode.id,
      target: emailNode.id,
      sourceHandle: "false",
      targetHandle: "in",
    });

    const edges = useEditorStore.getState().edges;
    expect(edges).toHaveLength(2);
    expect(edges[0].sourceHandle).toBe("true");
    expect(edges[1].sourceHandle).toBe("false");
  });

  it("undoes and redoes select, number, delay, condition, and header config edits (Cases 1-5)", () => {
    const id = useWorkflowStore.getState().createWorkflow();
    useEditorStore.getState().loadWorkflow(id);

    // 1. Select change (HTTP Method POST -> PUT)
    const httpNode = useEditorStore.getState().addNode("http-request", { x: 0, y: 0 });
    if (!httpNode) throw new Error("setup failed");
    useEditorStore.getState().updateNode(httpNode.id, { config: { method: "POST", url: "" } });
    useEditorStore.getState().updateNode(httpNode.id, { config: { method: "PUT", url: "" } });
    expect((useEditorStore.getState().nodes[0].data.config as Record<string, unknown>).method).toBe("PUT");
    useEditorStore.getState().undo();
    expect((useEditorStore.getState().nodes[0].data.config as Record<string, unknown>).method).toBe("POST");
    useEditorStore.getState().redo();
    expect((useEditorStore.getState().nodes[0].data.config as Record<string, unknown>).method).toBe("PUT");

    // 2. Number change (OpenAI temp 0.7 -> 1.2)
    const aiNode = useEditorStore.getState().addNode("openai", { x: 200, y: 0 });
    if (!aiNode) throw new Error("setup failed");
    useEditorStore.getState().updateNode(aiNode.id, { config: { model: "gpt-4o-mini", temperature: 1.2 } });
    expect((useEditorStore.getState().nodes[1].data.config as Record<string, unknown>).temperature).toBe(1.2);
    useEditorStore.getState().undo();
    expect((useEditorStore.getState().nodes[1].data.config as Record<string, unknown>).temperature).toBe(0.7);
    useEditorStore.getState().redo();
    expect((useEditorStore.getState().nodes[1].data.config as Record<string, unknown>).temperature).toBe(1.2);

    // 3. Delay change (duration 5 -> 10)
    const delayNode = useEditorStore.getState().addNode("delay", { x: 400, y: 0 });
    if (!delayNode) throw new Error("setup failed");
    useEditorStore.getState().updateNode(delayNode.id, { config: { duration: 10, unit: "seconds" } });
    expect((useEditorStore.getState().nodes[2].data.config as Record<string, unknown>).duration).toBe(10);
    useEditorStore.getState().undo();
    expect((useEditorStore.getState().nodes[2].data.config as Record<string, unknown>).duration).toBe(5);

    // 4. IF operator change (greater_than -> equals)
    const ifNode = useEditorStore.getState().addNode("if", { x: 600, y: 0 });
    if (!ifNode) throw new Error("setup failed");
    useEditorStore.getState().updateNode(ifNode.id, {
      config: { condition: { field: "score", operator: "equals", value: "80" } },
    });
    expect(
      ((useEditorStore.getState().nodes[3].data.config as Record<string, unknown>).condition as Record<string, unknown>).operator,
    ).toBe("equals");
    useEditorStore.getState().undo();
    expect(
      ((useEditorStore.getState().nodes[3].data.config as Record<string, unknown>).condition as Record<string, unknown>).operator,
    ).toBe("greater_than");

    // 5. Header addition & removal
    const httpConfigBefore = useEditorStore.getState().nodes[0].data.config as Record<string, unknown>;
    useEditorStore.getState().updateNode(httpNode.id, {
      config: { ...httpConfigBefore, headers: [{ key: "Authorization", value: "Bearer token" }] },
    });
    expect(
      ((useEditorStore.getState().nodes[0].data.config as Record<string, unknown>).headers as Array<unknown>).length,
    ).toBe(1);
    useEditorStore.getState().undo();
    expect(
      ((useEditorStore.getState().nodes[0].data.config as Record<string, unknown>).headers as Array<unknown> || []).length,
    ).toBe(0);
    useEditorStore.getState().redo();
    expect(
      ((useEditorStore.getState().nodes[0].data.config as Record<string, unknown>).headers as Array<unknown>).length,
    ).toBe(1);
  });
});