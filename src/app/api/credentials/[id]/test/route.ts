import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { CredentialService } from "@/lib/security/credential-service";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(_request: Request, { params }: RouteParams) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const { id } = await params;
    const credRecord = await prisma.credential.findFirst({
      where: { id, userId },
    });

    if (!credRecord) {
      return NextResponse.json(
        { success: false, message: `Credential with ID ${id} not found.` },
        { status: 404 },
      );
    }

    const decrypted = await CredentialService.getDecryptedCredential(id, userId);
    if (!decrypted) {
      return NextResponse.json(
        { success: false, message: "Unable to decrypt credential secret." },
        { status: 400 },
      );
    }

    const testResult = await CredentialService.testCredentialConnectivity(
      credRecord.provider,
      decrypted.secret,
      decrypted.metadata || undefined,
    );

    return NextResponse.json(testResult, { status: 200 });
  } catch (error) {
    console.error("POST /api/credentials/[id]/test error:", error);
    return NextResponse.json(
      { success: false, message: "Connectivity test failed due to an internal error." },
      { status: 500 },
    );
  }
}
