import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";
import { TemplateService } from "@/lib/templates/template-service";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  const { id: templateId } = await context.params;

  try {
    let customName: string | undefined;
    try {
      const body = await request.json();
      if (body && typeof body.name === "string") {
        customName = body.name;
      }
    } catch {
      // JSON body is optional for cloning
    }

    const workflow = await TemplateService.cloneTemplate({
      templateId,
      userId,
      organizationId: orgId,
      customName,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Template cloned successfully into workspace",
        workflowId: workflow.id,
        workflow,
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`POST /api/templates/${templateId}/clone error:`, error);
    const status = errorMsg.includes("UNAUTHORIZED") ? 403 : errorMsg.includes("not found") ? 404 : 500;

    return NextResponse.json(
      { error: { code: status === 403 ? "UNAUTHORIZED" : "CLONE_ERROR", message: errorMsg } },
      { status },
    );
  }
}
