import { NextResponse } from "next/server";
import { PublishService } from "@/lib/workflow/publish-service";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: workflowId } = await params;
  const workflow = await WorkflowService.getWorkflow(workflowId, userId, orgId);
  if (!workflow) {
    return NextResponse.json(
      { error: `Workflow with ID ${workflowId} not found` },
      { status: 404 },
    );
  }

  try {
    const versions = await PublishService.listVersions(workflowId, userId, orgId);
    return NextResponse.json({ versions }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
