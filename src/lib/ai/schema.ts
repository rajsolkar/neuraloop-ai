/**
 * Neuraloop Phase 6 — AI Workflow Generation (Zod Validation Schema)
 * Strict schema validation for AI generated workflow graph outputs.
 */

import { z } from "zod";

export const GeneratedNodeSchema = z.object({
  id: z.string().min(1),
  definitionId: z.enum([
    "manual-trigger",
    "webhook",
    "schedule",
    "http-request",
    "openai",
    "slack",
    "email",
    "if",
    "filter",
    "delay",
  ]),
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

export type GeneratedWorkflowData = z.infer<typeof GeneratedWorkflowSchema>;
