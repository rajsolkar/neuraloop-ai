import { NextResponse } from "next/server";
import { PublishService } from "@/lib/workflow/publish-service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;

  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const versionNumber = Number(body.versionNumber);
    if (!versionNumber || isNaN(versionNumber)) {
      return NextResponse.json(
        { error: "VERSION_NUMBER_REQUIRED: Please specify a valid versionNumber to restore." },
        { status: 400 },
      );
    }

    const restoredWorkflow = await PublishService.restoreVersion(workflowId, versionNumber);
    return NextResponse.json(
      {
        message: `Restored version v${versionNumber} into new version v${restoredWorkflow.publishedVersionNumber}`,
        workflow: restoredWorkflow,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
