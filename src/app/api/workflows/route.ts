import { NextResponse } from "next/server";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { ZodError } from "zod";

export async function GET() {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const workflows = await WorkflowService.listWorkflows(userId);
    return NextResponse.json({ workflows }, { status: 200 });
  } catch (error) {
    console.error("GET /api/workflows error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list workflows" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json().catch(() => ({}));
    const workflow = await WorkflowService.createWorkflow(body, userId);
    return NextResponse.json({ workflow }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid workflow creation request",
            details: error.issues,
          },
        },
        { status: 400 },
      );
    }
    console.error("POST /api/workflows error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create workflow" } },
      { status: 500 },
    );
  }
}
