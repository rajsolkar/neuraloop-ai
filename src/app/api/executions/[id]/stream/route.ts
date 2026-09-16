import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const { id: executionId } = await context.params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  // 1. Verify execution existence and ownership scoping
  try {
    const initialExecution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      select: { userId: true, organizationId: true },
    });

    if (!initialExecution) {
      return NextResponse.json({ error: `Execution '${executionId}' not found.` }, { status: 404 });
    }

    if (orgId && initialExecution.organizationId && initialExecution.organizationId !== orgId) {
      return NextResponse.json({ error: "UNAUTHORIZED: Access denied" }, { status: 403 });
    }

    if (!orgId && userId && initialExecution.userId && initialExecution.userId !== userId) {
      return NextResponse.json({ error: "UNAUTHORIZED: Access denied" }, { status: 403 });
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // 2. Initialize ReadableStream for Server-Sent Events (SSE)
  const encoder = new TextEncoder();
  let isStreamClosed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: string, data: Record<string, unknown>) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          isStreamClosed = true;
        }
      };

      const sendComment = (comment: string) => {
        if (isStreamClosed) return;
        try {
          controller.enqueue(encoder.encode(`: ${comment}\n\n`));
        } catch {
          isStreamClosed = true;
        }
      };

      let heartbeatTimer: NodeJS.Timeout | null = null;

      // Heartbeat comment every 20 seconds to keep connection alive
      heartbeatTimer = setInterval(() => {
        if (isStreamClosed) {
          if (heartbeatTimer) clearInterval(heartbeatTimer);
          return;
        }
        sendComment("heartbeat");
      }, 20000);

      const knownNodeStates = new Map<string, string>();
      let isCompleted = false;

      // Poll execution state with adaptive interval: 1s while running, 3s while queued
      while (!isStreamClosed && !isCompleted) {
        try {
          const execution = await prisma.workflowExecution.findUnique({
            where: { id: executionId },
            include: {
              nodeExecutions: {
                orderBy: { startedAt: "asc" },
              },
            },
          });

          if (!execution) {
            sendEvent("execution_complete", { status: "not_found", message: "Execution deleted" });
            break;
          }

          const currentStatus = execution.status;

          // Emit granular node execution events
          for (const ne of execution.nodeExecutions) {
            const prevState = knownNodeStates.get(ne.nodeId);
            if (prevState !== ne.status) {
              knownNodeStates.set(ne.nodeId, ne.status);

              const payload = {
                nodeExecutionId: ne.id,
                executionId: ne.executionId,
                nodeId: ne.nodeId,
                nodeType: ne.nodeType,
                status: ne.status,
                attempt: ne.attempt,
                startedAt: ne.startedAt.toISOString(),
                completedAt: ne.completedAt ? ne.completedAt.toISOString() : null,
                durationMs: ne.duration,
                input: ne.input,
                output: ne.output,
                error: ne.error,
              };

              if (ne.status === "running") {
                sendEvent("node_started", payload);
              } else if (ne.status === "success") {
                sendEvent("node_completed", payload);
              } else if (ne.status === "failed") {
                sendEvent("node_failed", payload);
              } else {
                sendEvent("node_update", payload);
              }
            }
          }

          // Check for terminal execution states
          if (["success", "failed", "cancelled"].includes(currentStatus)) {
            isCompleted = true;
            if (currentStatus === "cancelled") {
              sendEvent("workflow_cancelled", {
                executionId: execution.id,
                status: "cancelled",
                durationMs: execution.duration,
                completedAt: execution.completedAt ? execution.completedAt.toISOString() : new Date().toISOString(),
              });
            } else {
              sendEvent("execution_complete", {
                executionId: execution.id,
                status: execution.status,
                durationMs: execution.duration,
                error: execution.error,
                completedAt: execution.completedAt ? execution.completedAt.toISOString() : new Date().toISOString(),
              });
            }
            break;
          }

          // Adaptive poll delay: 1000ms if running, 3000ms if queued
          const pollDelay = currentStatus === "running" ? 1000 : 3000;
          await new Promise((resolve) => setTimeout(resolve, pollDelay));
        } catch (err) {
          console.warn("[SSE Stream] Error in polling loop:", err);
          await new Promise((resolve) => setTimeout(resolve, 3000));
        }
      }

      if (heartbeatTimer) clearInterval(heartbeatTimer);
      isStreamClosed = true;
      try {
        controller.close();
      } catch {
        // Stream already closed
      }
    },
    cancel() {
      isStreamClosed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
