import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowStatus } from "@/types/workflow";
import { makeId } from "@/lib/utils";
import { sanitizeNodes, sanitizeEdges, sanitizeGraph, createWorkflowNode } from "./index";
import {
  WorkflowDefinitionSchema,
  CreateWorkflowInputSchema,
  UpdateWorkflowInputSchema,
} from "./validation";

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  savedAt: string | null;
  currentVersionId: string | null;
  nodeCount: number;
}

/** In-memory storage fallback for environments without an active DATABASE_URL connection. */
const memoryWorkflows = new Map<string, Workflow>();
const memoryVersions = new Map<string, { id: string; workflowId: string; version: number; definition: unknown; createdAt: string }[]>();

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "");
}

function seedInMemoryWorkflowsIfEmpty() {
  if (memoryWorkflows.size > 0) return;
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

  const w1: Workflow = {
    id: makeId("w"),
    name: "Order Confirmation Bot",
    description: "Summarize incoming order notifications and post the summary to Slack.",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    savedAt: now,
    nodes: sanitizeNodes(welcomeNodes),
    edges: [edge("seed-1-n1", "seed-1-n2"), edge("seed-1-n2", "seed-1-n3")],
  };

  const w2: Workflow = {
    id: makeId("w"),
    name: "Daily Email Digest",
    description: "Every morning, generate a short digest of saved notes and email it.",
    status: "draft",
    createdAt: now,
    updatedAt: now,
    savedAt: now,
    nodes: sanitizeNodes(digestNodes),
    edges: [edge("seed-2-n1", "seed-2-n2"), edge("seed-2-n2", "seed-2-n3")],
  };

  memoryWorkflows.set(w1.id, w1);
  memoryWorkflows.set(w2.id, w2);
}

export class WorkflowService {
  static async listWorkflows(userId?: string | null): Promise<Workflow[]> {
    if (isDatabaseConfigured()) {
      try {
        const whereClause = userId ? { OR: [{ userId }, { userId: null }] } : {};

        const records = await prisma.workflow.findMany({
          where: whereClause,
          orderBy: { updatedAt: "desc" },
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        });

        return records.map((item) => {
          const latestVersion = item.versions[0];
          const definition = (latestVersion?.definition as { nodes?: WorkflowNode[]; edges?: WorkflowEdge[] }) ?? {};
          const clean = sanitizeGraph({ nodes: definition.nodes ?? [], edges: definition.edges ?? [] });
          return {
            id: item.id,
            name: item.name,
            description: item.description,
            status: item.status as WorkflowStatus,
            createdAt: item.createdAt.toISOString(),
            updatedAt: item.updatedAt.toISOString(),
            savedAt: item.savedAt ? item.savedAt.toISOString() : null,
            publishedAt: item.publishedAt ? item.publishedAt.toISOString() : null,
            publishedVersionId: item.publishedVersionId,
            publishedVersionNumber: item.publishedVersionNumber,
            activeVersionId: item.activeVersionId,
            activeVersionNumber: item.activeVersionNumber,
            nodes: clean.nodes,
            edges: clean.edges,
          };
        });
      } catch (err) {
        console.warn("Database query failed in listWorkflows, falling back to memory store:", err);
      }
    }

    seedInMemoryWorkflowsIfEmpty();
    return Array.from(memoryWorkflows.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  static async createWorkflow(rawInput?: unknown, userId?: string | null): Promise<Workflow> {
    const parsed = CreateWorkflowInputSchema.parse(rawInput ?? {});
    const now = new Date();
    const iso = now.toISOString();

    const name = parsed.name?.trim() || "Untitled Workflow";
    const description = parsed.description?.trim() ?? "";
    const status = parsed.status ?? "draft";
    const { nodes, edges } = sanitizeGraph({ nodes: parsed.nodes ?? [], edges: parsed.edges ?? [] });

    // Validate canonical structure
    WorkflowDefinitionSchema.parse({ name, description, status, nodes, edges });

    const workflowId = parsed.id ?? makeId("w");
    const versionId = makeId("ver");

    const canonicalDefinition = {
      name,
      description,
      status,
      nodes,
      edges,
    };

    if (isDatabaseConfigured()) {
      try {
        const record = await prisma.workflow.create({
          data: {
            id: workflowId,
            userId: userId ?? null,
            name,
            description,
            status,
            createdAt: now,
            updatedAt: now,
            savedAt: null,
            currentVersionId: versionId,
            versions: {
              create: {
                id: versionId,
                version: 1,
                definition: canonicalDefinition as unknown as Prisma.InputJsonValue,
                createdAt: now,
              },
            },
          },
        });

        return {
          id: record.id,
          name: record.name,
          description: record.description,
          status: record.status as WorkflowStatus,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          savedAt: record.savedAt ? record.savedAt.toISOString() : null,
          nodes,
          edges,
        };
      } catch (err) {
        console.warn("Database creation failed, falling back to memory store:", err);
      }
    }

    seedInMemoryWorkflowsIfEmpty();
    const workflow: Workflow = {
      id: workflowId,
      name,
      description,
      status,
      createdAt: iso,
      updatedAt: iso,
      savedAt: null,
      nodes,
      edges,
    };

    memoryWorkflows.set(workflow.id, workflow);
    memoryVersions.set(workflow.id, [
      { id: versionId, workflowId, version: 1, definition: canonicalDefinition, createdAt: iso },
    ]);

    return workflow;
  }

  static async getWorkflow(id: string, userId?: string | null): Promise<Workflow | null> {
    if (isDatabaseConfigured()) {
      try {
        const record = await prisma.workflow.findUnique({
          where: { id },
          include: {
            versions: {
              orderBy: { version: "desc" },
              take: 1,
            },
          },
        });

        if (!record) return null;
        if (userId && record.userId && record.userId !== userId) {
          return null; // Enforce strict tenant isolation
        }

        const latestVersion = record.versions[0];
        const definition = (latestVersion?.definition as {
          name?: string;
          description?: string;
          status?: WorkflowStatus;
          nodes?: WorkflowNode[];
          edges?: WorkflowEdge[];
        }) ?? {};

        return {
          id: record.id,
          name: record.name,
          description: record.description,
          status: record.status as WorkflowStatus,
          createdAt: record.createdAt.toISOString(),
          updatedAt: record.updatedAt.toISOString(),
          savedAt: record.savedAt ? record.savedAt.toISOString() : null,
          publishedAt: record.publishedAt ? record.publishedAt.toISOString() : null,
          publishedVersionId: record.publishedVersionId,
          publishedVersionNumber: record.publishedVersionNumber,
          activeVersionId: record.activeVersionId,
          activeVersionNumber: record.activeVersionNumber,
          webhookSecret: record.webhookSecret,
          nodes: sanitizeNodes(definition.nodes ?? []),
          edges: sanitizeEdges(definition.edges ?? []),
        };
      } catch (err) {
        console.warn("Database query failed in getWorkflow, falling back to memory store:", err);
      }
    }

    seedInMemoryWorkflowsIfEmpty();
    const workflow = memoryWorkflows.get(id);
    if (!workflow) return null;
    return workflow;
  }

  static async updateWorkflow(id: string, rawInput: unknown, userId?: string | null): Promise<Workflow> {
    const existing = await this.getWorkflow(id, userId);
    if (!existing) {
      throw new Error(`Workflow with ID ${id} not found.`);
    }

    const parsed = UpdateWorkflowInputSchema.parse(rawInput);
    const now = new Date();
    const iso = now.toISOString();

    const name = parsed.name !== undefined ? parsed.name.trim() : existing.name;
    const description = parsed.description !== undefined ? parsed.description.trim() : existing.description;
    const status = parsed.status !== undefined ? parsed.status : existing.status;
    const rawNodes = parsed.nodes !== undefined ? parsed.nodes : existing.nodes;
    const rawEdges = parsed.edges !== undefined ? parsed.edges : existing.edges;
    const { nodes, edges } = sanitizeGraph({ nodes: rawNodes, edges: rawEdges });

    // Validate graph structure & constraints server-side
    WorkflowDefinitionSchema.parse({ name, description, status, nodes, edges });

    const canonicalDefinition = {
      name,
      description,
      status,
      nodes,
      edges,
    };

    if (isDatabaseConfigured()) {
      try {
        const updateData: Prisma.WorkflowUpdateInput = {
          name,
          description,
          status,
          updatedAt: now,
          savedAt: now,
        };

        if (parsed.createVersion) {
          const latestVerRecord = await prisma.workflowVersion.findFirst({
            where: { workflowId: id },
            orderBy: { version: "desc" },
          });

          const nextVersionNum = (latestVerRecord?.version ?? 0) + 1;
          const newVersionId = makeId("ver");

          updateData.currentVersionId = newVersionId;
          updateData.versions = {
            create: {
              id: newVersionId,
              version: nextVersionNum,
              definition: canonicalDefinition as unknown as Prisma.InputJsonValue,
              createdAt: now,
            },
          };
        }

        const updated = await prisma.workflow.update({
          where: { id },
          data: updateData,
        });

        return {
          id: updated.id,
          name: updated.name,
          description: updated.description,
          status: updated.status as WorkflowStatus,
          createdAt: updated.createdAt.toISOString(),
          updatedAt: updated.updatedAt.toISOString(),
          savedAt: updated.savedAt ? updated.savedAt.toISOString() : iso,
          publishedAt: updated.publishedAt ? updated.publishedAt.toISOString() : null,
          publishedVersionId: updated.publishedVersionId,
          publishedVersionNumber: updated.publishedVersionNumber,
          activeVersionId: updated.activeVersionId,
          activeVersionNumber: updated.activeVersionNumber,
          webhookSecret: updated.webhookSecret,
          nodes,
          edges,
        };
      } catch (err) {
        console.warn("Database update failed in updateWorkflow, falling back to memory store:", err);
      }
    }

    const updatedWorkflow: Workflow = {
      ...existing,
      name,
      description,
      status,
      nodes,
      edges,
      updatedAt: iso,
      savedAt: iso,
    };

    memoryWorkflows.set(id, updatedWorkflow);
    const versions = memoryVersions.get(id) ?? [];
    const nextVerNum = versions.length + 1;
    const verId = makeId("ver");
    versions.push({
      id: verId,
      workflowId: id,
      version: nextVerNum,
      definition: canonicalDefinition,
      createdAt: iso,
    });
    memoryVersions.set(id, versions);

    return updatedWorkflow;
  }

  static async duplicateWorkflow(id: string, userId?: string | null): Promise<Workflow> {
    const source = await this.getWorkflow(id, userId);
    if (!source) {
      throw new Error(`Cannot duplicate missing workflow with ID ${id}`);
    }

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

    return this.createWorkflow(
      {
        name: `${source.name} (copy)`,
        description: source.description,
        status: "draft",
        nodes: sanitizeNodes(nodes),
        edges: sanitizeEdges(edges),
      },
      userId,
    );
  }

  static async deleteWorkflow(id: string, userId?: string | null): Promise<boolean> {
    const existing = await this.getWorkflow(id, userId);
    if (!existing) {
      return false;
    }

    if (isDatabaseConfigured()) {
      try {
        await prisma.workflow.delete({
          where: { id },
        });
        return true;
      } catch (err) {
        console.warn("Database deletion failed in deleteWorkflow, falling back to memory store:", err);
      }
    }

    seedInMemoryWorkflowsIfEmpty();
    const existed = memoryWorkflows.has(id);
    memoryWorkflows.delete(id);
    memoryVersions.delete(id);
    return existed;
  }

  static async getWorkflowVersions(workflowId: string, userId?: string | null): Promise<{ id: string; version: number; createdAt: string }[]> {
    const existing = await this.getWorkflow(workflowId, userId);
    if (!existing) {
      return [];
    }

    if (isDatabaseConfigured()) {
      try {
        const records = await prisma.workflowVersion.findMany({
          where: { workflowId },
          select: { id: true, version: true, createdAt: true },
          orderBy: { version: "desc" },
        });
        return records.map((r) => ({ id: r.id, version: r.version, createdAt: r.createdAt.toISOString() }));
      } catch (err) {
        console.warn("Database version query failed, falling back to memory store:", err);
      }
    }

    const versions = memoryVersions.get(workflowId) ?? [];
    return versions.map((v) => ({ id: v.id, version: v.version, createdAt: v.createdAt })).reverse();
  }
}
