import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { WorkflowAnalyticsService } from "@/lib/execution/workflow-analytics";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id } = await context.params;

  try {
    const metrics = await WorkflowAnalyticsService.getWorkflowMetrics(id);
    return NextResponse.json({ metrics });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
