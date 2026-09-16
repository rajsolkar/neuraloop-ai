import { NextResponse } from "next/server";
import { PublishService } from "@/lib/workflow/publish-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: workflowId } = await params;

  try {
    const newSecret = await PublishService.rotateWebhookSecret(workflowId, userId);
    return NextResponse.json(
      {
        message: "Webhook secret rotated successfully",
        webhookSecret: newSecret,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
