import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { WorkflowService } from "@/lib/workflow/workflow-service";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: workflowId } = await context.params;

  const workflow = await WorkflowService.getWorkflow(workflowId, userId);
  if (!workflow) {
    return NextResponse.json(
      { error: `Workflow with ID ${workflowId} not found` },
      { status: 404 },
    );
  }

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ executions: [] }, { status: 200 });
  }

  try {
    const executions = await prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: { startedAt: "desc" },
      take: 20,
      include: {
        nodeExecutions: true,
      },
    });

    return NextResponse.json({ executions }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
