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
import { ExecutionRecorder } from "./execution-recorder";
import { ErrorAnalyzer } from "./error-analyzer";

function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "");
}

function sanitizeSecrets(data: unknown): unknown {
  if (!data) return data;
  if (typeof data === "string") {
    return data
      .replace(/sk-[a-zA-Z0-9_\-]{20,}/g, "sk-[REDACTED]")
      .replace(/xoxb-[a-zA-Z0-9_\-]{20,}/g, "xoxb-[REDACTED]")
      .replace(/Bearer\s+[a-zA-Z0-9_\-\.]{20,}/gi, "Bearer [REDACTED]");
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeSecrets);
  }
  if (typeof data === "object") {
    const clean: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (
        key.toLowerCase().includes("secret") ||
        key.toLowerCase().includes("password") ||
        key.toLowerCase().includes("apikey")
      ) {
        clean[key] = "[REDACTED]";
      } else {
        clean[key] = sanitizeSecrets(val);
      }
    }
    return clean;
  }
  return data;
}

export class WorkflowEngine {
  /**
   * Execute a specific workflow version by ID or workflow ID.
   */
  static async executeWorkflow(options: {
    workflowId: string;
    versionId?: string;
    executionId?: string;
    userId?: string | null;
    input?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }): Promise<WorkflowExecutionRecord> {
    const { workflowId, input = {}, metadata = {} } = options;

    // Load workflow & version
    let versionId = options.versionId;
    let versionNumber = 1;
    let canonicalWorkflow: Workflow | null = null;
    let ownerUserId: string | null = options.userId || null;

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
          ownerUserId = dbVersion.workflow.userId || ownerUserId;
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
      canonicalWorkflow = await WorkflowService.getWorkflow(workflowId, ownerUserId);
      if (!canonicalWorkflow) {
        throw new Error(`WORKFLOW_NOT_FOUND: Workflow with ID '${workflowId}' not found.`);
      }
    }

    if (isDatabaseConfigured() && (!versionId || versionId.startsWith("ver-fallback-"))) {
      try {
        const dbVer = await prisma.workflowVersion.findFirst({
          where: { workflowId: canonicalWorkflow.id },
          orderBy: { version: "desc" },
        });
        if (dbVer) {
          versionId = dbVer.id;
          versionNumber = dbVer.version;
        } else {
          const createdVer = await prisma.workflowVersion.create({
            data: {
              id: makeId("ver"),
              workflowId: canonicalWorkflow.id,
              version: 1,
              definition: {
                name: canonicalWorkflow.name,
                description: canonicalWorkflow.description || "",
                status: canonicalWorkflow.status,
                nodes: canonicalWorkflow.nodes || [],
                edges: canonicalWorkflow.edges || [],
              } as unknown as Prisma.InputJsonValue,
            },
          });
          versionId = createdVer.id;
          versionNumber = 1;
        }
      } catch (err) {
        console.warn("Failed to resolve or create WorkflowVersion in engine:", err);
      }
    }

    if (!versionId) {
      versionId = `ver-fallback-${canonicalWorkflow.id}`;
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

    const nodeTypesMap: Record<string, string> = {};
    for (const n of nodes) {
      nodeTypesMap[n.id] = n.data.definitionId;
    }

    const context: ExecutionContext = {
      executionId,
      workflowId: canonicalWorkflow.id,
      workflowVersionId: versionId!,
      versionNumber,
      userId: ownerUserId,
      input,
      nodeOutputs: {},
      nodeInputs: {},
      nodeStatuses: {},
      metadata: { ...metadata, nodeTypes: nodeTypesMap },
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

    const cachedNodeOutputs = (options.metadata?.cachedNodeOutputs as Record<string, Record<string, unknown>>) || {};
    let aiTokensIn = 0;
    let aiTokensOut = 0;
    let aiEstimatedCost = 0.0;
    let httpRequestsCount = 0;

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (processedNodes.has(currentId)) continue;
      processedNodes.add(currentId);

      const currentNode = nodes.find((n) => n.id === currentId);
      if (!currentNode) continue;

      const nodeStartTime = Date.now();
      const nodeStartedAtIso = new Date(nodeStartTime).toISOString();
      const nodeExecId = `nexec-${makeId("nx")}`;
      const nodeLabel = currentNode.data.label || currentNode.data.definitionId;

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

        const outgoing = edges.filter((e) => e.source === currentId);
        for (const edge of outgoing) {
          skippedNodes.add(edge.target);
          if (!processedNodes.has(edge.target)) {
            queue.push(edge.target);
          }
        }
        continue;
      }

      // Check if node has pre-cached output from partial replay
      if (cachedNodeOutputs[currentId]) {
        const cachedOutput = cachedNodeOutputs[currentId];
        context.nodeStatuses[currentId] = "success";
        context.nodeOutputs[currentId] = cachedOutput;

        nodeExecutionRecords.push({
          id: nodeExecId,
          nodeId: currentId,
          nodeType: currentNode.data.definitionId,
          status: "success",
          startedAt: nodeStartedAtIso,
          completedAt: nodeStartedAtIso,
          duration: 0,
          input: (context.nodeInputs[currentId] || {}) as Record<string, unknown>,
          output: cachedOutput,
          attempt: 1,
        });

        const outgoing = edges.filter((e) => e.source === currentId);
        for (const edge of outgoing) {
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
      const maxRetries = typeof nodeConfig.maxRetries === "number" ? nodeConfig.maxRetries : 1;
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

      // Track AI & HTTP metrics if present in executor result
      if (currentNode.data.definitionId === "http-request") {
        httpRequestsCount++;
      }
      if (result.metrics) {
        if (typeof result.metrics.tokensIn === "number") aiTokensIn += result.metrics.tokensIn;
        if (typeof result.metrics.tokensOut === "number") aiTokensOut += result.metrics.tokensOut;
        if (typeof result.metrics.cost === "number") aiEstimatedCost += result.metrics.cost;
      }

      if (result.status === "failed") {
        context.nodeStatuses[currentId] = "failed";
        overallStatus = "failed";
        overallError = result.error || `Node ${nodeLabel} failed execution`;

        const humanError = ErrorAnalyzer.analyze(overallError, currentNode.data.definitionId);

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
          error: humanError.explanation,
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

    const totalNodes = nodeExecutionRecords.length;
    const successfulNodes = nodeExecutionRecords.filter((r) => r.status === "success").length;
    const failedNodes = nodeExecutionRecords.filter((r) => r.status === "failed").length;

    // Persist NodeExecutions & update single WorkflowExecution in Neon PostgreSQL
    if (isDatabaseConfigured()) {
      try {
        await prisma.nodeExecution.createMany({
          data: nodeExecutionRecords.map((r) => ({
            id: r.id,
            executionId,
            nodeId: r.nodeId,
            nodeType: r.nodeType,
            nodeLabel: nodes.find((n) => n.id === r.nodeId)?.data?.label || r.nodeType,
            status: r.status,
            startedAt: new Date(r.startedAt),
            completedAt: r.completedAt ? new Date(r.completedAt) : undefined,
            duration: r.duration,
            input: sanitizeSecrets(r.input || {}) as unknown as Prisma.InputJsonValue,
            output: sanitizeSecrets(r.output || {}) as unknown as Prisma.InputJsonValue,
            error: r.error ? String(sanitizeSecrets(r.error)) : undefined,
            errorMessage: r.error ? String(sanitizeSecrets(r.error)) : undefined,
            attempt: r.attempt,
          })),
        });

        await prisma.workflowExecution.update({
          where: { id: executionId },
          data: {
            status: overallStatus,
            workflowName: canonicalWorkflow.name,
            triggerType: (options.metadata?.source as string) || "manual",
            completedAt: new Date(endTime),
            duration: totalDuration,
            totalNodes,
            successfulNodes,
            failedNodes,
            aiTokensIn,
            aiTokensOut,
            aiEstimatedCost,
            httpRequestsCount,
            output: sanitizeSecrets(context.nodeOutputs) as unknown as Prisma.InputJsonValue,
            error: overallError ? String(sanitizeSecrets(overallError)) : undefined,
            errorMessage: overallError ? String(sanitizeSecrets(overallError)) : undefined,
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
