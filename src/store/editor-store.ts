import { create } from "zustand";
import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type XYPosition,
} from "@xyflow/react";
import type {
  Workflow,
  WorkflowEdge,
  WorkflowNode,
  WorkflowStatus,
} from "@/types/workflow";
import { makeId } from "@/lib/utils";
import { createWorkflowNode, getNodeDefinition, sanitizeEdges, sanitizeGraph } from "@/lib/workflow";
import { useWorkflowStore } from "./workflow-store";

const HISTORY_LIMIT = 100;

interface EditorSnapshot {
  name: string;
  description: string;
  status: WorkflowStatus;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface EditorState extends EditorSnapshot {
  workflowId: string | null;
  notFound: boolean;
  /** Set while waiting for the workflow store to hydrate before judging load. */
  pendingWorkflowId: string | null;

  past: EditorSnapshot[];
  future: EditorSnapshot[];
  /** Live selection (single node). */
  selectedNodeId: string | null;
  /** Live selection (single edge). */
  selectedEdgeId: string | null;

  dirty: boolean;
  lastSavedAt: string | null;

  /** Transient snapshot captured at drag start to undo moves. */
  dragStartSnapshot: EditorSnapshot | null;

  loadWorkflow: (id: string) => void;
  unloadWorkflow: () => void;

  addNode: (definitionId: string, position: XYPosition) => WorkflowNode | null;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => string;
  updateNode: (
    id: string,
    patch: Partial<{ label: string; description: string; config: Record<string, unknown> }>,
  ) => void;
  updateNodePosition: (id: string, position: XYPosition) => void;

  applyNodeChanges: (changes: NodeChange<WorkflowNode>[]) => void;
  applyEdgeChanges: (changes: EdgeChange<WorkflowEdge>[]) => void;
  onConnect: (connection: Connection) => void;
  removeEdge: (id: string) => void;

  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  clearSelection: () => void;

  updateWorkflowMetadata: (
    patch: Partial<Pick<EditorSnapshot, "name" | "description" | "status">>,
  ) => void;

  onNodeDragStart: () => void;
  onNodeDragStop: () => void;

  undo: () => void;
  redo: () => void;
  saveWorkflow: () => boolean;
  saveWorkflowAsync: () => Promise<boolean>;
}

function cloneSnapshot(snapshot: EditorSnapshot): EditorSnapshot {
  return {
    name: snapshot.name,
    description: snapshot.description,
    status: snapshot.status,
    nodes: snapshot.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        config: node.data.config
          ? (JSON.parse(JSON.stringify(node.data.config)) as Record<string, unknown>)
          : undefined,
      },
    })),
    edges: snapshot.edges.map((edge) => ({ ...edge })),
  };
}

function currentSnapshot(state: EditorState): EditorSnapshot {
  return cloneSnapshot({
    name: state.name,
    description: state.description,
    status: state.status,
    nodes: state.nodes,
    edges: state.edges,
  });
}

function pushHistory(state: EditorState): Partial<EditorState> {
  const entry = currentSnapshot(state);
  return {
    past: [...state.past.slice(-(HISTORY_LIMIT - 1)), entry],
    future: [],
  };
}

export const useEditorStore = create<EditorState>((set, get) => {
  /** Sync content back into the persisted collection so list views stay live. */
  const syncToCollection = (
    content: Partial<Pick<Workflow, "name" | "description" | "status" | "nodes" | "edges">>,
  ) => {
    const { workflowId } = get();
    if (!workflowId) return;
    useWorkflowStore
      .getState()
      .updateWorkflowContent(workflowId, content);
  };

  return {
    workflowId: null,
    notFound: false,
    pendingWorkflowId: null,
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

    loadWorkflow: (id) => {
      const store = useWorkflowStore.getState();
      const workflow = store.workflows.find((item) => item.id === id);
      if (!workflow) {
        if (!store.hydrated) {
          set({ workflowId: id, pendingWorkflowId: id, notFound: false });
          return;
        }
        // Attempt async fetch if missing from memory cache
        void (async () => {
          try {
            let found: Workflow | null = null;
            if (typeof window !== "undefined") {
              const res = await fetch(`/api/workflows/${id}`);
              if (res.ok) {
                const data = await res.json();
                found = data.workflow;
              }
            }
            if (found) {
              const clean = sanitizeGraph({ nodes: found.nodes, edges: found.edges });
              set({
                workflowId: id,
                notFound: false,
                pendingWorkflowId: null,
                name: found.name,
                description: found.description,
                status: found.status,
                nodes: clean.nodes,
                edges: clean.edges,
                past: [],
                future: [],
                selectedNodeId: null,
                selectedEdgeId: null,
                dirty: false,
                lastSavedAt: found.savedAt,
                dragStartSnapshot: null,
              });
              return;
            }
          } catch (err) {
            console.warn("Error fetching workflow:", err);
          }
          set({ workflowId: id, pendingWorkflowId: null, notFound: true });
        })();
        return;
      }
      const clean = sanitizeGraph({ nodes: workflow.nodes, edges: workflow.edges });
      set({
        workflowId: id,
        notFound: false,
        pendingWorkflowId: null,
        name: workflow.name,
        description: workflow.description,
        status: workflow.status,
        nodes: clean.nodes,
        edges: clean.edges,
        past: [],
        future: [],
        selectedNodeId: null,
        selectedEdgeId: null,
        dirty: false,
        lastSavedAt: workflow.savedAt,
        dragStartSnapshot: null,
      });
    },

    unloadWorkflow: () =>
      set({
        workflowId: null,
        notFound: false,
        pendingWorkflowId: null,
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
      }),

    addNode: (definitionId, position) => {
      const def = getNodeDefinition(definitionId);
      if (!def) return null;
      const node = createWorkflowNode(definitionId, position);
      set((state) => ({
        ...pushHistory(state),
        nodes: [
          ...state.nodes.map((item) => ({ ...item, selected: false })),
          { ...node, selected: true },
        ],
        selectedNodeId: node.id,
        selectedEdgeId: null,
        dirty: true,
      }));
      syncToCollection({ nodes: get().nodes, edges: get().edges });
      return node;
    },

    removeNode: (id) => {
      const state = get();
      const target = state.nodes.find((node) => node.id === id);
      if (!target) return;
      const nodes = state.nodes.filter((node) => node.id !== id);
      const edges = sanitizeEdges(state.edges, nodes);
      set({
        ...pushHistory(state),
        nodes,
        edges,
        selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        dirty: true,
      });
      syncToCollection({ nodes: get().nodes, edges: get().edges });
    },

    duplicateNode: (id) => {
      const state = get();
      const source = state.nodes.find((node) => node.id === id);
      if (!source) return "";
      const copy: WorkflowNode = {
        ...source,
        id: makeId("n"),
        position: {
          x: source.position.x + 40,
          y: source.position.y + 40,
        },
        // Keep the source node's selection untouched. Directly mutating the
        // `selected` prop here makes React Flow reconcile from its own internal
        // selection and emit a stray select change back, re-selecting the
        // source node and deselecting the copy.
        selected: false,
      };
      set({
        ...pushHistory(state),
        nodes: [...state.nodes, copy],
        dirty: true,
      });
      syncToCollection({ nodes: get().nodes, edges: get().edges });
      return copy.id;
    },

    updateNode: (id, patch) => {
      const state = get();
      const next = state.nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
      );
      set({
        ...pushHistory(state),
        nodes: next,
        dirty: true,
      });
      syncToCollection({ nodes: next, edges: state.edges });
    },

    updateNodePosition: (id, position) => {
      const state = get();
      const next = state.nodes.map((node) =>
        node.id === id ? { ...node, position } : node,
      );
      set({ nodes: next });
      syncToCollection({ nodes: next, edges: state.edges });
    },

    applyNodeChanges: (changes) => {
      const state = get();
      const hasRemoval = changes.some((change) => change.type === "remove");
      const history = hasRemoval ? pushHistory(state) : {};
      const nextNodes = applyNodeChanges(changes, state.nodes);

      let nextSelected = state.selectedNodeId;
      const selectChange = changes.find(
        (change) => change.type === "select",
      );
      if (selectChange) {
        if (selectChange.selected) {
          nextSelected = selectChange.id;
        } else if (nextSelected === selectChange.id) {
          nextSelected = null;
        }
      }
      const removes = new Set(
        changes
          .filter((change) => change.type === "remove")
          .map((change) => change.id),
      );
      if (nextSelected && removes.has(nextSelected)) {
        nextSelected = null;
      }

      // Deleting a node also removes its connected edges within the SAME
      // history entry, so undo restores both node and edge in one step
      // (React Flow dispatches node-remove and edge-remove separately).
      const nextEdges = sanitizeEdges(
        removes.size > 0
          ? state.edges.filter(
              (edge) => !removes.has(edge.source) && !removes.has(edge.target),
            )
          : state.edges,
        nextNodes,
      );
      const nextSelectedEdge = nextEdges.some(
        (edge) => edge.id === state.selectedEdgeId,
      )
        ? state.selectedEdgeId
        : null;

      const hasMutation =
        hasRemoval ||
        changes.some((change) => change.type === "position");

      set({
        ...history,
        nodes: nextNodes,
        edges: nextEdges,
        selectedNodeId: nextSelected,
        selectedEdgeId: nextSelectedEdge,
        dirty: hasMutation ? true : state.dirty,
      });
      if (hasMutation) {
        syncToCollection({ nodes: nextNodes, edges: nextEdges });
      }
    },

    applyEdgeChanges: (changes) => {
      const state = get();
      const removeChanges = changes.filter(
        (change) => change.type === "remove",
      );
      const hasRemoval = removeChanges.length > 0;
      const stillPresent = removeChanges.some((change) =>
        state.edges.some((edge) => edge.id === change.id),
      );
      const history = stillPresent ? pushHistory(state) : {};
      const rawNextEdges = applyEdgeChanges(changes, state.edges);
      const nextEdges = sanitizeEdges(rawNextEdges, state.nodes);

      let nextSelected = state.selectedEdgeId;
      const selectChange = changes.find((change) => change.type === "select");
      if (selectChange) {
        if (selectChange.selected) {
          nextSelected = selectChange.id;
        } else if (nextSelected === selectChange.id) {
          nextSelected = null;
        }
      }
      const removes = new Set(
        changes
          .filter((change) => change.type === "remove")
          .map((change) => change.id),
      );
      if (nextSelected && removes.has(nextSelected)) {
        nextSelected = null;
      }

      set({
        ...history,
        edges: nextEdges,
        selectedEdgeId: nextSelected,
        dirty: hasRemoval ? true : state.dirty,
      });
      if (hasRemoval) {
        syncToCollection({ nodes: state.nodes, edges: nextEdges });
      }
    },

    onConnect: (connection) => {
      const state = get();
      if (!connection.source || !connection.target || connection.source === connection.target) {
        return;
      }
      const sourceHandle = connection.sourceHandle ?? "out";
      const targetHandle = connection.targetHandle ?? "in";

      const duplicate = state.edges.some(
        (edge) =>
          edge.source === connection.source &&
          (edge.sourceHandle ?? "out") === sourceHandle &&
          edge.target === connection.target &&
          (edge.targetHandle ?? "in") === targetHandle,
      );
      if (duplicate) {
        return;
      }

      const sourceExists = state.nodes.some((n) => n.id === connection.source);
      const targetExists = state.nodes.some((n) => n.id === connection.target);
      if (!sourceExists || !targetExists) return;

      const edge: WorkflowEdge = {
        id: makeId("e"),
        source: connection.source,
        target: connection.target,
        sourceHandle,
        targetHandle,
        type: "smoothstep",
        selected: true,
      };

      const updatedEdges = sanitizeEdges([...state.edges, edge], state.nodes);

      set((current) => ({
        ...pushHistory(current),
        edges: updatedEdges,
        selectedNodeId: null,
        selectedEdgeId: edge.id,
        dirty: true,
      }));
      const latest = get();
      syncToCollection({ nodes: latest.nodes, edges: latest.edges });
    },

    removeEdge: (id) => {
      const state = get();
      set({
        ...pushHistory(state),
        edges: state.edges.filter((edge) => edge.id !== id),
        selectedEdgeId: null,
        dirty: true,
      });
      const latest = get();
      syncToCollection({ nodes: latest.nodes, edges: latest.edges });
    },

    selectNode: (id) => {
      const state = get();
      set({
        selectedNodeId: id,
        selectedEdgeId: null,
        nodes: state.nodes.map((node) => ({
          ...node,
          selected: node.id === id,
        })),
        edges: state.edges.map((edge) => ({ ...edge, selected: false })),
      });
    },
    selectEdge: (id) => {
      const state = get();
      set({
        selectedEdgeId: id,
        selectedNodeId: null,
        nodes: state.nodes.map((node) => ({ ...node, selected: false })),
        edges: state.edges.map((edge) => ({
          ...edge,
          selected: edge.id === id,
        })),
      });
    },
    clearSelection: () => {
      const state = get();
      set({
        selectedNodeId: null,
        selectedEdgeId: null,
        nodes: state.nodes.map((node) => ({ ...node, selected: false })),
        edges: state.edges.map((edge) => ({ ...edge, selected: false })),
      });
    },

    updateWorkflowMetadata: (patch) => {
      set({ ...patch, dirty: true });
      syncToCollection(patch);
    },

    onNodeDragStart: () => {
      const state = get();
      if (state.nodes.length === 0) return;
      set({ dragStartSnapshot: cloneSnapshot(currentSnapshot(state)) });
    },

    onNodeDragStop: () => {
      const state = get();
      const before = state.dragStartSnapshot;
      if (!before) return;

      let moved = false;
      for (const node of state.nodes) {
        const prior = before.nodes.find((item) => item.id === node.id);
        if (
          prior &&
          (prior.position.x !== node.position.x ||
            prior.position.y !== node.position.y)
        ) {
          moved = true;
          break;
        }
      }
      set({ dragStartSnapshot: null });
      if (!moved) return;

      set((current) => ({
        past: [
          ...current.past.slice(-(HISTORY_LIMIT - 1)),
          before,
        ],
        future: [],
        dirty: true,
      }));
    },

    undo: () => {
      const state = get();
      const previous = state.past[state.past.length - 1];
      if (!previous) return;
      const current = currentSnapshot(state);
      set({
        past: state.past.slice(0, -1),
        future: [current, ...state.future].slice(0, HISTORY_LIMIT),
        name: previous.name,
        description: previous.description,
        status: previous.status,
        nodes: previous.nodes.map((node) => ({ ...node, selected: false })),
        edges: previous.edges.map((edge) => ({ ...edge, selected: false })),
        selectedNodeId: null,
        selectedEdgeId: null,
        dirty: true,
      });
      const latest = get();
      syncToCollection({
        name: latest.name,
        description: latest.description,
        status: latest.status,
        nodes: latest.nodes,
        edges: latest.edges,
      });
    },

    redo: () => {
      const state = get();
      const next = state.future[0];
      if (!next) return;
      const current = currentSnapshot(state);
      set({
        past: [...state.past, current].slice(-HISTORY_LIMIT),
        future: state.future.slice(1),
        name: next.name,
        description: next.description,
        status: next.status,
        nodes: next.nodes.map((node) => ({ ...node, selected: false })),
        edges: next.edges.map((edge) => ({ ...edge, selected: false })),
        selectedNodeId: null,
        selectedEdgeId: null,
        dirty: true,
      });
      const latest = get();
      syncToCollection({
        name: latest.name,
        description: latest.description,
        status: latest.status,
        nodes: latest.nodes,
        edges: latest.edges,
      });
    },

    saveWorkflow: () => {
      const state = get();
      if (!state.workflowId) return false;
      const now = new Date().toISOString();
      const latest = get();
      const clean = sanitizeGraph({ nodes: latest.nodes, edges: latest.edges });
      const payload = {
        name: latest.name,
        description: latest.description,
        status: latest.status,
        nodes: clean.nodes,
        edges: clean.edges,
        savedAt: now,
      };
      useWorkflowStore.getState().updateWorkflowContent(state.workflowId, payload);
      void useWorkflowStore.getState().saveWorkflowToServer(state.workflowId, payload);
      set({ nodes: clean.nodes, edges: clean.edges, dirty: false, lastSavedAt: now });
      return true;
    },

    saveWorkflowAsync: async () => {
      const state = get();
      if (!state.workflowId) return false;
      const now = new Date().toISOString();
      const latest = get();
      const clean = sanitizeGraph({ nodes: latest.nodes, edges: latest.edges });
      const payload = {
        name: latest.name,
        description: latest.description,
        status: latest.status,
        nodes: clean.nodes,
        edges: clean.edges,
        savedAt: now,
      };
      useWorkflowStore.getState().updateWorkflowContent(state.workflowId, payload);
      await useWorkflowStore.getState().saveWorkflowToServer(state.workflowId, payload);
      set({ nodes: clean.nodes, edges: clean.edges, dirty: false, lastSavedAt: now });
      return true;
    },
  };
});

// Re-run a deferred load once the persisted workflow collection hydrates.
useWorkflowStore.subscribe((state, prevState) => {
  if (state.hydrated && !prevState.hydrated) {
    const pending = useEditorStore.getState().pendingWorkflowId;
    if (pending) useEditorStore.getState().loadWorkflow(pending);
  }
});

/** Helper used by the editor shell to check if history is available. */
export const selectCanUndo = (state: EditorState) => state.past.length > 0;
export const selectCanRedo = (state: EditorState) => state.future.length > 0;

