import { NextResponse } from "next/server";
import crypto from "crypto";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { ExecutionQueue } from "@/lib/queue/execution-queue";
import { prisma } from "@/lib/prisma";
import { limitWebhook, createRateLimitResponse } from "@/lib/security/rate-limit";
import { checkPayloadSize } from "@/lib/security/payload-limit";

function timingSafeSecretMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: workflowId } = await params;

  // 1. Payload size protection (1 MB limit)
  const payloadCheck = await checkPayloadSize(request, 1024 * 1024);
  if (!payloadCheck.valid && payloadCheck.response) {
    return payloadCheck.response;
  }

  // 2. Rate limiting protection (60 req/min per IP + webhookId)
  const rateLimitResult = await limitWebhook(request, workflowId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

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
      if (!headerSecret || !timingSafeSecretMatch(headerSecret, workflow.webhookSecret)) {
        return NextResponse.json(
          { error: "UNAUTHORIZED: Invalid or missing webhook secret in x-webhook-secret header." },
          { status: 401 },
        );
      }
    }

    let payload: Record<string, unknown> = {};
    try {
      const text = payloadCheck.bodyText ?? (await request.text());
      if (text.trim()) {
        payload = JSON.parse(text);
      }
    } catch {
      payload = {};
    }

    const forwardHeader = request.headers.get("x-forwarded-for");
    const clientIp = forwardHeader ? forwardHeader.split(",")[0].trim() : "webhook-client";

    // Resolve published version ID & owner userId
    let publishedVersionId = workflow.publishedVersionId || `${workflowId}-v1`;
    let publishedVersionNumber = workflow.publishedVersionNumber || 1;
    let ownerUserId: string | null = null;

    if (process.env.DATABASE_URL) {
      const dbWf = await prisma.workflow.findUnique({
        where: { id: workflowId },
        select: { userId: true, publishedVersionId: true, publishedVersionNumber: true },
      });
      if (dbWf) {
        ownerUserId = dbWf.userId;
        if (dbWf.publishedVersionId) {
          publishedVersionId = dbWf.publishedVersionId;
          publishedVersionNumber = dbWf.publishedVersionNumber || publishedVersionNumber;
        }
      }
    }

    // Enqueue execution using Phase 5 Queue System with source: "webhook" and ownerUserId
    const execution = await ExecutionQueue.enqueueExecution({
      workflowId,
      workflowVersionId: publishedVersionId,
      userId: ownerUserId,
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
