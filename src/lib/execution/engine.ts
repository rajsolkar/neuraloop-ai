import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { Workflow } from "@/types/workflow";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { getExecutor } from "./executors/registry";
import type {
  ExecutionContext,
  ExecutionStatus,
  NodeExecutionResult,
  WorkflowExecutionRecord,
} from "./types";
import { makeId } from "@/lib/utils";

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "");
}

export class WorkflowEngine {
  /**
   * Execute a specific workflow version by ID or workflow ID.
   */
  static async executeWorkflow(options: {
    workflowId: string;
    versionId?: string;
    executionId?: string;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<WorkflowExecutionRecord> {
    const { workflowId, input = {}, metadata = {} } = options;

    // Load workflow & version
    let versionId = options.versionId;
    let versionNumber = 1;
    let canonicalWorkflow: Workflow | null = null;

    if (isDatabaseConfigured()) {
      try {
        let dbVersion;
        if (versionId) {
          dbVersion = await prisma.workflowVersion.findUnique({
            where: { id: versionId },
            include: { workflow: true },
          });
        } else {
          dbVersion = await prisma.workflowVersion.findFirst({
            where: { workflowId },
            orderBy: { version: "desc" },
            include: { workflow: true },
          });
        }

        if (dbVersion) {
          versionId = dbVersion.id;
          versionNumber = dbVersion.version;
          const def = dbVersion.definition as unknown as Record<string, unknown>;
          canonicalWorkflow = {
            id: dbVersion.workflowId,
            name: (def.name as string) || dbVersion.workflow.name,
            description: (def.description as string) || "",
            status: (def.status as Workflow["status"]) || "draft",
            createdAt: dbVersion.workflow.createdAt.toISOString(),
            updatedAt: dbVersion.workflow.updatedAt.toISOString(),
            savedAt: dbVersion.workflow.savedAt?.toISOString() || null,
            nodes: (def.nodes as unknown as Workflow["nodes"]) || [],
            edges: (def.edges as unknown as Workflow["edges"]) || [],
          };
        }
      } catch (err) {
        console.warn("Prisma fetch version failed in engine, falling back to service:", err);
      }
    }

    if (!canonicalWorkflow) {
      canonicalWorkflow = await WorkflowService.getWorkflow(workflowId);
      if (!canonicalWorkflow) {
        throw new Error(`WORKFLOW_NOT_FOUND: Workflow with ID '${workflowId}' not found.`);
      }
      versionId = versionId || `ver-fallback-${workflowId}`;
    }

    const nodes = canonicalWorkflow.nodes || [];
    const edges = canonicalWorkflow.edges || [];

    if (nodes.length === 0) {
      throw new Error("WORKFLOW_VALIDATION_FAILED: Workflow contains no nodes to execute.");
    }

    // 1. Cycle Detection (DFS)
    const adj = new Map<string, string[]>();
    for (const node of nodes) adj.set(node.id, []);
    for (const edge of edges) {
      if (adj.has(edge.source)) {
        adj.get(edge.source)!.push(edge.target);
      }
    }

    const visited = new Set<string>();
    const recStack = new Set<string>();
    const hasCycle = (nodeId: string): boolean => {
      visited.add(nodeId);
      recStack.add(nodeId);
      const neighbors = adj.get(nodeId) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (recStack.has(neighbor)) {
          return true;
        }
      }
      recStack.delete(nodeId);
      return false;
    };

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        if (hasCycle(node.id)) {
          throw new Error("WORKFLOW_CYCLE_DETECTED: Execution aborted because the workflow graph contains a cyclic dependency.");
        }
      }
    }

    // 2. Identify Start Trigger Node
    let triggerNode = nodes.find((n) => n.data.category === "trigger");
    if (!triggerNode) {
      // Find node with no incoming edges
      const targets = new Set(edges.map((e) => e.target));
      triggerNode = nodes.find((n) => !targets.has(n.id)) || nodes[0];
    }

    // Reuse provided executionId or generate new ID if omitted
    const executionId = options.executionId || `exec-${makeId("x")}`;
    const startTime = Date.now();
    const startedAtIso = new Date(startTime).toISOString();

    const context: ExecutionContext = {
      executionId,
      workflowId: canonicalWorkflow.id,
      workflowVersionId: versionId!,
      versionNumber,
      input,
      nodeOutputs: {},
      nodeInputs: {},
      nodeStatuses: {},
      metadata,
    };

    // Database record initialization (Reuse existing execution record or create)
    if (isDatabaseConfigured()) {
      try {
        const existing = await prisma.workflowExecution.findUnique({
          where: { id: executionId },
        });

        if (existing) {
          await prisma.workflowExecution.update({
            where: { id: executionId },
            data: {
              status: "running",
              startedAt: new Date(startTime),
              input: input as unknown as Prisma.InputJsonValue,
              metadata: metadata as unknown as Prisma.InputJsonValue,
            },
          });
        } else {
          await prisma.workflowExecution.create({
            data: {
              id: executionId,
              workflowId: canonicalWorkflow.id,
              workflowVersionId: versionId!,
              status: "running",
              startedAt: new Date(startTime),
              input: input as unknown as Prisma.InputJsonValue,
              metadata: metadata as unknown as Prisma.InputJsonValue,
            },
          });
        }
      } catch (err) {
        console.warn("Failed to initialize WorkflowExecution in DB:", err);
      }
    }

    const nodeExecutionRecords: WorkflowExecutionRecord["nodeExecutions"] = [];
    let overallStatus: ExecutionStatus = "success";
    let overallError: string | undefined = undefined;

    // 3. Execution Graph Traversal (Queue-based)
    const queue: string[] = [triggerNode.id];
    const processedNodes = new Set<string>();
    const skippedNodes = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (processedNodes.has(currentId)) continue;
      processedNodes.add(currentId);

      const currentNode = nodes.find((n) => n.id === currentId);
      if (!currentNode) continue;

      const nodeStartTime = Date.now();
      const nodeStartedAtIso = new Date(nodeStartTime).toISOString();
      const nodeExecId = `nexec-${makeId("nx")}`;

      if (skippedNodes.has(currentId)) {
        context.nodeStatuses[currentId] = "skipped";
        nodeExecutionRecords.push({
          id: nodeExecId,
          nodeId: currentId,
          nodeType: currentNode.data.definitionId,
          status: "skipped",
          startedAt: nodeStartedAtIso,
          completedAt: nodeStartedAtIso,
          duration: 0,
          attempt: 1,
        });

        // Downstream nodes of a skipped node are also marked skipped
        const outgoing = edges.filter((e) => e.source === currentId);
        for (const edge of outgoing) {
          skippedNodes.add(edge.target);
          if (!processedNodes.has(edge.target)) {
            queue.push(edge.target);
          }
        }
        continue;
      }

      // Execute Node with Retries
      const executor = getExecutor(currentNode.data.definitionId);
      context.nodeStatuses[currentId] = "running";

      const nodeConfig = (currentNode.data.config as Record<string, unknown>) ?? {};
      const maxRetries = typeof nodeConfig.maxRetries === "number" ? nodeConfig.maxRetries : 1; // default 1 retry
      const maxAttempts = 1 + maxRetries;

      let attempt = 1;
      let result!: NodeExecutionResult;

      while (attempt <= maxAttempts) {
        if (!executor) {
          result = {
            status: "failed",
            error: `EXECUTOR_NOT_FOUND: No executor registered for definitionId '${currentNode.data.definitionId}'`,
          };
          break;
        }

        try {
          result = await executor.execute(currentNode, input, context);
        } catch (err: unknown) {
          result = {
            status: "failed",
            error: err instanceof Error ? err.message : String(err),
          };
        }

        if (result.status !== "failed") {
          break;
        }

        if (attempt < maxAttempts) {
          attempt++;
        } else {
          break;
        }
      }

      const nodeEndTime = Date.now();
      const nodeDuration = nodeEndTime - nodeStartTime;
      const nodeCompletedAtIso = new Date(nodeEndTime).toISOString();

      if (result.status === "failed") {
        context.nodeStatuses[currentId] = "failed";
        overallStatus = "failed";
        overallError = result.error || `Node ${currentNode.data.label} failed execution`;

        nodeExecutionRecords.push({
          id: nodeExecId,
          nodeId: currentId,
          nodeType: currentNode.data.definitionId,
          status: "failed",
          startedAt: nodeStartedAtIso,
          completedAt: nodeCompletedAtIso,
          duration: nodeDuration,
          input: (context.nodeInputs[currentId] || {}) as Record<string, unknown>,
          output: (result.output || {}) as Record<string, unknown>,
          error: result.error,
          attempt,
        });

        // Stop execution on failure
        break;
      }

      context.nodeStatuses[currentId] = "success";
      if (result.output) {
        context.nodeOutputs[currentId] = result.output;
      }

      nodeExecutionRecords.push({
        id: nodeExecId,
        nodeId: currentId,
        nodeType: currentNode.data.definitionId,
        status: "success",
        startedAt: nodeStartedAtIso,
        completedAt: nodeCompletedAtIso,
        duration: nodeDuration,
        input: (context.nodeInputs[currentId] || {}) as Record<string, unknown>,
        output: (result.output || {}) as Record<string, unknown>,
        attempt,
      });

      // Resolve Next Nodes & Handles
      const outgoingEdges = edges.filter((e) => e.source === currentId);
      for (const edge of outgoingEdges) {
        if (currentNode.data.definitionId === "if") {
          const selectedHandle = result.selectedHandle || "true";
          if (edge.sourceHandle && edge.sourceHandle !== selectedHandle) {
            // Mark the non-selected branch path as skipped
            skippedNodes.add(edge.target);
          }
        }
        if (!processedNodes.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;
    const completedAtIso = new Date(endTime).toISOString();

    // Persist NodeExecutions & update single WorkflowExecution in Neon PostgreSQL
    if (isDatabaseConfigured()) {
      try {
        await prisma.nodeExecution.createMany({
          data: nodeExecutionRecords.map((r) => ({
            id: r.id,
            executionId,
            nodeId: r.nodeId,
            nodeType: r.nodeType,
            status: r.status,
            startedAt: new Date(r.startedAt),
            completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
            duration: r.duration,
            input: (r.input || {}) as unknown as Prisma.InputJsonValue,
            output: (r.output || {}) as unknown as Prisma.InputJsonValue,
            error: r.error,
            attempt: r.attempt,
          })),
        });

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: overallStatus,
            completedAt: new Date(endTime),
            duration: totalDuration,
            output: context.nodeOutputs as unknown as Prisma.InputJsonValue,
            error: overallError,
          },
        });
      } catch (err) {
        console.warn("Failed to persist execution results in DB:", err);
      }
    }

    return {
      id: executionId,
      workflowId: canonicalWorkflow.id,
      workflowVersionId: versionId!,
      status: overallStatus,
      source: (options.metadata?.source as import("@/types/workflow").ExecutionSource) || "manual",
      startedAt: startedAtIso,
      completedAt: completedAtIso,
      duration: totalDuration,
      input,
      output: context.nodeOutputs,
      error: overallError,
      nodeExecutions: nodeExecutionRecords,
    };
  }
}
