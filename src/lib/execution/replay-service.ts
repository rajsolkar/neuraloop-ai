import { prisma } from "@/lib/prisma";
import { WorkflowEngine } from "./engine";
import type { WorkflowExecutionRecord } from "./types";
import { makeId } from "@/lib/utils";

export interface ReplayOptions {
  executionId: string;
  userId?: string | null;
  fromNodeId?: string | null;
}

export class ReplayService {
  /**
   * Replay an existing workflow execution.
   * If `fromNodeId` is provided, performs a partial replay reusing upstream outputs.
   */
  static async replayExecution(options: ReplayOptions): Promise<WorkflowExecutionRecord> {
    const { executionId, userId, fromNodeId } = options;

    if (!process.env.DATABASE_URL) {
      throw new Error("REPLAY_FAILED: Database connection is required for execution replay.");
    }

    const existingExec = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        nodeExecutions: true,
      },
    });

    if (!existingExec) {
      throw new Error(`REPLAY_FAILED: Execution with ID '${executionId}' not found.`);
    }

    const newExecutionId = `exec-replay-${makeId("r")}`;
    const triggerInput = (existingExec.input as Record<string, unknown>) || {};
    const metadata = {
      ...((existingExec.metadata as Record<string, unknown>) || {}),
      replayedFromId: existingExec.id,
      replayMode: fromNodeId ? "partial" : "full",
      fromNodeId: fromNodeId || null,
    };

    if (!fromNodeId) {
      // Full Workflow Replay
      return WorkflowEngine.executeWorkflow({
        workflowId: existingExec.workflowId,
        versionId: existingExec.workflowVersionId,
        executionId: newExecutionId,
        userId: userId || existingExec.userId,
        input: triggerInput,
        metadata: {
          ...metadata,
          parentExecutionId: existingExec.id,
        },
      });
    }

    // Partial Replay from specific node:
    // Pass pre-cached outputs of upstream successful nodeExecutions in metadata
    const cachedNodeOutputs: Record<string, unknown> = {};
    for (const ne of existingExec.nodeExecutions) {
      if (ne.status === "success" && ne.nodeId !== fromNodeId && ne.output) {
        cachedNodeOutputs[ne.nodeId] = ne.output as Record<string, unknown>;
      }
    }

    return WorkflowEngine.executeWorkflow({
      workflowId: existingExec.workflowId,
      versionId: existingExec.workflowVersionId,
      executionId: newExecutionId,
      userId: userId || existingExec.userId,
      input: triggerInput,
      metadata: {
        ...metadata,
        parentExecutionId: existingExec.id,
        cachedNodeOutputs,
        partialReplayNodeId: fromNodeId,
      },
    });
  }
}
