import { describe, expect, it } from "vitest";
import { enqueueExecution, cancelExecutionJob, getQueueHealth } from "./execution-queue";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { prisma } from "@/lib/prisma";

describe("Phase 5 Queue Architecture & Cancellation", () => {
  it("enqueues an execution job and returns queued status", async () => {
    const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
    const delay = createWorkflowNode("delay", { x: 200, y: 0 });

    const workflow = await WorkflowService.createWorkflow({
      name: "Queue Test Workflow",
      nodes: [trigger, delay],
      edges: [{ id: "e1", source: trigger.id, target: delay.id, sourceHandle: "out", targetHandle: "in" }],
    });

    const executionId = `exec-test-queue-${Date.now()}`;
    const result = await enqueueExecution({
      executionId,
      workflowId: workflow.id,
      workflowVersionId: `ver-test-${workflow.id}`,
      input: { payload: "test" },
    });

    expect(result.queued).toBe(true);
    expect(result.jobId).toBe(executionId);

    await WorkflowService.deleteWorkflow(workflow.id);
  });

  it("cancels a queued execution job cleanly", async () => {
    const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
    const workflow = await WorkflowService.createWorkflow({
      name: "Cancel Test Workflow",
      nodes: [trigger],
      edges: [],
    });

    const executionId = `exec-cancel-test-${Date.now()}`;

    // Create record in DB if DB available
    if (process.env.DATABASE_URL) {
      const dbVersion = await prisma.workflowVersion.findFirst({
        where: { workflowId: workflow.id },
      });

      await prisma.workflowExecution.create({
        data: {
          id: executionId,
          workflowId: workflow.id,
          workflowVersionId: dbVersion?.id || `ver-cancel-${workflow.id}`,
          status: "queued",
        },
      });
    }

    const cancelled = await cancelExecutionJob(executionId);
    expect(cancelled).toBe(true);

    if (process.env.DATABASE_URL) {
      const record = await prisma.workflowExecution.findUnique({
        where: { id: executionId },
      });
      expect(record?.status).toBe("cancelled");
    }

    await WorkflowService.deleteWorkflow(workflow.id);
  });

  it("returns queue health report", async () => {
    const health = await getQueueHealth();
    expect(health).toHaveProperty("redisConnected");
    expect(health).toHaveProperty("queueActive");
    expect(health).toHaveProperty("waitingCount");
  });
});
