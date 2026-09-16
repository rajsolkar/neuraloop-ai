import type { WorkflowNode } from "@/types/workflow";

export type ExecutionStatus = "queued" | "running" | "success" | "failed" | "cancelled";
export type NodeExecutionStatus = "pending" | "running" | "success" | "failed" | "skipped" | "cancelled";
export type ExecutionSource = "manual" | "webhook" | "schedule" | "api";

export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  workflowVersionId: string;
  versionNumber: number;
  userId?: string | null;
  input: Record<string, unknown>;
  /** Map of nodeId -> node output JSON */
  nodeOutputs: Record<string, unknown>;
  /** Map of nodeId -> node input JSON passed to it */
  nodeInputs: Record<string, unknown>;
  /** Map of nodeId -> NodeExecutionStatus */
  nodeStatuses: Record<string, NodeExecutionStatus>;
  metadata: Record<string, unknown>;
}

export interface NodeExecutionResult {
  status: "success" | "failed" | "skipped";
  output?: Record<string, unknown>;
  error?: string;
  /** For IF nodes: indicates which handle path was selected ("true" or "false") */
  selectedHandle?: "true" | "false";
  metadata?: Record<string, unknown>;
}

export interface NodeExecutor {
  definitionId: string;
  execute: (
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ) => Promise<NodeExecutionResult>;
}

export interface WorkflowExecutionRecord {
  id: string;
  workflowId: string;
  workflowVersionId: string;
  versionNumber?: number;
  status: ExecutionStatus;
  source: ExecutionSource;
  startedAt: string;
  completedAt?: string;
  duration?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  triggerMetadata?: Record<string, unknown>;
  nodeExecutions: Array<{
    id: string;
    nodeId: string;
    nodeType: string;
    status: NodeExecutionStatus;
    startedAt: string;
    completedAt?: string;
    duration?: number;
    input?: Record<string, unknown>;
    output?: Record<string, unknown>;
    error?: string;
    attempt: number;
  }>;
}
