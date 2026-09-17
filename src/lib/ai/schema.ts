/**
 * Neuraloop Phase 20 — AI Workflow Architect (Zod Validation Schemas)
 * Strict Zod validation schemas for 20 node definitions, multi-stage workflow plans,
 * natural language explanations, validation reports, and auto-optimizations.
 */

import { z } from "zod";

export const ALL_NODE_DEFINITION_IDS = [
  "manual-trigger",
  "webhook",
  "schedule",
  "http-request",
  "ai",
  "slack",
  "email",
  "code",
  "webhook-response",
  "if",
  "filter",
  "set-variable",
  "delay",
  "telegram",
  "discord",
  "google-sheets",
  "loop",
  "switch",
  "merge",
  "transform",
] as const;

export const GeneratedNodeSchema = z.object({
  id: z.string().min(1),
  definitionId: z.enum(ALL_NODE_DEFINITION_IDS),
  label: z.string().min(1).max(100),
  config: z.record(z.unknown()).default({}),
});

export const GeneratedEdgeSchema = z.object({
  id: z.string().optional(),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});

export const GeneratedWorkflowSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().default("AI-generated workflow"),
  nodes: z.array(GeneratedNodeSchema).min(1),
  edges: z.array(GeneratedEdgeSchema).default([]),
});

export const WorkflowPlanSchema = z.object({
  goal: z.string(),
  triggerType: z.string(),
  actions: z.array(z.string()),
  integrations: z.array(z.string()),
  credentialsNeeded: z.array(z.string()),
  variablesUsed: z.array(z.string()),
  recommendedPattern: z.enum([
    "Notification",
    "Approval",
    "Research",
    "Monitoring",
    "Content Generation",
    "Custom",
  ]),
  estimatedComplexity: z.enum(["low", "medium", "high"]),
});

export const WorkflowStepExplanationSchema = z.object({
  nodeId: z.string(),
  nodeLabel: z.string(),
  definitionId: z.string(),
  purpose: z.string(),
});

export const WorkflowExplanationSchema = z.object({
  summary: z.string(),
  steps: z.array(WorkflowStepExplanationSchema),
  credentialsNeeded: z.array(z.string()),
  variablesUsed: z.array(z.string()),
  estimatedCost: z.number(),
  complexity: z.enum(["low", "medium", "high"]),
});

export const WorkflowValidationResultSchema = z.object({
  isValid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export const WorkflowOptimizationResultSchema = z.object({
  applied: z.boolean(),
  suggestions: z.array(z.string()),
  optimizedNodesCount: z.number(),
});

export type GeneratedWorkflowData = z.infer<typeof GeneratedWorkflowSchema>;
export type WorkflowPlanData = z.infer<typeof WorkflowPlanSchema>;
export type WorkflowExplanationData = z.infer<typeof WorkflowExplanationSchema>;
export type WorkflowValidationResultData = z.infer<typeof WorkflowValidationResultSchema>;
export type WorkflowOptimizationResultData = z.infer<typeof WorkflowOptimizationResultSchema>;
