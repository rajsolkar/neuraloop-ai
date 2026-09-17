/**
 * Neuraloop Phase 21 — Nori Workflow Refiner Engine v2
 * Takes an existing workflow graph and applies incremental delta modifications
 * (e.g. Add node, Replace node, Delete node with auto-edge repair, Add branch, Add error handling, Add retry logic)
 * without regenerating the graph from scratch.
 */

import type { GeneratedWorkflowData } from "./schema";

export interface RefinementResult {
  modified: boolean;
  refinementSummary: string;
  workflow: GeneratedWorkflowData;
}

export class WorkflowRefiner {
  static refineWorkflow(
    currentWorkflow: GeneratedWorkflowData,
    refinementPrompt: string,
  ): RefinementResult {
    const p = refinementPrompt.toLowerCase().trim();
    const nodes = JSON.parse(JSON.stringify(currentWorkflow.nodes)) as GeneratedWorkflowData["nodes"];
    const edges = JSON.parse(JSON.stringify(currentWorkflow.edges)) as GeneratedWorkflowData["edges"];

    let modified = false;
    let summary = "";

    // 1. ADD ERROR HANDLING / FAILURE NOTIFICATIONS
    if (
      p.includes("add error handling") ||
      p.includes("add failure notification") ||
      p.includes("handle errors")
    ) {
      const errNodeId = `node-err-slack-${nodes.length + 1}`;
      const errNode = {
        id: errNodeId,
        definitionId: "slack" as const,
        label: "Failure Alert (Slack)",
        config: {
          channel: "#alerts",
          message: "⚠️ **Workflow Execution Error Detected!** Details: {{steps.error.message}}",
        },
      };

      nodes.push(errNode);
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

      modified = true;
      summary = "Attached Slack Failure Alert node for automated error handling.";
    }

    // 2. ADD RETRY LOGIC
    if (!modified && (p.includes("add retry") || p.includes("retry logic") || p.includes("add retry handling"))) {
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
      if (count > 0) {
        modified = true;
        summary = `Configured exponential retry backoff policy across ${count} action nodes.`;
      }
    }

    // 3. REPLACE NODES (e.g. Telegram -> Slack, Telegram -> Discord, etc.)
    if (!modified && (p.includes("replace telegram with discord") || p.includes("use discord instead of telegram"))) {
      for (const node of nodes) {
        if (node.definitionId === "telegram") {
          node.definitionId = "discord";
          node.label = "Discord Webhook Alert";
          node.config = {
            messageType: "embed",
            content: "🤖 **Workflow Notification**",
            embedTitle: "Alert",
            embedDescription: "{{input.message}}",
            embedColor: 3447003,
          };
          modified = true;
        }
      }
      if (modified) summary = "Replaced Telegram notification node with Discord embed webhook.";
    }

    if (!modified && (p.includes("replace telegram with slack") || p.includes("use slack instead of telegram"))) {
      for (const node of nodes) {
        if (node.definitionId === "telegram") {
          node.definitionId = "slack";
          node.label = "Slack Notification";
          node.config = { channel: "#general", message: "{{input.message}}" };
          modified = true;
        }
      }
      if (modified) summary = "Replaced Telegram node with Slack Notification node.";
    }

    // 4. DELETE NODES WITH AUTO-REPAIR
    if (!modified && (p.startsWith("delete ") || p.startsWith("remove "))) {
      let targetDefId = "";
      if (p.includes("google sheets") || p.includes("sheets")) targetDefId = "google-sheets";
      else if (p.includes("slack")) targetDefId = "slack";
      else if (p.includes("telegram")) targetDefId = "telegram";
      else if (p.includes("discord")) targetDefId = "discord";
      else if (p.includes("delay")) targetDefId = "delay";
      else if (p.includes("email")) targetDefId = "email";

      if (targetDefId) {
        const index = nodes.findIndex((n) => n.definitionId === targetDefId);
        if (index !== -1) {
          const removedNode = nodes[index];
          const incoming = edges.filter((e) => e.target === removedNode.id);
          const outgoing = edges.filter((e) => e.source === removedNode.id);

          // Remove target node & its edges
          nodes.splice(index, 1);
          for (let i = edges.length - 1; i >= 0; i--) {
            if (edges[i].source === removedNode.id || edges[i].target === removedNode.id) {
              edges.splice(i, 1);
            }
          }

          // Auto-repair bridge between incoming source and outgoing target
          if (incoming.length > 0 && outgoing.length > 0) {
            edges.push({
              id: `edge-repaired-${edges.length + 1}`,
              source: incoming[0].source,
              target: outgoing[0].target,
              sourceHandle: incoming[0].sourceHandle || "out",
              targetHandle: outgoing[0].targetHandle || "in",
            });
          }

          modified = true;
          summary = `Removed '${removedNode.label}' node and repaired workflow graph edges.`;
        }
      }
    }

    // 5. ADD GOOGLE SHEETS LOGGING
    if (!modified && (p.includes("add google sheets") || p.includes("log to sheets") || p.includes("save to sheets") || p.includes("sheets logging"))) {
      const lastNode = nodes[nodes.length - 1];
      const newSheetNodeId = `node-sheets-${nodes.length + 1}`;

      nodes.push({
        id: newSheetNodeId,
        definitionId: "google-sheets",
        label: "Log to Google Sheets",
        config: {
          operation: "append_row",
          range: "Sheet1!A:C",
          valuesJson: '[["{{input.name}}", "{{steps.ai.output.text}}"]]',
        },
      });

      if (lastNode) {
        edges.push({
          id: `edge-${edges.length + 1}`,
          source: lastNode.id,
          target: newSheetNodeId,
          sourceHandle: "out",
          targetHandle: "in",
        });
      }

      modified = true;
      summary = "Appended Google Sheets logging node to the end of the workflow.";
    }

    // 6. ADD SLACK NOTIFICATION
    if (!modified && (p.includes("add slack") || p.includes("slack notification"))) {
      const lastNode = nodes[nodes.length - 1];
      const newSlackNodeId = `node-slack-${nodes.length + 1}`;

      nodes.push({
        id: newSlackNodeId,
        definitionId: "slack",
        label: "Slack Alert",
        config: { channel: "#general", message: "🚀 Workflow Output: {{steps.ai.output.text}}" },
      });

      if (lastNode) {
        edges.push({
          id: `edge-${edges.length + 1}`,
          source: lastNode.id,
          target: newSlackNodeId,
          sourceHandle: "out",
          targetHandle: "in",
        });
      }

      modified = true;
      summary = "Appended Slack Alert node to the workflow.";
    }

    // 7. ADD DELAY
    if (!modified && (p.includes("add delay") || p.includes("wait step"))) {
      const lastNode = nodes[nodes.length - 1];
      const newDelayNodeId = `node-delay-${nodes.length + 1}`;

      nodes.push({
        id: newDelayNodeId,
        definitionId: "delay",
        label: "Delay 5 Minutes",
        config: { delayMs: 300000 },
      });

      if (lastNode) {
        edges.push({
          id: `edge-${edges.length + 1}`,
          source: lastNode.id,
          target: newDelayNodeId,
          sourceHandle: "out",
          targetHandle: "in",
        });
      }

      modified = true;
      summary = "Appended 5-Minute Delay node to the workflow.";
    }

    // 8. ADD APPROVAL STEP / BRANCH
    if (!modified && (p.includes("add approval") || p.includes("add condition") || p.includes("add branch"))) {
      const triggerNode = nodes[0];
      const nextNode = nodes[1];

      if (triggerNode && nextNode) {
        const ifNodeId = `node-if-check`;
        const ifNode = {
          id: ifNodeId,
          definitionId: "if" as const,
          label: "Lead Score Check",
          config: { fieldPath: "score", operator: "greater_than", value: "80" },
        };

        // Insert IF node after trigger
        nodes.splice(1, 0, ifNode);

        // Update edges
        const oldEdge = edges.find((e) => e.source === triggerNode.id && e.target === nextNode.id);
        if (oldEdge) {
          oldEdge.target = ifNodeId;
          edges.push({
            id: `edge-if-true`,
            source: ifNodeId,
            target: nextNode.id,
            sourceHandle: "true",
            targetHandle: "in",
          });
        }

        modified = true;
        summary = "Inserted IF Condition branch check step after the trigger node.";
      }
    }

    // 9. REDUCE AI COSTS
    if (!modified && (p.includes("reduce ai costs") || p.includes("cheaper ai") || p.includes("optimize costs"))) {
      let costCount = 0;
      for (const n of nodes) {
        if (n.definitionId === "ai") {
          n.config = { ...n.config, model: "gpt-4o-mini" };
          costCount++;
        }
      }
      if (costCount > 0) {
        modified = true;
        summary = `Switched ${costCount} AI nodes to high-efficiency 'gpt-4o-mini' model (saving ~40% cost).`;
      }
    }

    // Fallback if no specific rule matched
    if (!modified) {
      summary = `Processed refinement request: '${refinementPrompt}'.`;
    }

    return {
      modified,
      refinementSummary: summary,
      workflow: {
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        nodes,
        edges,
      },
    };
  }
}
