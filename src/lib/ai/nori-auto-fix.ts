/**
 * Neuraloop Phase 22 — Nori Auto-Fix Graph Patching Engine
 * Converts Nori diagnostic results into direct safe graph modifications without complex graph surgery.
 * Supported Fix Types:
 * - add_retry (Add exponential retry policy to action nodes)
 * - add_delay (Append delay wait node)
 * - add_error_handler (Attach Slack failure notification node)
 * - add_notification (Append Slack notification node)
 */

import type { GeneratedWorkflowData } from "./schema";

export type AutoFixType = "add_retry" | "add_delay" | "add_error_handler" | "add_notification";

export interface AutoFixPatchResult {
  patched: boolean;
  summary: string;
  workflow: GeneratedWorkflowData;
}

export class NoriAutoFixEngine {
  static applyFix(
    workflow: GeneratedWorkflowData,
    fixType: AutoFixType | string,
  ): AutoFixPatchResult {
    const nodes = JSON.parse(JSON.stringify(workflow.nodes)) as GeneratedWorkflowData["nodes"];
    const edges = JSON.parse(JSON.stringify(workflow.edges)) as GeneratedWorkflowData["edges"];

    let patched = false;
    let summary = "";

    // 1. ADD RETRY POLICY
    if (fixType === "add_retry" || fixType.includes("retry")) {
      let count = 0;
      for (const n of nodes) {
        if (n.definitionId === "http-request" || n.definitionId === "ai") {
          n.config = {
            ...n.config,
            attempts: 3,
            backoff: "exponential",
          };
          count++;
        }
      }
      patched = true;
      summary = `Applied exponential retry policy across ${count} action nodes.`;
    }

    // 2. ADD DELAY NODE
    else if (fixType === "add_delay" || fixType.includes("delay")) {
      const lastNode = nodes[nodes.length - 1];
      const delayId = `node-delay-${nodes.length + 1}`;

      nodes.push({
        id: delayId,
        definitionId: "delay",
        label: "Delay 5 Minutes",
        config: { delayMs: 300000 },
      });

      if (lastNode) {
        edges.push({
          id: `edge-delay-${edges.length + 1}`,
          source: lastNode.id,
          target: delayId,
          sourceHandle: "out",
          targetHandle: "in",
        });
      }

      patched = true;
      summary = "Appended 5-minute Delay node to workflow graph.";
    }

    // 3. ADD ERROR HANDLER
    else if (fixType === "add_error_handler" || fixType.includes("error")) {
      const errNodeId = `node-err-slack-${nodes.length + 1}`;
      nodes.push({
        id: errNodeId,
        definitionId: "slack",
        label: "Failure Alert (Slack)",
        config: {
          channel: "#alerts",
          message: "⚠️ **Execution Error Alert**: {{steps.error.message}}",
        },
      });

      const lastNode = nodes[nodes.length - 2] || nodes[0];
      if (lastNode) {
        edges.push({
          id: `edge-err-${edges.length + 1}`,
          source: lastNode.id,
          target: errNodeId,
          sourceHandle: "error",
          targetHandle: "in",
        });
      }

      patched = true;
      summary = "Attached Slack Failure Alert node to error handle.";
    }

    // 4. ADD NOTIFICATION NODE
    else if (fixType === "add_notification" || fixType.includes("notification")) {
      const lastNode = nodes[nodes.length - 1];
      const notifyId = `node-slack-${nodes.length + 1}`;

      nodes.push({
        id: notifyId,
        definitionId: "slack",
        label: "Slack Notification",
        config: { channel: "#general", message: "🚀 Workflow Run Complete: {{steps.ai.output.text}}" },
      });

      if (lastNode) {
        edges.push({
          id: `edge-notify-${edges.length + 1}`,
          source: lastNode.id,
          target: notifyId,
          sourceHandle: "out",
          targetHandle: "in",
        });
      }

      patched = true;
      summary = "Appended Slack Notification node to workflow graph.";
    }

    return {
      patched,
      summary: summary || "Applied graph auto-fix patch.",
      workflow: {
        name: workflow.name,
        description: workflow.description,
        nodes,
        edges,
      },
    };
  }
}
