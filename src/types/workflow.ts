import type { Edge, Node } from "@xyflow/react";

export type NodeCategory = "trigger" | "action" | "logic";

export type WorkflowStatus = "draft" | "published" | "archived";

export type ExecutionSource = "manual" | "webhook" | "schedule" | "api";

/** Serializable data carried by every workflow node on the canvas. */
export interface WorkflowNodeData {
  /** Key into the node definition registry. */
  definitionId: string;
  /** User-editable display label. */
  label: string;
  /** Short user-editable description shown on the node. */
  description: string;
  /** Category derived from the definition (used for styling). */
  category: NodeCategory;
  /** Last execution status for canvas visual feedback. */
  lastExecutionStatus?: "pending" | "running" | "success" | "failed" | "skipped" | "cancelled" | null;
  [key: string]: unknown;
}

export type WorkflowNode = Node<WorkflowNodeData, "neuraloop-node">;

export type WorkflowEdge = Edge;

/** Canonical, serializable workflow representation (Phase 2, Phase 7 & 7.1 compatible). */
export interface Workflow {
  id: string;
  userId?: string | null;
  organizationId?: string | null;
  name: string;
  description: string;
  status: WorkflowStatus;
  visibility?: "private" | "workspace";
  createdAt: string;
  updatedAt: string;
  /** Last time the workflow content was committed to the collection. */
  savedAt: string | null;
  publishedAt?: string | null;
  publishedVersionId?: string | null;
  publishedVersionNumber?: number | null;
  activeVersionId?: string | null;
  activeVersionNumber?: number | null;
  hasUnpublishedChanges?: boolean;
  webhookSecret?: string | null;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowVersionRecord {
  id: string;
  workflowId: string;
  version: number;
  definition: {
    name: string;
    description: string;
    status: WorkflowStatus;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
  publishedAt?: string | null;
  isActive?: boolean;
  comment?: string | null;
  createdAt: string;
}