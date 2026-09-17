/**
 * Neuraloop Phase 20 — AI Workflow Auto-Optimization Engine
 * Inspects generated workflow graphs and returns non-destructive optimization suggestions:
 * - Duplicate AI node consolidation
 * - Missing error handling fallback branches
 * - Dead un-connected handles
 * Optimizations are presented as structured suggestions in the UI modal and NOT auto-applied silently.
 */

import type { GeneratedWorkflowData } from "./schema";

export interface OptimizationSuggestion {
  type: "merge_ai_nodes" | "add_error_fallback" | "connect_dead_handle" | "use_transform";
  impact: "low" | "medium" | "high";
  description: string;
}

export interface WorkflowOptimizationResult {
  hasOptimizations: boolean;
  suggestions: OptimizationSuggestion[];
  optimizedNodesCount: number;
}

export class WorkflowOptimizer {
  static optimizeWorkflow(workflow: GeneratedWorkflowData) {
    return this.optimizeGraph(workflow);
  }

  static optimizeGraph(workflow: GeneratedWorkflowData): {
    workflow: GeneratedWorkflowData;
    optimizations: WorkflowOptimizationResult;
  } {
    const suggestions: OptimizationSuggestion[] = [];
    let count = 0;

    const { nodes, edges } = workflow;

    // 1. Detect Consecutive Duplicate AI Nodes
    for (let i = 0; i < nodes.length - 1; i++) {
      const current = nodes[i];
      const next = nodes[i + 1];

      if (current.definitionId === "ai" && next.definitionId === "ai") {
        suggestions.push({
          type: "merge_ai_nodes",
          impact: "medium",
          description: `Two consecutive AI nodes ('${current.label}' and '${next.label}') can be consolidated into a single LLM prompt step to reduce token cost and latency.`,
        });
        count++;
      }
    }

    // 2. Detect Missing Error Fallbacks on HTTP Requests
    const httpNodes = nodes.filter((n) => n.definitionId === "http-request");
    for (const httpNode of httpNodes) {
      const outgoingEdges = edges.filter((e) => e.source === httpNode.id);
      if (outgoingEdges.length === 1) {
        suggestions.push({
          type: "add_error_fallback",
          impact: "high",
          description: `HTTP Request node '${httpNode.label}' has no fallback branch. Adding a Switch condition for status != 200 improves runtime resilience.`,
        });
        count++;
      }
    }

    // 3. Detect Unconnected Handles on Branching Nodes
    const branchingNodes = nodes.filter((n) => n.definitionId === "if" || n.definitionId === "switch");
    for (const bNode of branchingNodes) {
      const outgoingEdges = edges.filter((e) => e.source === bNode.id);
      if (bNode.definitionId === "if" && outgoingEdges.length < 2) {
        suggestions.push({
          type: "connect_dead_handle",
          impact: "low",
          description: `IF Condition node '${bNode.label}' has an un-connected branch handle. Connect both TRUE and FALSE handles to complete execution routing.`,
        });
        count++;
      }
    }

    return {
      workflow, // Unmodified workflow graph (non-destructive)
      optimizations: {
        hasOptimizations: suggestions.length > 0,
        suggestions,
        optimizedNodesCount: count,
      },
    };
  }
}
