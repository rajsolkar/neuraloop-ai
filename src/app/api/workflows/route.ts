import { NextResponse } from "next/server";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { ZodError } from "zod";

export async function GET() {
  try {
    const workflows = await WorkflowService.listWorkflows();
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
  try {
    const body = await request.json().catch(() => ({}));
    const workflow = await WorkflowService.createWorkflow(body);
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
