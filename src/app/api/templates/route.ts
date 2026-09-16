import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";
import { TemplateService } from "@/lib/templates/template-service";

export async function GET(request: Request) {
  const { userId, orgId } = await requireAuthUser();

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId || "");
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search") || undefined;
    const category = url.searchParams.get("category") || undefined;
    const featuredParam = url.searchParams.get("featured");
    const pageParam = url.searchParams.get("page");
    const limitParam = url.searchParams.get("limit");

    const featured = featuredParam !== null ? featuredParam === "true" : undefined;
    const page = pageParam ? parseInt(pageParam, 10) : 1;
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const result = await TemplateService.listTemplates({
      search,
      category,
      featured,
      page,
      limit,
      userId,
      organizationId: orgId,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("GET /api/templates error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list templates" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    if (!body.name || !body.definition) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields: name, definition" } },
        { status: 400 },
      );
    }

    const template = await TemplateService.publishTemplate({
      workflowId: body.workflowId || "",
      userId,
      organizationId: orgId,
      name: body.name,
      description: body.description || "",
      category: body.category || "custom",
      icon: body.icon,
      tags: body.tags,
      isPublic: body.isPublic ?? true,
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("POST /api/templates error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: errorMsg } },
      { status: 500 },
    );
  }
}
