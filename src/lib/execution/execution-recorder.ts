import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface ExecutionInitOptions {
  executionId: string;
  workflowId: string;
  workflowVersionId: string;
  workflowName?: string;
  triggerType?: string;
  userId?: string | null;
  organizationId?: string | null;
  parentExecutionId?: string | null;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface NodeExecutionCompleteOptions {
  executionId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs: number;
  metrics?: Record<string, unknown>;
  attempt?: number;
}

export interface NodeExecutionFailOptions {
  executionId: string;
  nodeId: string;
  nodeType: string;
  nodeLabel?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  error: string;
  errorMessage?: string;
  durationMs: number;
  metrics?: Record<string, unknown>;
  attempt?: number;
}

export interface ExecutionStats {
  totalNodes: number;
  successfulNodes: number;
  failedNodes: number;
  aiTokensIn?: number;
  aiTokensOut?: number;
  aiEstimatedCost?: number;
  httpRequestsCount?: number;
}

function sanitizeSecrets(data: unknown): unknown {
  if (!data) return data;
  if (typeof data === "string") {
    return data
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, "sk-[REDACTED]")
      .replace(/xoxb-[a-zA-Z0-9_\-]{20,}/g, "xoxb-[REDACTED]")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED]");
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeSecrets);
  }
  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("apikey")
      ) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizeSecrets(val);
      }
    }
    return clean;
  }
  return data;
}

export class ExecutionRecorder {
  static async startExecution(options: ExecutionInitOptions): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      const existing = await prisma.workflowExecution.findUnique({
        where: { id: options.executionId },
      });

      if (existing) {
        await prisma.workflowExecution.update({
          where: { id: options.executionId },
          data: {
            status: "running",
            startedAt: new Date(),
            workflowName: options.workflowName || existing.workflowName,
            triggerType: options.triggerType || existing.source || "manual",
            input: sanitizeSecrets(options.input || {}) as unknown as Prisma.InputJsonValue,
            metadata: sanitizeSecrets(options.metadata || {}) as unknown as Prisma.InputJsonValue,
          },
        });
      } else {
        await prisma.workflowExecution.create({
          data: {
            id: options.executionId,
            workflowId: options.workflowId,
            workflowVersionId: options.workflowVersionId,
            workflowName: options.workflowName || "Workflow Run",
            userId: options.userId || null,
            organizationId: options.organizationId || null,
            parentExecutionId: options.parentExecutionId || null,
            status: "running",
            source: options.triggerType || "manual",
            triggerType: options.triggerType || "manual",
            startedAt: new Date(),
            input: sanitizeSecrets(options.input || {}) as unknown as Prisma.InputJsonValue,
            metadata: sanitizeSecrets(options.metadata || {}) as unknown as Prisma.InputJsonValue,
          },
        });
      }
    } catch (err) {
      console.warn("ExecutionRecorder.startExecution warning:", err);
    }
  }

  static async completeExecution(
    executionId: string,
    output: Record<string, unknown>,
    durationMs: number,
    stats: ExecutionStats,
  ): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: "success",
          completedAt: new Date(),
          duration: durationMs,
          totalNodes: stats.totalNodes,
          successfulNodes: stats.successfulNodes,
          failedNodes: stats.failedNodes,
          aiTokensIn: stats.aiTokensIn || 0,
          aiTokensOut: stats.aiTokensOut || 0,
          aiEstimatedCost: stats.aiEstimatedCost || 0,
          httpRequestsCount: stats.httpRequestsCount || 0,
          output: sanitizeSecrets(output) as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      console.warn("ExecutionRecorder.completeExecution warning:", err);
    }
  }

  static async failExecution(
    executionId: string,
    error: string,
    errorMessage: string,
    durationMs: number,
    stats: ExecutionStats,
    output?: Record<string, unknown>,
  ): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: "failed",
          completedAt: new Date(),
          duration: durationMs,
          totalNodes: stats.totalNodes,
          successfulNodes: stats.successfulNodes,
          failedNodes: stats.failedNodes,
          aiTokensIn: stats.aiTokensIn || 0,
          aiTokensOut: stats.aiTokensOut || 0,
          aiEstimatedCost: stats.aiEstimatedCost || 0,
          httpRequestsCount: stats.httpRequestsCount || 0,
          error: String(sanitizeSecrets(error)),
          errorMessage: String(sanitizeSecrets(errorMessage || error)),
          output: sanitizeSecrets(output || {}) as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (err) {
      console.warn("ExecutionRecorder.failExecution warning:", err);
    }
  }

  static async completeNode(options: NodeExecutionCompleteOptions): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      const startTime = new Date(Date.now() - options.durationMs);
      await prisma.nodeExecution.create({
        data: {
          executionId: options.executionId,
          nodeId: options.nodeId,
          nodeType: options.nodeType,
          nodeLabel: options.nodeLabel || options.nodeId,
          status: "success",
          startedAt: startTime,
          completedAt: new Date(),
          duration: options.durationMs,
          input: sanitizeSecrets(options.input || {}) as unknown as Prisma.InputJsonValue,
          output: sanitizeSecrets(options.output || {}) as unknown as Prisma.InputJsonValue,
          metrics: sanitizeSecrets(options.metrics || {}) as unknown as Prisma.InputJsonValue,
          attempt: options.attempt || 1,
        },
      });
    } catch (err) {
      console.warn("ExecutionRecorder.completeNode warning:", err);
    }
  }

  static async failNode(options: NodeExecutionFailOptions): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      const startTime = new Date(Date.now() - options.durationMs);
      await prisma.nodeExecution.create({
        data: {
          executionId: options.executionId,
          nodeId: options.nodeId,
          nodeType: options.nodeType,
          nodeLabel: options.nodeLabel || options.nodeId,
          status: "failed",
          startedAt: startTime,
          completedAt: new Date(),
          duration: options.durationMs,
          input: sanitizeSecrets(options.input || {}) as unknown as Prisma.InputJsonValue,
          output: sanitizeSecrets(options.output || {}) as unknown as Prisma.InputJsonValue,
          error: String(sanitizeSecrets(options.error)),
          errorMessage: String(sanitizeSecrets(options.errorMessage || options.error)),
          metrics: sanitizeSecrets(options.metrics || {}) as unknown as Prisma.InputJsonValue,
          attempt: options.attempt || 1,
        },
      });
    } catch (err) {
      console.warn("ExecutionRecorder.failNode warning:", err);
    }
  }
}
