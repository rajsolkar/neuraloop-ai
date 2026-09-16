import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { CredentialService } from "@/lib/security/credential-service";
import { limitAuthSensitiveRoute, createRateLimitResponse } from "@/lib/security/rate-limit";

export async function GET(request: Request) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const credentials = await CredentialService.listCredentials(userId, orgId);
    return NextResponse.json({ credentials }, { status: 200 });
  } catch (error) {
    console.error("GET /api/credentials error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to list credentials" } },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { userId, orgId, orgRole, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAuthSensitiveRoute(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    const body = await request.json();
    if (!body.name || !body.provider || !body.value) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Missing required fields: name, provider, value" } },
        { status: 400 },
      );
    }

    const credential = await CredentialService.createCredential(
      userId,
      {
        name: body.name,
        provider: body.provider,
        value: body.value,
        metadata: body.metadata,
      },
      orgId,
      orgRole,
    );

    return NextResponse.json({ credential }, { status: 201 });
  } catch (error) {
    console.error("POST /api/credentials error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to create credential" } },
      { status: 500 },
    );
  }
}
