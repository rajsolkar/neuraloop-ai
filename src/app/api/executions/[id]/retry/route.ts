import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { enqueueExecution } from "@/lib/queue/execution-queue";
import { makeId } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: originalExecutionId } = await context.params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const original = await prisma.workflowExecution.findUnique({
      where: { id: originalExecutionId },
    });

    if (!original) {
      return NextResponse.json({ error: `Original execution '${originalExecutionId}' not found.` }, { status: 404 });
    }

    if (orgId && original.organizationId && original.organizationId !== orgId) {
      return NextResponse.json({ error: "UNAUTHORIZED: Access denied" }, { status: 403 });
    }

    if (!orgId && userId && original.userId && original.userId !== userId) {
      return NextResponse.json({ error: "UNAUTHORIZED: Access denied" }, { status: 403 });
    }

    const newExecutionId = `exec-retry-${makeId("x")}`;
    const newRetryCount = (original.retryCount || 0) + 1;
    const startedAt = new Date();

    const input = (original.input as Record<string, unknown>) || {};
    const metadata = (original.metadata as Record<string, unknown>) || {};

    // Create child WorkflowExecution record in Neon PostgreSQL
    const newExecution = await prisma.workflowExecution.create({
      data: {
        id: newExecutionId,
        userId: original.userId,
        organizationId: original.organizationId,
        workflowId: original.workflowId,
        workflowVersionId: original.workflowVersionId,
        parentExecutionId: originalExecutionId,
        retryCount: newRetryCount,
        status: "queued",
        source: original.source || "manual",
        startedAt,
        input: input as unknown as Prisma.InputJsonValue,
        metadata: {
          ...metadata,
          retryOf: originalExecutionId,
          retryCount: newRetryCount,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Enqueue execution job into BullMQ
    const queueResult = await enqueueExecution({
      executionId: newExecutionId,
      workflowId: original.workflowId,
      workflowVersionId: original.workflowVersionId,
      input,
      metadata: {
        userId: original.userId,
        parentExecutionId: originalExecutionId,
        retryCount: newRetryCount,
      },
    });

    return NextResponse.json(
      {
        message: "Workflow execution replayed/retried successfully",
        execution: {
          id: newExecution.id,
          parentExecutionId: originalExecutionId,
          retryCount: newRetryCount,
          workflowId: original.workflowId,
          workflowVersionId: original.workflowVersionId,
          status: "queued",
          startedAt: startedAt.toISOString(),
          queueMode: queueResult.mode,
        },
      },
      { status: 201 },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
