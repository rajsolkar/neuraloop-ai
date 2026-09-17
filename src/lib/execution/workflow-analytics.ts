import { prisma } from "@/lib/prisma";

export interface WorkflowAnalyticsMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number; // percentage (0 - 100)
  avgDurationMs: number;
  totalAiTokens: number;
  totalAiCost: number;
  totalHttpRequests: number;
  topFailingNode?: {
    nodeId: string;
    nodeType: string;
    failCount: number;
  } | null;
}

export class WorkflowAnalyticsService {
  static async getWorkflowMetrics(workflowId: string): Promise<WorkflowAnalyticsMetrics> {
    if (!process.env.DATABASE_URL) {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 100,
        avgDurationMs: 0,
        totalAiTokens: 0,
        totalAiCost: 0,
        totalHttpRequests: 0,
        topFailingNode: null,
      };
    }

    try {
      const executions = await prisma.workflowExecution.findMany({
        where: { workflowId },
        select: {
          id: true,
          status: true,
          duration: true,
          aiTokensIn: true,
          aiTokensOut: true,
          aiEstimatedCost: true,
          httpRequestsCount: true,
        },
      });

      const totalExecutions = executions.length;
      if (totalExecutions === 0) {
        return {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          successRate: 100,
          avgDurationMs: 0,
          totalAiTokens: 0,
          totalAiCost: 0,
          totalHttpRequests: 0,
          topFailingNode: null,
        };
      }

      const successfulExecutions = executions.filter((e) => e.status === "success").length;
      const failedExecutions = executions.filter((e) => e.status === "failed").length;
      const successRate = Math.round((successfulExecutions / totalExecutions) * 100);

      const totalDuration = executions.reduce((acc, e) => acc + (e.duration || 0), 0);
      const avgDurationMs = Math.round(totalDuration / totalExecutions);

      const totalAiTokens = executions.reduce((acc, e) => acc + (e.aiTokensIn || 0) + (e.aiTokensOut || 0), 0);
      const totalAiCost = parseFloat(executions.reduce((acc, e) => acc + (e.aiEstimatedCost || 0), 0).toFixed(4));
      const totalHttpRequests = executions.reduce((acc, e) => acc + (e.httpRequestsCount || 0), 0);

      // Find top failing node across executions
      const failedNodeExecs = await prisma.nodeExecution.findMany({
        where: {
          execution: { workflowId },
          status: "failed",
        },
        select: {
          nodeId: true,
          nodeType: true,
        },
      });

      let topFailingNode: WorkflowAnalyticsMetrics["topFailingNode"] = null;
      if (failedNodeExecs.length > 0) {
        const counts: Record<string, { nodeId: string; nodeType: string; count: number }> = {};
        for (const ne of failedNodeExecs) {
          if (!counts[ne.nodeId]) {
            counts[ne.nodeId] = { nodeId: ne.nodeId, nodeType: ne.nodeType, count: 0 };
          }
          counts[ne.nodeId].count++;
        }
        const sorted = Object.values(counts).sort((a, b) => b.count - a.count);
        if (sorted.length > 0) {
          topFailingNode = {
            nodeId: sorted[0].nodeId,
            nodeType: sorted[0].nodeType,
            failCount: sorted[0].count,
          };
        }
      }

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        successRate,
        avgDurationMs,
        totalAiTokens,
        totalAiCost,
        totalHttpRequests,
        topFailingNode,
      };
    } catch (err) {
      console.warn("WorkflowAnalyticsService.getWorkflowMetrics warning:", err);
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        successRate: 100,
        avgDurationMs: 0,
        totalAiTokens: 0,
        totalAiCost: 0,
        totalHttpRequests: 0,
        topFailingNode: null,
      };
    }
  }
}
