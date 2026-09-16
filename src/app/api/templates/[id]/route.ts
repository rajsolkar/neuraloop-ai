import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";
import { TemplateService } from "@/lib/templates/template-service";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, orgId } = await requireAuthUser();

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId || "");
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  const { id } = await context.params;

  try {
    const template = await TemplateService.getTemplate(id, {
      userId,
      organizationId: orgId,
    });

    return NextResponse.json({ template }, { status: 200 });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    const status = errorMsg.includes("UNAUTHORIZED") ? 403 : 404;

    return NextResponse.json(
      { error: { code: status === 403 ? "UNAUTHORIZED" : "NOT_FOUND", message: errorMsg } },
      { status },
    );
  }
}
