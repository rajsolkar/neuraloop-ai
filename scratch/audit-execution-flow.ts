import { WorkflowService } from "../src/lib/workflow/workflow-service";
import { createWorkflowNode } from "../src/lib/workflow/create-node";
import { enqueueExecution } from "../src/lib/queue/execution-queue";
import { prisma } from "../src/lib/prisma";
import { makeId } from "../src/lib/utils";

async function runAudit() {
  console.log("=== STARTING WORKFLOW EXECUTION DEBUGGING AUDIT ===");

  // 1. Create a test workflow
  const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
  const delay = createWorkflowNode("delay", { x: 200, y: 0 });
  delay.data.config = { duration: 1, unit: "seconds" };

  const workflow = await WorkflowService.createWorkflow({
    name: "Audit Test Workflow",
    nodes: [trigger, delay],
    edges: [{ id: "e1", source: trigger.id, target: delay.id, sourceHandle: "out", targetHandle: "in" }],
  });

  const dbVersion = await prisma.workflowVersion.findFirst({
    where: { workflowId: workflow.id },
  });

  const versionId = dbVersion?.id || `ver-fallback-${workflow.id}`;
  const executionId = `exec-${makeId("x")}`;

  console.log(`Step 1: Generated API executionId = '${executionId}' for workflow '${workflow.id}'`);

  // 2. Create WorkflowExecution in DB (queued status)
  await prisma.workflowExecution.create({
    data: {
      id: executionId,
      workflowId: workflow.id,
      workflowVersionId: versionId,
      status: "queued",
      startedAt: new Date(),
    },
  });
  console.log(`Step 2: DB record '${executionId}' created with status='queued'`);

  // 3. Enqueue execution
  console.log(`Step 3: Enqueuing job '${executionId}'...`);
  const queueResult = await enqueueExecution({
    executionId,
    workflowId: workflow.id,
    workflowVersionId: versionId,
    input: { test: true },
  });
  console.log(`Step 4: Queue result mode = '${queueResult.mode}'`);

  // 4. Wait for fallback or background worker execution to process
  await new Promise((resolve) => setTimeout(resolve, 200));

  // 5. Inspect database for execution rows
  console.log("=== CHECKING DATABASE RECORDS AFTER EXECUTION ===");

  const originalRecord = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
  });
  console.log(`Original execution record polled by UI ('${executionId}'):`, originalRecord);

  const allRecordsForWorkflow = await prisma.workflowExecution.findMany({
    where: { workflowId: workflow.id },
  });
  console.log(`All execution records for workflow '${workflow.id}':`, allRecordsForWorkflow);

  // Cleanup
  await WorkflowService.deleteWorkflow(workflow.id);
  console.log("=== AUDIT SCRIPT FINISHED ===");
}

runAudit().catch(console.error);
