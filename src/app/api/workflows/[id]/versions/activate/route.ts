import { NextResponse } from "next/server";
import { PublishService } from "@/lib/workflow/publish-service";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export async function POST(
  request: Request,
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
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const versionNumber = Number(body.versionNumber);
    if (!versionNumber || isNaN(versionNumber)) {
      return NextResponse.json(
        { error: "VERSION_NUMBER_REQUIRED: Please specify a valid versionNumber to activate." },
        { status: 400 },
      );
    }

    const activatedWorkflow = await PublishService.setActiveVersion(workflowId, versionNumber);
    return NextResponse.json(
      {
        message: `Version v${versionNumber} is now active and live for production execution`,
        workflow: activatedWorkflow,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
