/**
 * Neuraloop Phase 22 — Cost & Usage Financial Analytics Engine
 * Aggregates execution data, AI token counts, financial spend, and workflow usage trends.
 */

import { prisma } from "@/lib/prisma";

export interface WorkflowCostMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  totalTokensIn: number;
  totalTokensOut: number;
  totalAiCostUsd: number;
  averageCostPerRun: number;
  topWorkflowsByCost: Array<{
    id: string;
    name: string;
    executionCount: number;
    totalCost: number;
  }>;
}

export class WorkflowCostAnalyticsService {
  static async getCostMetrics(userId?: string | null): Promise<WorkflowCostMetrics> {
    try {
      const executions = await prisma.workflowExecution.findMany({
        where: userId ? { userId } : {},
        select: {
          id: true,
          workflowId: true,
          workflowName: true,
          status: true,
          aiTokensIn: true,
          aiTokensOut: true,
          aiEstimatedCost: true,
        },
      });

      let totalExecutions = executions.length;
      let successfulExecutions = 0;
      let failedExecutions = 0;
      let totalTokensIn = 0;
      let totalTokensOut = 0;
      let totalAiCostUsd = 0;

      const costByWorkflow = new Map<string, { name: string; count: number; cost: number }>();

      for (const ex of executions) {
        if (ex.status === "success") successfulExecutions++;
        else if (ex.status === "failed") failedExecutions++;

        const tokensIn = ex.aiTokensIn || 0;
        const tokensOut = ex.aiTokensOut || 0;
        const cost = ex.aiEstimatedCost || 0;

        totalTokensIn += tokensIn;
        totalTokensOut += tokensOut;
        totalAiCostUsd += cost;

        const wfId = ex.workflowId;
        const name = ex.workflowName || wfId;
        const existing = costByWorkflow.get(wfId) || { name, count: 0, cost: 0 };
        existing.count++;
        existing.cost += cost;
        costByWorkflow.set(wfId, existing);
      }

      const topWorkflowsByCost = Array.from(costByWorkflow.entries())
        .map(([id, data]) => ({
          id,
          name: data.name,
          executionCount: data.count,
          totalCost: parseFloat(data.cost.toFixed(4)),
        }))
        .sort((a, b) => b.totalCost - a.totalCost)
        .slice(0, 5);

      const averageCostPerRun = totalExecutions > 0 ? parseFloat((totalAiCostUsd / totalExecutions).toFixed(6)) : 0;

      return {
        totalExecutions,
        successfulExecutions,
        failedExecutions,
        totalTokensIn,
        totalTokensOut,
        totalAiCostUsd: parseFloat(totalAiCostUsd.toFixed(4)),
        averageCostPerRun,
        topWorkflowsByCost,
      };
    } catch {
      return {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        totalTokensIn: 0,
        totalTokensOut: 0,
        totalAiCostUsd: 0,
        averageCostPerRun: 0,
        topWorkflowsByCost: [],
      };
    }
  }
}
