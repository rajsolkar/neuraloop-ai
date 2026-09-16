import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cancelExecutionJob } from "@/lib/queue/execution-queue";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: executionId } = await context.params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
    });

    if (!execution) {
      return NextResponse.json({ error: `Execution '${executionId}' not found.` }, { status: 404 });
    }

    if (orgId && execution.organizationId && execution.organizationId !== orgId) {
      return NextResponse.json({ error: "UNAUTHORIZED: Access denied" }, { status: 403 });
    }

    if (!orgId && userId && execution.userId && execution.userId !== userId) {
      return NextResponse.json({ error: "UNAUTHORIZED: Access denied" }, { status: 403 });
    }

    const now = new Date();

    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: {
        status: "cancelled",
        completedAt: now,
        error: "EXECUTION_CANCELLED: Execution was cancelled by user request.",
      },
    });

    await prisma.nodeExecution.updateMany({
      where: {
        executionId,
        status: { in: ["pending", "running"] },
      },
      data: {
        status: "cancelled",
        completedAt: now,
        error: "Node cancelled due to workflow cancellation.",
      },
    });

    await cancelExecutionJob(executionId);

    return NextResponse.json(
      {
        message: "Execution cancelled successfully",
        executionId,
        status: "cancelled",
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
