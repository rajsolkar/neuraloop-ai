import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/get-auth-user";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";
import { TemplateService } from "@/lib/templates/template-service";

export async function GET(request: Request) {
  // Starters are canonical and shared: accessible by authenticated users and public gallery visitors
  const { userId } = await getAuthUser();

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId || "public_anonymous");
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const result = await TemplateService.getFormattedStarterTemplates();

    return NextResponse.json(
      {
        success: true,
        templates: result.starters,
        total: result.starters.length,
        source: result.source,
        diagnostics: result.diagnostics,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("GET /api/templates/starters error:", errorMsg);

    return NextResponse.json(
      {
        error: {
          code: "STARTER_FETCH_FAILED",
          message: "Unable to retrieve starter workflows from persistent storage.",
          diagnostics: {
            timestamp: new Date().toISOString(),
          },
        },
      },
      { status: 500 },
    );
  }
}
