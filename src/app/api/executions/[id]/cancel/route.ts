import { NextResponse } from "next/server";
import { cancelExecutionJob } from "@/lib/queue/execution-queue";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: executionId } = await context.params;

  try {
    const success = await cancelExecutionJob(executionId);
    if (!success) {
      return NextResponse.json(
        { error: `Execution '${executionId}' could not be cancelled or does not exist.` },
        { status: 400 },
      );
    }

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
