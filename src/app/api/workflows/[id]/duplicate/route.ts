import { NextResponse } from "next/server";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const copy = await WorkflowService.duplicateWorkflow(id, userId);
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
