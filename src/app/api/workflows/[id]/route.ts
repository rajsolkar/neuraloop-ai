import { NextResponse } from "next/server";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { ZodError } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const workflow = await WorkflowService.getWorkflow(id, userId, orgId);
    if (!workflow) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Workflow with ID ${id} not found` } },
        { status: 404 },
      );
    }
    return NextResponse.json({ workflow }, { status: 200 });
  } catch (error) {
    console.error("GET /api/workflows/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch workflow" } },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();
    const workflow = await WorkflowService.updateWorkflow(id, body, userId);
    return NextResponse.json({ workflow }, { status: 200 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid workflow update payload",
            details: error.issues,
          },
        },
        { status: 400 },
      );
    }
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: error.message } },
        { status: 404 },
      );
    }
    console.error("PUT /api/workflows/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to save workflow" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId, orgId, orgRole, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const deleted = await WorkflowService.deleteWorkflow(id, userId, orgId, orgRole);
    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Workflow with ID ${id} not found` } },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/workflows/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete workflow" } },
      { status: 500 },
    );
  }
}
