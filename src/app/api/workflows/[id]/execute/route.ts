import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { enqueueExecution } from "@/lib/queue/execution-queue";
import { makeId } from "@/lib/utils";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await context.params;
  try {
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
        }
      } catch (err) {
        console.warn("Prisma fetch version failed in execute API:", err);
      }
    }

    if (!versionId) {
      const canonical = await WorkflowService.getWorkflow(workflowId);
      if (!canonical) {
        return NextResponse.json(
          { error: `WORKFLOW_NOT_FOUND: Workflow '${workflowId}' not found.` },
          { status: 404 },
        );
      }
      versionId = `ver-fallback-${workflowId}`;
    }

    const executionId = `exec-${makeId("x")}`;
    const startedAt = new Date();

    // 1. Create WorkflowExecution record in Neon PostgreSQL with status "queued"
    if (process.env.DATABASE_URL) {
      try {
        await prisma.workflowExecution.create({
          data: {
            id: executionId,
            workflowId,
            workflowVersionId: versionId,
            status: "queued",
            startedAt,
            input: input as unknown as Prisma.InputJsonValue,
            metadata: metadata as unknown as Prisma.InputJsonValue,
          },
        });
      } catch (err) {
        console.warn("Failed to create WorkflowExecution record in DB:", err);
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

    // 3. Return queued response immediately without blocking HTTP connection
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
