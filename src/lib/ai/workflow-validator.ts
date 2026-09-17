/**
 * Neuraloop Phase 20 — AI Workflow Pre-Creation Validator Engine
 * Validates generated workflow graph structure, handle connections, credential requirements,
 * dynamic handlebars variable expression references, and node configurations before creation.
 */

import { NODE_KNOWLEDGE_SPECS } from "./workflow-knowledge-base";
import type { GeneratedWorkflowData, WorkflowValidationResultData } from "./schema";

export class WorkflowValidator {
  static validateGraph(workflow: GeneratedWorkflowData): WorkflowValidationResultData {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { nodes, edges } = workflow;

    if (!nodes || nodes.length === 0) {
      errors.push("GRAPH_EMPTY: Workflow graph contains zero nodes.");
      return { isValid: false, errors, warnings };
    }

    // 1. Structural Trigger Validation
    const triggerNodes = nodes.filter((n) => {
      const spec = NODE_KNOWLEDGE_SPECS[n.definitionId];
      return spec ? spec.isTrigger : ["manual-trigger", "webhook", "schedule"].includes(n.definitionId);
    });

    if (triggerNodes.length === 0) {
      errors.push("MISSING_TRIGGER: Graph must contain at least one trigger node (manual-trigger, webhook, or schedule).");
    }

    // 2. Orphan Node Validation
    const nodeIds = new Set(nodes.map((n) => n.id));
    const connectedNodeIds = new Set<string>();

    for (const edge of edges) {
      if (!nodeIds.has(edge.source)) {
        errors.push(`INVALID_EDGE_SOURCE: Edge '${edge.id || "edge"}' references non-existent source node '${edge.source}'.`);
      }
      if (!nodeIds.has(edge.target)) {
        errors.push(`INVALID_EDGE_TARGET: Edge '${edge.id || "edge"}' references non-existent target node '${edge.target}'.`);
      }
      connectedNodeIds.add(edge.source);
      connectedNodeIds.add(edge.target);
    }

    if (nodes.length > 1) {
      for (const node of nodes) {
        if (!connectedNodeIds.has(node.id)) {
          warnings.push(`ORPHAN_NODE: Node '${node.label}' (${node.id}) is disconnected from the workflow execution graph.`);
        }
      }
    }

    // 3. Credential & Required Config Field Validation
    for (const node of nodes) {
      const config = node.config || {};
      const defId = node.definitionId;

      if (defId === "ai") {
        if (!config.prompt && !config.template) {
          warnings.push(`AI_PROMPT_MISSING: AI node '${node.label}' has an empty prompt field.`);
        }
      }

      if (defId === "telegram" && !config.chatId) {
        warnings.push(`TELEGRAM_CHAT_ID_MISSING: Telegram node '${node.label}' is missing a target chatId.`);
      }

      if (defId === "slack" && !config.channel && !config.message) {
        warnings.push(`SLACK_CHANNEL_MISSING: Slack node '${node.label}' is missing channel or message configuration.`);
      }

      if (defId === "email" && !config.to) {
        warnings.push(`EMAIL_RECIPIENT_MISSING: Email node '${node.label}' is missing recipient address.`);
      }
    }

    // 4. Handlebars Variable Expression Resolution Check
    const declaredNodeIds = new Set(nodes.map((n) => n.id));
    const expressionRegex = /\{\{\s*steps\.([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_.]+)\s*\}\}/g;

    for (const node of nodes) {
      const configStr = JSON.stringify(node.config || {});
      let match: RegExpExecArray | null;
      while ((match = expressionRegex.exec(configStr)) !== null) {
        const referencedNodeId = match[1];
        if (!declaredNodeIds.has(referencedNodeId) && referencedNodeId !== "input") {
          warnings.push(`UNRESOLVED_VARIABLE_REFERENCE: Node '${node.label}' references output from unknown node step '${referencedNodeId}'.`);
        }
      }
    }

    const isValid = errors.length === 0;
    return { isValid, errors, warnings };
  }
}
