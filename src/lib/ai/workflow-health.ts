/**
 * Neuraloop Phase 21 — Workflow Health Scoring Engine
 * Computes runtime reliability & telemetry health score (0–100) based on
 * recent execution success rates, retry coverage, error handling presence, and credential validity.
 */

import type { GeneratedWorkflowData } from "./schema";

export interface WorkflowHealthBreakdown {
  score: number; // 0 - 100
  status: "excellent" | "good" | "fair" | "poor";
  categoryScores: {
    executionSuccessRate: number; // 30 pts max
    retryCoverage: number;        // 25 pts max
    errorHandling: number;        // 25 pts max
    credentialValidity: number;   // 20 pts max
  };
  recommendations: string[];
}

export class WorkflowHealthScorer {
  static calculateHealth(
    workflow: GeneratedWorkflowData,
    executionTelemetry?: {
      totalRuns?: number;
      successfulRuns?: number;
      failedRuns?: number;
      credentialErrorsCount?: number;
    },
  ): WorkflowHealthBreakdown {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];
    const recommendations: string[] = [];

    // 1. Execution Success Rate Score (Max 30 pts)
    let executionSuccessRate = 30;
    if (executionTelemetry && (executionTelemetry.totalRuns || 0) > 0) {
      const total = executionTelemetry.totalRuns || 1;
      const success = executionTelemetry.successfulRuns || 0;
      const rate = success / total;
      executionSuccessRate = Math.round(rate * 30);
      if (rate < 0.8) {
        recommendations.push(`Recent run success rate is low (${Math.round(rate * 100)}%). Review failed execution logs.`);
      }
    }

    // 2. Retry Coverage Score (Max 25 pts)
    let retryCoverage = 25;
    const networkNodes = nodes.filter(
      (n) => n.definitionId === "http-request" || n.definitionId === "ai" || n.definitionId === "telegram" || n.definitionId === "discord" || n.definitionId === "slack",
    );
    if (networkNodes.length > 0) {
      let retryCount = 0;
      for (const n of networkNodes) {
        if (n.config && (n.config.attempts || n.config.retryCount || n.config.backoff)) {
          retryCount++;
        }
      }
      const retryRatio = retryCount / networkNodes.length;
      retryCoverage = Math.round(retryRatio * 25);
      if (retryRatio < 0.5) {
        recommendations.push("Network & AI action nodes lack automatic retry policies.");
      }
    }

    // 3. Error Handling Score (Max 25 pts)
    let errorHandling = 10; // default base
    const hasErrorEdge = edges.some((e) => e.sourceHandle === "error");
    const hasIfBranch = nodes.some((n) => n.definitionId === "if" || n.definitionId === "switch");
    if (hasErrorEdge) errorHandling += 15;
    if (hasIfBranch) errorHandling += 10;
    errorHandling = Math.min(25, errorHandling);
    if (!hasErrorEdge) {
      recommendations.push("No explicit error handles or fallback notification branches attached.");
    }

    // 4. Credential Security & Validity (Max 20 pts)
    let credentialValidity = 20;
    if (executionTelemetry && (executionTelemetry.credentialErrorsCount || 0) > 0) {
      credentialValidity = 5;
      recommendations.push("Credential authentication failures detected in recent runs. Reconnect connection.");
    }

    const totalScore = executionSuccessRate + retryCoverage + errorHandling + credentialValidity;
    const score = Math.max(0, Math.min(100, totalScore));

    let status: WorkflowHealthBreakdown["status"] = "excellent";
    if (score < 60) status = "poor";
    else if (score < 75) status = "fair";
    else if (score < 90) status = "good";

    return {
      score,
      status,
      categoryScores: {
        executionSuccessRate,
        retryCoverage,
        errorHandling,
        credentialValidity,
      },
      recommendations,
    };
  }
}
