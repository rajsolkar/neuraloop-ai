import { NextResponse } from "next/server";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { ExecutionQueue } from "@/lib/queue/execution-queue";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params;

  try {
    const workflow = await WorkflowService.getWorkflow(workflowId);
    if (!workflow) {
      return NextResponse.json(
        { error: `WORKFLOW_NOT_FOUND: Workflow with ID ${workflowId} not found.` },
        { status: 404 },
      );
    }

    if (workflow.status === "archived") {
      return NextResponse.json(
        { error: "WORKFLOW_ARCHIVED: Archived workflows reject incoming webhook execution traffic." },
        { status: 403 },
      );
    }

    if (workflow.status !== "published") {
      return NextResponse.json(
        { error: `WORKFLOW_NOT_PUBLISHED: Workflow is currently "${workflow.status}". Only published workflows receive production webhooks.` },
        { status: 403 },
      );
    }

    // Secret Authentication check
    const headerSecret = request.headers.get("x-webhook-secret") || request.headers.get("authorization")?.replace("Bearer ", "").trim();
    if (workflow.webhookSecret && workflow.webhookSecret.trim() !== "") {
      if (!headerSecret || headerSecret !== workflow.webhookSecret) {
        return NextResponse.json(
          { error: "UNAUTHORIZED: Invalid or missing webhook secret in x-webhook-secret header." },
          { status: 401 },
        );
      }
    }

    let payload: Record<string, unknown> = {};
    try {
      const text = await request.text();
      if (text.trim()) {
        payload = JSON.parse(text);
      }
    } catch {
      payload = {};
    }

    const forwardHeader = request.headers.get("x-forwarded-for");
    const clientIp = forwardHeader ? forwardHeader.split(",")[0].trim() : "webhook-client";

    // Resolve published version ID
    let publishedVersionId = workflow.publishedVersionId || `${workflowId}-v1`;
    let publishedVersionNumber = workflow.publishedVersionNumber || 1;

    if (process.env.DATABASE_URL) {
      const dbWf = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { publishedVersionId: true, publishedVersionNumber: true },
      });
      if (dbWf?.publishedVersionId) {
        publishedVersionId = dbWf.publishedVersionId;
        publishedVersionNumber = dbWf.publishedVersionNumber || publishedVersionNumber;
      }
    }

    // Enqueue execution using Phase 5 Queue System with source: "webhook"
    const execution = await ExecutionQueue.enqueueExecution({
      workflowId,
      workflowVersionId: publishedVersionId,
      input: payload,
      source: "webhook",
      triggerMetadata: {
        clientIp,
        userAgent: request.headers.get("user-agent") || undefined,
        contentType: request.headers.get("content-type") || undefined,
        receivedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json(
      {
        success: true,
        executionId: execution.id,
        status: execution.status,
        versionNumber: publishedVersionNumber,
        message: "Production webhook received and queued for execution",
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Use POST requests to trigger this webhook. Send an HTTP POST request with a JSON payload to trigger workflow execution.",
    },
    { status: 405 },
  );
}
