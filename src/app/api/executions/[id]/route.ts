import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const NODE_TYPE_TITLES: Record<string, string> = {
  "manual-trigger": "Manual Trigger",
  webhook: "Webhook Trigger",
  schedule: "Schedule Trigger",
  "http-request": "HTTP Request",
  openai: "OpenAI LLM",
  slack: "Slack Notification",
  email: "Email Notification",
  if: "IF Condition",
  filter: "Filter Data",
  delay: "Delay Execution",
};

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id: executionId } = await context.params;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  }

  try {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id: executionId },
      include: {
        workflow: {
          select: { name: true },
        },
        version: {
          select: { version: true, definition: true },
        },
        nodeExecutions: {
          orderBy: { startedAt: "asc" },
        },
      },
    });

    if (!execution) {
      return NextResponse.json({ error: `Execution with ID '${executionId}' not found.` }, { status: 404 });
    }

    const versionDef = execution.version?.definition as unknown as Record<string, unknown>;
    const nodesInDef = (versionDef?.nodes as Array<Record<string, unknown>>) || [];

    const nodeLabelMap = new Map<string, { label: string; typeTitle: string }>();
    for (const node of nodesInDef) {
      const nodeData = (node.data as Record<string, unknown>) || {};
      const defId = (nodeData.definitionId as string) || (node.type as string) || "node";
      const label = (nodeData.label as string) || NODE_TYPE_TITLES[defId] || (node.id as string);
      const typeTitle = NODE_TYPE_TITLES[defId] || defId;
      nodeLabelMap.set(node.id as string, { label, typeTitle });
    }

    const enrichedNodeExecutions = execution.nodeExecutions.map((ne) => {
      const nodeMeta = nodeLabelMap.get(ne.nodeId);
      const label = nodeMeta?.label || NODE_TYPE_TITLES[ne.nodeType] || ne.nodeId;
      const typeTitle = nodeMeta?.typeTitle || NODE_TYPE_TITLES[ne.nodeType] || ne.nodeType;

      return {
        id: ne.id,
        executionId: ne.executionId,
        nodeId: ne.nodeId,
        nodeLabel: label,
        nodeType: ne.nodeType,
        nodeTypeTitle: typeTitle,
        status: ne.status,
        startedAt: ne.startedAt.toISOString(),
        completedAt: ne.completedAt ? ne.completedAt.toISOString() : null,
        duration: ne.duration,
        input: ne.input,
        output: ne.output,
        error: ne.error,
        attempt: ne.attempt,
      };
    });

    const enrichedExecution = {
      id: execution.id,
      workflowId: execution.workflowId,
      workflowName: execution.workflow?.name || execution.workflowId,
      workflowVersionId: execution.workflowVersionId,
      versionNumber: execution.version?.version || 1,
      status: execution.status,
      source: execution.source || "manual",
      startedAt: execution.startedAt.toISOString(),
      completedAt: execution.completedAt ? execution.completedAt.toISOString() : null,
      duration: execution.duration,
      input: execution.input,
      output: execution.output,
      error: execution.error,
      metadata: execution.metadata,
      nodeExecutions: enrichedNodeExecutions,
    };

    return NextResponse.json({ execution: enrichedExecution }, { status: 200 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
