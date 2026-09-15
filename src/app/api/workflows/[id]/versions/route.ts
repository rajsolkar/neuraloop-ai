import { NextResponse } from "next/server";
import { PublishService } from "@/lib/workflow/publish-service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;

  try {
    const versions = await PublishService.listVersions(workflowId);
    return NextResponse.json({ versions }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
