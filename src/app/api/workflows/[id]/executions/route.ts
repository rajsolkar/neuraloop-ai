import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await context.params;

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
