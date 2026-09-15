import { NextResponse } from "next/server";
import { WorkflowService } from "@/lib/workflow/workflow-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const copy = await WorkflowService.duplicateWorkflow(id);
    return NextResponse.json({ workflow: copy }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes("missing")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 },
      );
    }
    console.error("POST /api/workflows/[id]/duplicate error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to duplicate workflow" } },
      { status: 500 },
    );
  }
}
