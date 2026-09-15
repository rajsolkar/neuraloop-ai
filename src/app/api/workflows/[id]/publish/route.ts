import { NextResponse } from "next/server";
import { PublishService } from "@/lib/workflow/publish-service";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;

  try {
    let body: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        body = JSON.parse(text);
      }
    } catch {
      body = {};
    }

    const activateImmediately = body.activateImmediately !== false;
    const nodes = Array.isArray(body.nodes) ? (body.nodes as WorkflowNode[]) : undefined;
    const edges = Array.isArray(body.edges) ? (body.edges as WorkflowEdge[]) : undefined;

    const publishedWorkflow = await PublishService.publishWorkflow(workflowId, {
      activateImmediately,
      nodes,
      edges,
    });
    return NextResponse.json(
      {
        message: `Workflow "${publishedWorkflow.name}" published successfully (v${publishedWorkflow.publishedVersionNumber})`,
        workflow: publishedWorkflow,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    const isValidationError = rawMsg.includes("PUBLISH_VALIDATION_FAILED");
    const isCollision = rawMsg.includes("Version collision") || rawMsg.includes("P2002");

    const userFriendlyError = isValidationError
      ? rawMsg
      : isCollision
      ? "Version collision detected while publishing. Please retry publishing."
      : rawMsg.replace(/(\r\n|\n|\r)/gm, " ").substring(0, 200);

    const status = isValidationError ? 400 : isCollision ? 409 : 500;

    return NextResponse.json({ error: userFriendlyError }, { status });
  }
}
