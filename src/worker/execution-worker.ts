import { Worker, Job } from "bullmq";
import { getRedisConnection } from "@/lib/queue/redis";
import {
  WORKFLOW_EXECUTION_QUEUE_NAME,
  type ExecutionJobPayload,
} from "@/lib/queue/execution-queue";
import { WorkflowEngine } from "@/lib/execution/engine";
import { prisma } from "@/lib/prisma";

export function createExecutionWorker(): Worker<ExecutionJobPayload> | null {
  const redis = getRedisConnection();
  if (!redis) {
    console.warn("Redis connection unavailable. Worker cannot start.");
    return null;
  }

  const concurrency = parseInt(process.env.WORKER_CONCURRENCY || "5", 10);

  const worker = new Worker<ExecutionJobPayload>(
    WORKFLOW_EXECUTION_QUEUE_NAME,
    async (job: Job<ExecutionJobPayload>) => {
      const { executionId, workflowId, workflowVersionId, input, metadata } = job.data;
      console.log(`[Worker] Processing execution job ${executionId} (Workflow ${workflowId}, Version ${workflowVersionId})`);

      // 1. Mark status running in Neon PostgreSQL if DB configured
      if (process.env.DATABASE_URL) {
        try {
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: { status: "running", startedAt: new Date() },
          });
        } catch (err) {
          console.warn(`[Worker] Failed to update execution ${executionId} to running:`, err);
        }
      }

      // 2. Reuse existing Phase 4 WorkflowEngine with exact executionId
      try {
        const executionRecord = await WorkflowEngine.executeWorkflow({
          workflowId,
          versionId: workflowVersionId,
          executionId,
          input,
          metadata,
        });

        if (executionRecord.status === "failed") {
          throw new Error(executionRecord.error || `Execution ${executionId} failed.`);
        }

        console.log(`[Worker] Execution ${executionId} completed successfully in ${executionRecord.duration}ms`);
        return executionRecord;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error(`[Worker] Execution ${executionId} failed: ${errorMsg}`);
        throw err;
      }
    },
    {
      connection: redis as unknown as import("bullmq").ConnectionOptions,
      concurrency,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[Worker] Job ${job.id} completed.`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[Worker] Job ${job?.id} failed after attempts:`, err.message);
  });

  return worker;
}

export async function startWorkerProcess(): Promise<void> {
  console.log("Starting Neuraloop Background Execution Worker...");
  const worker = createExecutionWorker();

  if (!worker) {
    console.error("Worker failed to start due to missing Redis configuration.");
    return;
  }

  console.log(`Worker active on queue '${WORKFLOW_EXECUTION_QUEUE_NAME}' with concurrency ${process.env.WORKER_CONCURRENCY || 5}`);

  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down worker gracefully...`);
    try {
      await worker.close();
      await prisma.$disconnect();
      console.log("Worker process stopped cleanly.");
      process.exit(0);
    } catch (err) {
      console.error("Error during worker shutdown:", err);
      process.exit(1);
    }
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
