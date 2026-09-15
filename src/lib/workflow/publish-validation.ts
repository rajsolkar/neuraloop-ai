/**
 * Neuraloop Phase 7 — Workflow Publishing Validation Engine
 * Validates graph completeness before publishing to prevent runtime execution failures.
 */

import type { Workflow, WorkflowNode } from "@/types/workflow";
import { getNodeDefinition } from "./node-definitions";

export interface PublishValidationResult {
  valid: boolean;
  errors: string[];
}

export function isTriggerNode(n: Partial<WorkflowNode>): boolean {
  const cat = (n.data?.category || "").toString().toLowerCase();
  if (cat === "trigger") return true;

  const defId = (n.data?.definitionId || n.type || n.data?.type || "").toString();
  if (defId === "manual-trigger" || defId === "webhook" || defId === "schedule") return true;

  const def = getNodeDefinition(defId);
  if (def?.isTrigger || def?.category === "trigger") return true;

  return false;
}

export function isActionOrLogicNode(n: Partial<WorkflowNode>): boolean {
  const cat = (n.data?.category || "").toString().toLowerCase();
  if (cat === "action" || cat === "logic") return true;

  const defId = (n.data?.definitionId || n.type || n.data?.type || "").toString();
  if (["http-request", "openai", "slack", "email", "if", "filter", "delay"].includes(defId)) return true;

  const def = getNodeDefinition(defId);
  if (def && (!def.isTrigger || def.category === "action" || def.category === "logic")) return true;

  return false;
}

export function validateWorkflowForPublish(workflow: Partial<Workflow>): PublishValidationResult {
  const errors: string[] = [];
  const nodes = workflow.nodes || [];
  const edges = workflow.edges || [];

  if (nodes.length === 0) {
    errors.push("Workflow canvas is empty. Add at least one trigger and action node.");
    return { valid: false, errors };
  }

  // Temporary logging for audit and debugging
  console.log(`[PublishValidation] Validating ${nodes.length} nodes and ${edges.length} edges:`);
  for (const n of nodes) {
    const defId = (n.data?.definitionId || n.type || n.data?.type || "unknown").toString();
    const cat = (n.data?.category || "unspecified").toString();
    const isTrig = isTriggerNode(n);
    const isActLog = isActionOrLogicNode(n);
    console.log(
      `[PublishValidation] Node id="${n.id}", type="${n.type}", data.type="${n.data?.type}", data.definitionId="${defId}", data.category="${cat}" => isTrigger=${isTrig}, isActionOrLogic=${isActLog}`
    );
  }

  const triggerNodes = nodes.filter(isTriggerNode);
  const actionOrLogicNodes = nodes.filter(isActionOrLogicNode);

  if (triggerNodes.length === 0) {
    errors.push("Workflow must contain at least one Trigger node (e.g. Webhook, Manual Trigger, or Schedule).");
  }

  if (actionOrLogicNodes.length === 0) {
    errors.push("Workflow must contain at least one Action or Logic node (e.g. HTTP Request, Email, Slack, or IF Condition).");
  }

  // Validate Node Configurations
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  for (const node of nodes) {
    const label = node.data?.label || node.id;
    const defId = (node.data?.definitionId || node.type || node.data?.type || "").toString();
    const config = (node.data?.config as Record<string, unknown>) || {};

    if (defId === "email") {
      const to = String(config.to || "").trim();
      if (!to) {
        errors.push(`Email node "${label}" is missing a recipient email address ("To" field).`);
      }
    } else if (defId === "http-request") {
      const url = String(config.url || "").trim();
      if (!url) {
        errors.push(`HTTP Request node "${label}" is missing a target Request URL.`);
      }
    } else if (defId === "slack") {
      const channel = String(config.channel || "").trim();
      if (!channel) {
        errors.push(`Slack Notification node "${label}" is missing a destination channel (e.g. "#general").`);
      }
    } else if (defId === "if") {
      const fieldPath = String(config.fieldPath || "").trim();
      const operator = String(config.operator || "").trim();
      const value = String(config.value || "").trim();
      if (!fieldPath || !operator || !value) {
        errors.push(`IF Condition node "${label}" requires complete Field Path, Operator, and Target Value.`);
      }
    }
  }

  // Validate Connections (No Orphaned Edges)
  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      errors.push(`Connection "${edge.id}" references missing source node ID "${edge.source}".`);
    }
    if (!nodeMap.has(edge.target)) {
      errors.push(`Connection "${edge.id}" references missing target node ID "${edge.target}".`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
