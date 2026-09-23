import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { enqueueExecution } from "@/lib/queue/execution-queue";
import { makeId } from "@/lib/utils";
import { limitWorkflowExecution, createRateLimitResponse } from "@/lib/security/rate-limit";
import { checkExecutionConcurrency } from "@/lib/security/concurrency-limit";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  // 1. Rate Limiting Protection (30 req/min per user)
  const rateLimitResult = await limitWorkflowExecution(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  // 2. Execution Concurrency Protection (Max 5 active executions per user)
  const concurrencyCheck = await checkExecutionConcurrency(userId, 5);
  if (!concurrencyCheck.allowed && concurrencyCheck.response) {
    return concurrencyCheck.response;
  }

  const { id: workflowId } = await context.params;
  try {
    const workflow = await WorkflowService.getWorkflow(workflowId, userId);
    if (!workflow) {
      return NextResponse.json(
        { error: `WORKFLOW_NOT_FOUND: Workflow '${workflowId}' not found.` },
        { status: 404 },
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const versionIdInput = body.versionId as string | undefined;
    const input = (body.input as Record<string, unknown>) || {};
    const metadata = (body.metadata as Record<string, unknown>) || {};

    let versionId = versionIdInput;
    let versionNumber = 1;

    // Resolve intended immutable WorkflowVersion from DB
    if (process.env.DATABASE_URL) {
      try {
        let dbVersion;
        if (versionId) {
          dbVersion = await prisma.workflowVersion.findUnique({
            where: { id: versionId },
          });
        } else {
          dbVersion = await prisma.workflowVersion.findFirst({
            where: { workflowId },
            orderBy: { version: "desc" },
          });
        }

        if (dbVersion) {
          versionId = dbVersion.id;
          versionNumber = dbVersion.version;
        } else {
          // Auto-create initial WorkflowVersion (v1) in DB if workflow version record doesn't exist yet
          const newVersionId = makeId("ver");
          const canonicalDef = {
            name: workflow.name,
            description: workflow.description || "",
            status: workflow.status,
            nodes: workflow.nodes || [],
            edges: workflow.edges || [],
          };
          const createdVer = await prisma.workflowVersion.create({
            data: {
              id: newVersionId,
              workflowId,
              version: 1,
              definition: canonicalDef as unknown as Prisma.InputJsonValue,
            },
          });
          versionId = createdVer.id;
          versionNumber = 1;
        }
      } catch (err) {
        console.warn("Prisma fetch/create version failed in execute API:", err);
      }
    }

    if (!versionId) {
      versionId = `ver-fallback-${workflowId}`;
    }

    const executionId = `exec-${makeId("x")}`;
    const startedAt = new Date();

    // 1. Create WorkflowExecution record in Neon PostgreSQL with status "queued" and userId
    if (process.env.DATABASE_URL) {
      try {
        await prisma.workflowExecution.create({
          data: {
            id: executionId,
            userId,
            workflowId,
            workflowVersionId: versionId,
            status: "queued",
            startedAt,
            input: input as unknown as Prisma.InputJsonValue,
            metadata: metadata as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        console.error("Failed to create WorkflowExecution record in DB:", err);
        return NextResponse.json(
          { error: `EXECUTION_CREATION_FAILED: ${err instanceof Error ? err.message : String(err)}` },
          { status: 500 },
        );
      }
    }

    // 2. Enqueue execution job into BullMQ / Queue
    const queueResult = await enqueueExecution({
      executionId,
      workflowId,
      workflowVersionId: versionId,
      input,
      metadata,
    });
    console.log("QUEUE RESULT:", queueResult);

    // 3. Return queued response immediately without blocking HTTP connection
    console.log("EXECUTION CREATED:",executionId);

    return NextResponse.json(
      {
        message: "Workflow execution queued successfully",
        execution: {
          id: executionId,
          workflowId,
          workflowVersionId: versionId,
          versionNumber,
          status: "queued",
          startedAt: startedAt.toISOString(),
          input,
          queueMode: queueResult.mode,
        },
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
