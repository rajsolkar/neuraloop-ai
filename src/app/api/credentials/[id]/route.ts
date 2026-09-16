import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { CredentialService } from "@/lib/security/credential-service";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const body = await request.json();

    const updated = await CredentialService.updateCredential(id, userId, {
      name: body.name,
      provider: body.provider,
      value: body.value,
      metadata: body.metadata,
    });

    if (!updated) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Credential with ID ${id} not found` } },
        { status: 404 },
      );
    }

    return NextResponse.json({ credential: updated }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/credentials/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to update credential" } },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const deleted = await CredentialService.deleteCredential(id, userId);
    if (!deleted) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: `Credential with ID ${id} not found` } },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("DELETE /api/credentials/[id] error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to delete credential" } },
      { status: 500 },
    );
  }
}
