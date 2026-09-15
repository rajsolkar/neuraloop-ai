import { create } from "zustand";
import type { Workflow, WorkflowNode, WorkflowStatus } from "@/types/workflow";
import { makeId } from "@/lib/utils";
import { createWorkflowNode, sanitizeEdges, sanitizeNodes, sanitizeGraph } from "@/lib/workflow";
import { WorkflowService } from "@/lib/workflow/workflow-service";

export const WORKFLOW_STATUSES: WorkflowStatus[] = [
  "draft",
  "published",
  "archived",
];

interface CreateWorkflowInput {
  name?: string;
  description?: string;
}

interface WorkflowStoreState {
  workflows: Workflow[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;

  fetchWorkflows: () => Promise<Workflow[]>;
  createWorkflow: (input?: CreateWorkflowInput) => string;
  createWorkflowAsync: (input?: CreateWorkflowInput) => Promise<string>;
  updateWorkflowContent: (
    id: string,
    patch: Partial<Pick<Workflow, "name" | "description" | "status" | "nodes" | "edges" | "savedAt">>,
  ) => void;
  saveWorkflowToServer: (
    id: string,
    patch?: Partial<Pick<Workflow, "name" | "description" | "status" | "nodes" | "edges">>,
  ) => Promise<Workflow | null>;
  setWorkflowStatus: (id: string, status: WorkflowStatus) => void;
  duplicateWorkflow: (id: string) => string | null;
  duplicateWorkflowAsync: (id: string) => Promise<string | null>;
  deleteWorkflow: (id: string) => void;
  deleteWorkflowAsync: (id: string) => Promise<boolean>;
}

function seedDefaultWorkflows(): Workflow[] {
  const now = new Date().toISOString();

  const welcomeNodes: WorkflowNode[] = [
    createWorkflowNode("webhook", { x: 0, y: 40 }),
    createWorkflowNode("openai", { x: 320, y: 20 }),
    createWorkflowNode("slack", { x: 640, y: 40 }),
  ];
  welcomeNodes[0].id = "seed-1-n1";
  welcomeNodes[1].id = "seed-1-n2";
  welcomeNodes[2].id = "seed-1-n3";
  welcomeNodes[0].data.label = "Webhook";
  welcomeNodes[1].data.label = "Summarize with OpenAI";
  welcomeNodes[2].data.label = "Post to Slack";

  const digestNodes: WorkflowNode[] = [
    createWorkflowNode("schedule", { x: 0, y: 40 }),
    createWorkflowNode("openai", { x: 320, y: 20 }),
    createWorkflowNode("email", { x: 640, y: 40 }),
  ];
  digestNodes[0].id = "seed-2-n1";
  digestNodes[1].id = "seed-2-n2";
  digestNodes[2].id = "seed-2-n3";
  digestNodes[0].data.label = "Every morning at 8am";
  digestNodes[1].data.label = "Generate digest";
  digestNodes[2].data.label = "Email the digest";

  const edge = (source: string, target: string) => ({
    id: makeId("e"),
    source,
    target,
    type: "smoothstep",
    sourceHandle: "out",
    targetHandle: "in",
  });

  return [
    {
      id: makeId("w"),
      name: "Order Confirmation Bot",
      description: "Summarize incoming order notifications and post the summary to Slack.",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      savedAt: now,
      nodes: sanitizeNodes(welcomeNodes),
      edges: [edge("seed-1-n1", "seed-1-n2"), edge("seed-1-n2", "seed-1-n3")],
    },
    {
      id: makeId("w"),
      name: "Daily Email Digest",
      description: "Every morning, generate a short digest of saved notes and email it.",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      savedAt: now,
      nodes: sanitizeNodes(digestNodes),
      edges: [edge("seed-2-n1", "seed-2-n2"), edge("seed-2-n2", "seed-2-n3")],
    },
  ];
}

export const useWorkflowStore = create<WorkflowStoreState>((set, get) => ({
  workflows: [],
  hydrated: false,
  loading: false,
  error: null,

  fetchWorkflows: async () => {
    set({ loading: true, error: null });
    try {
      let list: Workflow[] = [];
      if (typeof window !== "undefined") {
        const res = await fetch("/api/workflows");
        if (res.ok) {
          const data = await res.json();
          list = data.workflows ?? [];
        }
      }
      if (list.length === 0) {
        list = await WorkflowService.listWorkflows();
      }
      set({ workflows: list, hydrated: true, loading: false });
      return list;
    } catch (err) {
      console.warn("Failed to fetch workflows from API, loading fallback:", err);
      const fallback = seedDefaultWorkflows();
      set({ workflows: fallback, hydrated: true, loading: false });
      return fallback;
    }
  },

  createWorkflow: (input) => {
    const now = new Date().toISOString();
    const workflow: Workflow = {
      id: makeId("w"),
      name: input?.name?.trim() || "Untitled Workflow",
      description: input?.description?.trim() ?? "",
      status: "draft",
      createdAt: now,
      updatedAt: now,
      savedAt: null,
      nodes: [],
      edges: [],
    };
    set((state) => ({
      workflows: [workflow, ...state.workflows],
    }));

    // Async sync to server
    void (async () => {
      try {
        if (typeof window !== "undefined") {
          const res = await fetch("/api/workflows", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: workflow.id, ...input }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.workflow?.id) {
              set((state) => ({
                workflows: state.workflows.map((w) =>
                  w.id === workflow.id ? { ...data.workflow } : w,
                ),
              }));
              return;
            }
          }
        }
        await WorkflowService.createWorkflow({ id: workflow.id, ...input });
      } catch (err) {
        console.warn("Async workflow create error:", err);
      }
    })();

    return workflow.id;
  },

  createWorkflowAsync: async (input) => {
    try {
      if (typeof window !== "undefined") {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input ?? {}),
        });
        if (res.ok) {
          const data = await res.json();
          const created: Workflow = data.workflow;
          set((state) => ({ workflows: [created, ...state.workflows] }));
          return created.id;
        }
      }
      const created = await WorkflowService.createWorkflow(input);
      set((state) => ({ workflows: [created, ...state.workflows] }));
      return created.id;
    } catch {
      return get().createWorkflow(input);
    }
  },

  updateWorkflowContent: (id, patch) => {
    const now = new Date().toISOString();
    set((state) => ({
      workflows: state.workflows.map((workflow) => {
        if (workflow.id !== id) return workflow;
        const rawNodes = patch.nodes ?? workflow.nodes;
        const rawEdges = patch.edges ?? workflow.edges;
        const clean = sanitizeGraph({ nodes: rawNodes, edges: rawEdges });
        return {
          ...workflow,
          ...patch,
          nodes: clean.nodes,
          edges: clean.edges,
          updatedAt: now,
        };
      }),
    }));
  },

  saveWorkflowToServer: async (id, patch) => {
    const target = get().workflows.find((w) => w.id === id);
    if (!target) return null;

    const payload = {
      name: patch?.name ?? target.name,
      description: patch?.description ?? target.description,
      status: patch?.status ?? target.status,
      nodes: patch?.nodes ?? target.nodes,
      edges: patch?.edges ?? target.edges,
    };

    try {
      if (typeof window !== "undefined") {
        const res = await fetch(`/api/workflows/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          const saved: Workflow = data.workflow;
          get().updateWorkflowContent(id, saved);
          return saved;
        }
      }
      const saved = await WorkflowService.updateWorkflow(id, payload);
      get().updateWorkflowContent(id, saved);
      return saved;
    } catch (err) {
      console.warn("saveWorkflowToServer failed:", err);
      return null;
    }
  },

  setWorkflowStatus: (id, status) => {
    get().updateWorkflowContent(id, { status });
    void get().saveWorkflowToServer(id, { status });
  },

  duplicateWorkflow: (id) => {
    const source = get().workflows.find((workflow) => workflow.id === id);
    if (!source) return null;
    const now = new Date().toISOString();
    const idMap = new Map<string, string>();
    const nodes = source.nodes.map((node) => {
      const newId = makeId("n");
      idMap.set(node.id, newId);
      return { ...node, id: newId, selected: false, dragging: false };
    });
    const edges = source.edges.map((edge) => ({
      ...edge,
      id: makeId("e"),
      source: idMap.get(edge.source) ?? edge.source,
      target: idMap.get(edge.target) ?? edge.target,
    }));
    const copy: Workflow = {
      id: makeId("w"),
      name: `${source.name} (copy)`,
      description: source.description,
      status: "draft",
      createdAt: now,
      updatedAt: now,
      savedAt: null,
      nodes: sanitizeNodes(nodes),
      edges: sanitizeEdges(edges),
    };
    set((state) => ({
      workflows: [copy, ...state.workflows],
    }));

    void (async () => {
      try {
        if (typeof window !== "undefined") {
          await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" });
        }
      } catch (err) {
        console.warn("Async duplicate error:", err);
      }
    })();

    return copy.id;
  },

  duplicateWorkflowAsync: async (id) => {
    try {
      if (typeof window !== "undefined") {
        const res = await fetch(`/api/workflows/${id}/duplicate`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          const copy: Workflow = data.workflow;
          set((state) => ({ workflows: [copy, ...state.workflows] }));
          return copy.id;
        }
      }
      const copy = await WorkflowService.duplicateWorkflow(id);
      set((state) => ({ workflows: [copy, ...state.workflows] }));
      return copy.id;
    } catch {
      return get().duplicateWorkflow(id);
    }
  },

  deleteWorkflow: (id) => {
    set((state) => ({
      workflows: state.workflows.filter((workflow) => workflow.id !== id),
    }));

    void (async () => {
      try {
        if (typeof window !== "undefined") {
          await fetch(`/api/workflows/${id}`, { method: "DELETE" });
        }
      } catch (err) {
        console.warn("Async delete error:", err);
      }
    })();
  },

  deleteWorkflowAsync: async (id) => {
    try {
      if (typeof window !== "undefined") {
        const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
        if (res.ok) {
          set((state) => ({
            workflows: state.workflows.filter((workflow) => workflow.id !== id),
          }));
          return true;
        }
      }
      const ok = await WorkflowService.deleteWorkflow(id);
      set((state) => ({
        workflows: state.workflows.filter((workflow) => workflow.id !== id),
      }));
      return ok;
    } catch {
      get().deleteWorkflow(id);
      return true;
    }
  },
}));

export function useWorkflowHydration(): boolean {
  return useWorkflowStore((state) => state.hydrated);
}