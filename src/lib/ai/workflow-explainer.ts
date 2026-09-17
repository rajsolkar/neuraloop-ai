/**
 * Neuraloop Phase 20 — AI Workflow Explanation Generator
 * Generates natural language summaries, step-by-step node breakdowns, required credentials checklists,
 * variable usage maps, and estimated AI execution costs for generated workflows.
 */

import { NODE_KNOWLEDGE_SPECS } from "./workflow-knowledge-base";
import type { GeneratedWorkflowData, WorkflowPlanData, WorkflowExplanationData } from "./schema";

export class WorkflowExplainer {
  static explainWorkflow(
    workflow: GeneratedWorkflowData,
    plan?: WorkflowPlanData,
  ): WorkflowExplanationData {
    const { nodes, name, description } = workflow;

    // 1. Step-by-Step Node Breakdown
    const steps = nodes.map((n) => {
      const spec = NODE_KNOWLEDGE_SPECS[n.definitionId];
      return {
        nodeId: n.id,
        nodeLabel: n.label,
        definitionId: n.definitionId,
        purpose: n.config?.description
          ? String(n.config.description)
          : spec
          ? spec.description
          : `Executes ${n.definitionId} step processing`,
      };
    });

    // 2. Collect Required Credentials
    const credentialsNeededSet = new Set<string>();
    let aiNodeCount = 0;

    for (const n of nodes) {
      const spec = NODE_KNOWLEDGE_SPECS[n.definitionId];
      if (spec?.requiredCredentials) {
        for (const cred of spec.requiredCredentials) {
          credentialsNeededSet.add(cred);
        }
      }
      if (n.definitionId === "ai") {
        aiNodeCount++;
      }
    }

    if (plan?.credentialsNeeded) {
      for (const cred of plan.credentialsNeeded) {
        credentialsNeededSet.add(cred);
      }
    }

    // 3. Variables Used Map
    const variablesUsed = plan?.variablesUsed || [
      "input (Trigger Payload)",
      "steps.ai.output.text",
      "steps.http.output.body",
    ];

    // 4. Estimate AI Cost per Execution Run
    // Average 1500 prompt tokens + 300 output tokens per AI step (~$0.0035 on gpt-4o-mini / gpt-4o)
    const estimatedCost = parseFloat((aiNodeCount * 0.0035).toFixed(4));

    // 5. Complexity Assessment
    let complexity: WorkflowExplanationData["complexity"] = "low";
    if (nodes.length >= 5 || plan?.estimatedComplexity === "high") {
      complexity = "high";
    } else if (nodes.length >= 3) {
      complexity = "medium";
    }

    const summary = `${name}: ${description}. This workflow consists of ${nodes.length} connected steps using the ${
      plan?.recommendedPattern || "Notification"
    } pattern.`;

    return {
      summary,
      steps,
      credentialsNeeded: Array.from(credentialsNeededSet),
      variablesUsed,
      estimatedCost,
      complexity,
    };
  }
}
