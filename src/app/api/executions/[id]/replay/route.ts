import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { ReplayService } from "@/lib/execution/replay-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: executionId } = await context.params;

  let body: Record<string, unknown> = {};
  try {
    body = await request.json();
  } catch {
    // Optional request body
  }

  const fromNodeId = typeof body.fromNodeId === "string" ? body.fromNodeId : undefined;

  try {
    const replayRecord = await ReplayService.replayExecution({
      executionId,
      userId,
      fromNodeId,
    });

    return NextResponse.json(
      {
        message: fromNodeId ? "Partial replay initiated" : "Full workflow replay initiated",
        execution: replayRecord,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
