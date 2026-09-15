import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ executions: [] }, { status: 200 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limitStr = searchParams.get("limit");
  const limit = limitStr ? parseInt(limitStr, 10) : 50;

  try {
    const whereClause: Record<string, unknown> = {};
    if (status && status !== "all") {
      whereClause.status = status;
    }

    const executions = await prisma.workflowExecution.findMany({
      where: whereClause,
      orderBy: { startedAt: "desc" },
      take: limit,
      include: {
        workflow: {
          select: { name: true },
        },
        version: {
          select: { version: true, definition: true },
        },
        nodeExecutions: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    const formattedExecutions = executions.map((exec) => ({
      id: exec.id,
      workflowId: exec.workflowId,
      workflowName: exec.workflow?.name || exec.workflowId,
      workflowVersionId: exec.workflowVersionId,
      versionNumber: exec.version?.version || 1,
      status: exec.status,
      source: exec.source || "manual",
      startedAt: exec.startedAt.toISOString(),
      completedAt: exec.completedAt ? exec.completedAt.toISOString() : null,
      duration: exec.duration,
      input: exec.input,
      output: exec.output,
      error: exec.error,
      nodeExecutions: exec.nodeExecutions.map((ne) => ({
        id: ne.id,
        executionId: ne.executionId,
        nodeId: ne.nodeId,
        nodeType: ne.nodeType,
        status: ne.status,
        startedAt: ne.startedAt.toISOString(),
        completedAt: ne.completedAt ? ne.completedAt.toISOString() : null,
        duration: ne.duration,
        input: ne.input,
        output: ne.output,
        error: ne.error,
        attempt: ne.attempt,
      })),
    }));

    return NextResponse.json({ executions: formattedExecutions }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
