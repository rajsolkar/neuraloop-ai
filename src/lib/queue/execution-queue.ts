import { Queue } from "bullmq";
import { getRedisConnection, isRedisConfigured } from "./redis";
import { WorkflowEngine } from "../execution/engine";
import { prisma } from "../prisma";
import type { ExecutionSource } from "@/types/workflow";

export interface ExecutionJobPayload {
  executionId: string;
  workflowId: string;
  workflowVersionId: string;
  input?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  source?: ExecutionSource;
  triggerMetadata?: Record<string, unknown>;
}

export const WORKFLOW_EXECUTION_QUEUE_NAME = "workflow-executions";

let bullQueue: Queue<ExecutionJobPayload> | null = null;

export function getExecutionQueue(): Queue<ExecutionJobPayload> | null {
  const redis = getRedisConnection();
  if (!redis) return null;

  if (!bullQueue) {
    bullQueue = new Queue<ExecutionJobPayload>(WORKFLOW_EXECUTION_QUEUE_NAME, {
      connection: redis as unknown as import("bullmq").ConnectionOptions,
      defaultJobOptions: {
        attempts: 2, // Queue/job-level retries for worker infrastructure/network failures
        backoff: {
          type: "exponential",
          delay: 1000,
        },
        removeOnComplete: { age: 86400, count: 1000 }, // Keep last 1000 completed jobs for 24h
        removeOnFail: { age: 604800, count: 5000 },    // Keep failed jobs for 7 days
      },
    });
  }

  return bullQueue;
}

export async function enqueueExecution(payload: ExecutionJobPayload): Promise<{
  queued: boolean;
  jobId: string;
  mode: "bullmq" | "in-process-async";
}> {
  const queue = getExecutionQueue();

  if (queue && isRedisConfigured()) {
    try {
      const job = await queue.add("execute", payload, {
        jobId: payload.executionId,
      });
      return {
        queued: true,
        jobId: job.id || payload.executionId,
        mode: "bullmq",
      };
    } catch (err) {
      console.warn("Failed to add job to BullMQ queue, falling back to background async execution:", err);
    }
  }

  // Fallback: Trigger execution asynchronously in background without blocking API response
  setTimeout(async () => {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.workflowExecution.update({
          where: { id: payload.executionId },
          data: { status: "running" },
        }).catch(() => {});
      }

      await WorkflowEngine.executeWorkflow({
        workflowId: payload.workflowId,
        versionId: payload.workflowVersionId,
        executionId: payload.executionId,
        input: payload.input,
        metadata: payload.metadata,
      });
    } catch (err) {
      console.warn(`Background fallback execution ${payload.executionId} failed:`, err);
    }
  }, 10);

  return {
    queued: true,
    jobId: payload.executionId,
    mode: "in-process-async",
  };
}

export class ExecutionQueue {
  static async enqueueExecution(options: {
    workflowId: string;
    workflowVersionId: string;
    input?: Record<string, unknown>;
    source?: ExecutionSource;
    triggerMetadata?: Record<string, unknown>;
  }): Promise<{ id: string; status: string }> {
    const { workflowId, workflowVersionId, input = {}, source = "manual", triggerMetadata } = options;

    let executionId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    if (process.env.DATABASE_URL) {
      try {
        const record = await prisma.workflowExecution.create({
          data: {
            workflowId,
            workflowVersionId,
            status: "queued",
            source,
            input: input as unknown as import("@prisma/client").Prisma.InputJsonValue,
            triggerMetadata: (triggerMetadata || {}) as unknown as import("@prisma/client").Prisma.InputJsonValue,
          },
        });
        executionId = record.id;
      } catch (err) {
        console.warn("Failed to create WorkflowExecution DB record:", err);
      }
    }

    await enqueueExecution({
      executionId,
      workflowId,
      workflowVersionId,
      input,
      source,
      triggerMetadata,
    });

    return { id: executionId, status: "queued" };
  }
}

export async function cancelExecutionJob(executionId: string): Promise<boolean> {
  const queue = getExecutionQueue();
  let cancelled = false;

  if (queue) {
    try {
      const job = await queue.getJob(executionId);
      if (job) {
        await job.remove();
        cancelled = true;
      }
    } catch (err) {
      console.warn("Failed to remove job from BullMQ queue:", err);
    }
  }

  // Update DB execution status to cancelled
  if (process.env.DATABASE_URL) {
    try {
      await prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status: "cancelled",
          completedAt: new Date(),
          error: "EXECUTION_CANCELLED: Execution was cancelled by user request.",
        },
      });
      cancelled = true;
    } catch {
      // Ignored if execution does not exist in DB
    }
  }

  return cancelled;
}

export async function getQueueHealth(): Promise<{
  redisConnected: boolean;
  queueActive: boolean;
  waitingCount: number;
  activeCount: number;
  completedCount: number;
  failedCount: number;
}> {
  const queue = getExecutionQueue();
  if (!queue || !isRedisConfigured()) {
    return {
      redisConnected: false,
      queueActive: false,
      waitingCount: 0,
      activeCount: 0,
      completedCount: 0,
      failedCount: 0,
    };
  }

  try {
    const counts = await queue.getJobCounts("waiting", "active", "completed", "failed");
    return {
      redisConnected: true,
      queueActive: true,
      waitingCount: counts.waiting || 0,
      activeCount: counts.active || 0,
      completedCount: counts.completed || 0,
      failedCount: counts.failed || 0,
    };
  } catch {
    return {
      redisConnected: false,
      queueActive: false,
      waitingCount: 0,
      activeCount: 0,
      completedCount: 0,
      failedCount: 0,
    };
  }
}
