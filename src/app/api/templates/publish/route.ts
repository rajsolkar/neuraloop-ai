import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";
import { TemplateService } from "@/lib/templates/template-service";

export async function POST(request: Request) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    const { workflowId, name, description, category, icon, tags, isPublic } = body;

    if (!workflowId || !name) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields: workflowId, name" } },
        { status: 400 },
      );
    }

    const template = await TemplateService.publishTemplate({
      workflowId,
      userId,
      organizationId: orgId,
      name,
      description: description || "",
      category: category || "custom",
      icon: icon || "Sparkles",
      tags: tags || [],
      isPublic: isPublic ?? true,
    });

    return NextResponse.json({ success: true, template }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/templates/publish error:", error);
    const status = errorMsg.includes("UNAUTHORIZED") ? 403 : errorMsg.includes("not found") ? 404 : 500;

    return NextResponse.json(
      { error: { code: "PUBLISH_ERROR", message: errorMsg } },
      { status },
    );
  }
}
