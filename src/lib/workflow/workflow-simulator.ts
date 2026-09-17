/**
 * Neuraloop Phase 22 — Pre-Publish AI Workflow Simulator Engine
 * Performs dry-run simulation of workflow graphs without executing live APIs or sending real notifications.
 * Generates simulated step-by-step output previews, execution order, estimated duration, and estimated AI/API cost.
 */

import type { GeneratedWorkflowData } from "@/lib/ai/schema";

export interface SimulatedStepResult {
  stepIndex: number;
  nodeId: string;
  nodeLabel: string;
  definitionId: string;
  simulatedStatus: "success" | "skipped";
  simulatedOutput: Record<string, unknown>;
  estimatedDurationMs: number;
  estimatedCostUsd: number;
}

export interface WorkflowSimulationReport {
  simulatedSuccessfully: boolean;
  totalSteps: number;
  estimatedTotalDurationMs: number;
  estimatedTotalCostUsd: number;
  steps: SimulatedStepResult[];
}

export class WorkflowSimulator {
  static simulateWorkflow(
    workflow: GeneratedWorkflowData,
    mockInput: Record<string, unknown> = {},
  ): WorkflowSimulationReport {
    const nodes = workflow.nodes || [];
    const edges = workflow.edges || [];
    const steps: SimulatedStepResult[] = [];

    let totalDurationMs = 0;
    let totalCostUsd = 0;

    // Simulated step-by-step traversal
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const defId = node.definitionId;
      const config = node.config || {};

      let duration = 50;
      let cost = 0.0;
      let output: Record<string, unknown> = {};

      switch (defId) {
        case "webhook":
        case "manual-trigger":
          duration = 15;
          output = {
            event: "simulated_trigger",
            payload: mockInput.payload || { user: "demo_user", event: "lead_signup", score: 85 },
          };
          break;

        case "schedule":
          duration = 10;
          output = { timestamp: new Date().toISOString(), cron: config.cron || "0 8 * * *" };
          break;

        case "http-request":
          duration = 240;
          cost = 0.0001;
          output = {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            body: { status: "OK", data: { id: "res_9842", count: 42 } },
          };
          break;

        case "ai":
          duration = 850;
          cost = (config.model as string)?.includes("gpt-4o") ? 0.002 : 0.00015;
          output = {
            text: `[SIMULATED AI RESPONSE]: Processed prompt for '${node.label}'. Lead score evaluated as High Priority.`,
            usage: { promptTokens: 45, completionTokens: 80 },
          };
          break;

        case "slack":
          duration = 120;
          output = { delivered: true, channel: config.channel || "#general", messageId: "msg_sim_123" };
          break;

        case "email":
          duration = 180;
          output = { sent: true, recipient: config.to || "demo@company.com", messageId: "email_sim_456" };
          break;

        case "if":
          duration = 10;
          output = { conditionMet: true, evaluation: "85 > 80" };
          break;

        case "delay":
          duration = 5;
          output = { delayedMs: 5000, status: "completed" };
          break;

        default:
          duration = 40;
          output = { status: "success", step: node.label };
          break;
      }

      totalDurationMs += duration;
      totalCostUsd += cost;

      steps.push({
        stepIndex: i + 1,
        nodeId: node.id,
        nodeLabel: node.label,
        definitionId: defId,
        simulatedStatus: "success",
        simulatedOutput: output,
        estimatedDurationMs: duration,
        estimatedCostUsd: parseFloat(cost.toFixed(6)),
      });
    }

    return {
      simulatedSuccessfully: true,
      totalSteps: nodes.length,
      estimatedTotalDurationMs: totalDurationMs,
      estimatedTotalCostUsd: parseFloat(totalCostUsd.toFixed(6)),
      steps,
    };
  }
}
