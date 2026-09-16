import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { CredentialService } from "@/lib/security/credential-service";

export async function POST(request: Request) {
  const { errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const body = await request.json();
    const provider = (body.provider as string) || "";
    const value = (body.value as string) || "";
    const metadata = (body.metadata as Record<string, unknown>) || undefined;

    if (!provider || !value) {
      return NextResponse.json(
        { error: "Provider and secret value are required to test connection." },
        { status: 400 },
      );
    }

    const testResult = await CredentialService.testCredentialConnectivity(provider, value, metadata);
    return NextResponse.json(testResult, { status: 200 });
  } catch (error) {
    console.error("POST /api/credentials/test error:", error);
    return NextResponse.json(
      { success: false, message: "Connectivity test failed due to an internal error." },
      { status: 500 },
    );
  }
}
