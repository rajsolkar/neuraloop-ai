import { WorkflowService } from "../src/lib/workflow/workflow-service";
import { createWorkflowNode } from "../src/lib/workflow/create-node";
import { enqueueExecution, cancelExecutionJob } from "../src/lib/queue/execution-queue";
import { prisma } from "../src/lib/prisma";
import { makeId } from "../src/lib/utils";

async function verifyFix() {
  console.log("==================================================");
  console.log("VERIFYING PHASE 5 EXECUTION ID INTEGRATION FIX");
  console.log("==================================================");

  // Create test workflow
  const trigger = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
  const delay = createWorkflowNode("delay", { x: 200, y: 0 });
  delay.data.config = { duration: 1, unit: "seconds" };

  const workflow = await WorkflowService.createWorkflow({
    name: "Execution Fix Verification Workflow",
    nodes: [trigger, delay],
    edges: [{ id: "e1", source: trigger.id, target: delay.id, sourceHandle: "out", targetHandle: "in" }],
  });

  const dbVersion = await prisma.workflowVersion.findFirst({
    where: { workflowId: workflow.id },
  });
  const versionId = dbVersion?.id || `ver-fallback-${workflow.id}`;

  const countBefore = await prisma.workflowExecution.count({
    where: { workflowId: workflow.id },
  });
  console.log(`[A] WorkflowExecution count BEFORE run: ${countBefore}`);

  const executionId = `exec-${makeId("x")}`;
  const startedAt = new Date();

  // 1. Create single queued WorkflowExecution row (simulating API POST route)
  await prisma.workflowExecution.create({
    data: {
      id: executionId,
      workflowId: workflow.id,
      workflowVersionId: versionId,
      status: "queued",
      startedAt,
      input: { payload: "verification-data" },
    },
  });

  console.log(`[C] Created queued execution row with ID '${executionId}'`);

  // 2. Enqueue execution (Worker or async fallback picks it up)
  await enqueueExecution({
    executionId,
    workflowId: workflow.id,
    workflowVersionId: versionId,
    input: { payload: "verification-data" },
  });

  // Wait for worker/engine execution to complete (delay node + DB queries take ~1500ms)
  await new Promise((resolve) => setTimeout(resolve, 2500));

  // 3. Verify Database Execution Records
  const countAfter = await prisma.workflowExecution.count({
    where: { workflowId: workflow.id },
  });
  console.log(`[A] WorkflowExecution count AFTER run: ${countAfter}`);
  console.log(`[A & B] Net new execution rows created for workflow: ${countAfter - countBefore}`);

  if (countAfter - countBefore !== 1) {
    throw new Error(`FAIL: Expected exactly 1 new row, found ${countAfter - countBefore}`);
  }

  const finalExecRecord = await prisma.workflowExecution.findUnique({
    where: { id: executionId },
    include: { nodeExecutions: true },
  });

  console.log(`[C] Final execution status for ID '${executionId}': '${finalExecRecord?.status}'`);
  if (finalExecRecord?.status !== "success") {
    throw new Error(`FAIL: Expected status 'success', got '${finalExecRecord?.status}'`);
  }

  console.log(`[F] NodeExecution records created: ${finalExecRecord?.nodeExecutions.length}`);
  for (const ne of finalExecRecord?.nodeExecutions || []) {
    if (ne.executionId !== executionId) {
      throw new Error(`FAIL: NodeExecution ${ne.id} references mismatching executionId ${ne.executionId}`);
    }
  }
  console.log(`[F] All NodeExecution records correctly reference executionId '${executionId}'!`);

  // 4. Verify Cancel Execution
  const cancelExecutionId = `exec-cancel-${makeId("x")}`;
  await prisma.workflowExecution.create({
    data: {
      id: cancelExecutionId,
      workflowId: workflow.id,
      workflowVersionId: versionId,
      status: "queued",
      startedAt: new Date(),
    },
  });
  const cancelled = await cancelExecutionJob(cancelExecutionId);
  console.log(`[G] Cancellation helper returned: ${cancelled}`);
  const cancelledRecord = await prisma.workflowExecution.findUnique({
    where: { id: cancelExecutionId },
  });
  console.log(`[G] Cancelled DB record status: '${cancelledRecord?.status}'`);
  if (cancelledRecord?.status !== "cancelled") {
    throw new Error("FAIL: Cancelled record status is not 'cancelled'");
  }

  // Cleanup
  await WorkflowService.deleteWorkflow(workflow.id);
  console.log("==================================================");
  console.log("VERIFICATION CLEANLY PASSED: ALL CRITERIA MET");
  console.log("==================================================");
}

verifyFix().catch((err) => {
  console.error("VERIFICATION FAILED:", err);
  process.exit(1);
});
