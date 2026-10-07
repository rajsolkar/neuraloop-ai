/**
 * Neuraloop Phase 20 — AI Workflow Architect Service v2
 * Gemini 3.8 Flash powered intent-aware workflow planning, structured graph generation,
 * multi-stage deterministic validation, automated repair loops (max 2 attempts), and explanation generation.
 */

import { prisma } from "@/lib/prisma";
import { makeId } from "@/lib/utils";
import { createWorkflowNode, sanitizeGraph } from "@/lib/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { applyAutoLayout } from "./auto-layout";
import {
  ALL_NODE_DEFINITION_IDS,
  GeneratedWorkflowSchema,
  type GeneratedWorkflowData,
  type WorkflowPlanData,
  type WorkflowExplanationData,
  type WorkflowValidationResultData,
} from "./schema";
import { TemplateMatcher, type TemplateMatchMode } from "./template-matcher";
import { WorkflowPlanner, type PlannerUserContext } from "./workflow-planner";
import { WorkflowValidator } from "./workflow-validator";
import { WorkflowOptimizer, type WorkflowOptimizationResult } from "./workflow-optimizer";
import { WorkflowExplainer } from "./workflow-explainer";
import { ArchitectureScorer, type ArchitectureScoreResult } from "./architecture-scorer";
import { TemplateUsageAnalytics } from "./template-usage-analytics";
import { WorkflowRefiner, type RefinementResult } from "./workflow-refiner";
import { NODE_KNOWLEDGE_SPECS } from "./workflow-knowledge-base";

// Simple in-memory rate limiter (20 requests per hour per IP)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_HOUR = 20;
const ONE_HOUR_MS = 60 * 60 * 1000;

export function checkRateLimit(clientId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitMap.get(clientId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(clientId, { count: 1, resetAt: now + ONE_HOUR_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - 1 };
  }

  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return { allowed: false, remaining: 0 };
  }

  entry.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_HOUR - entry.count };
}

export function getDefaultConfigForDefinition(
  definitionId: string,
  promptContext = "",
): Record<string, unknown> {
  const p = promptContext.toLowerCase();
  switch (definitionId) {
    case "webhook":
      return { method: "POST", path: "/lead-webhook" };
    case "schedule":
      return { cron: "0 8 * * *", label: "Daily at 8:00 AM" };
    case "http-request":
      return {
        url: "https://api.github.com/zen",
        method: "GET",
        authType: p.includes("github") || p.includes("slack") || p.includes("google") ? "oauth_connection" : "none",
        connectionProvider: p.includes("github") ? "github" : p.includes("slack") ? "slack" : p.includes("google") ? "google" : undefined,
      };
    case "ai":
    case "openai":
      return { provider: "gemini", model: "gemini-3.8-flash", prompt: "Summarize payload data" };
    case "slack":
      return { channel: "#general", message: "New automated notification from Neuraloop workflow" };
    case "email":
      return { to: "alerts@company.com", subject: "Workflow Digest", body: "Here is your workflow summary digest." };
    case "telegram":
      return { chatId: "@alerts_channel", message: "**Workflow Alert**:\n{{input.message}}", parseMode: "Markdown" };
    case "discord":
      return { messageType: "embed", content: "**Daily Digest**", embedTitle: "Workflow Summary", embedColor: 3447003 };
    case "google-sheets":
      return { operation: "append_row", range: "Sheet1!A:C", valuesJson: '[["{{input.name}}", "{{input.email}}"]]' };
    case "loop":
      return { arrayPath: "result" };
    case "switch":
      return { cases: [{ id: "case_1", label: "High Priority", fieldPath: "text", operator: "contains", value: "HIGH" }], defaultHandle: "default" };
    case "merge":
      return { mode: "combine" };
    case "transform":
      return { operation: "set_default_values", defaults: { status: "ACTIVE" } };
    case "set-variable":
      return { variables: [{ name: "status", value: "PROCESSED" }] };
    case "delay":
      return { duration: 30, unit: "minutes" };
    case "if":
      return { fieldPath: "score", operator: "greater_than", value: "50" };
    case "filter":
      return { fieldPath: "email", operator: "is_not_empty" };
    case "webhook-response":
      return { statusCode: 200, body: '{"success": true}' };
    case "code":
      return { jsCode: "return { result: input.value * 2 };" };
    default:
      return {};
  }
}

const NODE_CATEGORY_ORDER: Record<string, number> = {
  "http-request": 1,
  "google-sheets": 1,
  "code": 2,
  "transform": 2,
  "filter": 2,
  "set-variable": 2,
  "if": 3,
  "switch": 3,
  "loop": 3,
  "delay": 3,
  "merge": 3,
  "ai": 4,
  "slack": 5,
  "telegram": 5,
  "discord": 5,
  "email": 5,
  "webhook-response": 6,
};

export function generateOfflineWorkflow(
  prompt: string,
  plan?: WorkflowPlanData,
): GeneratedWorkflowData {
  const effectivePlan = plan || WorkflowPlanner.createPlan(prompt);
  const p = prompt.toLowerCase();
  const reqNodes = effectivePlan.requiredNodes || [];

  if (reqNodes.length > 0) {
    const trigger = reqNodes.find((n) => ["schedule", "webhook", "manual-trigger"].includes(n)) || "manual-trigger";
    const nonTriggers = reqNodes.filter((n) => n !== trigger);
    const forbidden = new Set(effectivePlan.forbiddenNodes || []);

    const validNonTriggers = nonTriggers
      .filter((n) => !forbidden.has(n))
      .sort((a, b) => (NODE_CATEGORY_ORDER[a] || 99) - (NODE_CATEGORY_ORDER[b] || 99));

    const nodes: GeneratedWorkflowData["nodes"] = [
      {
        id: "node-1",
        definitionId: trigger as unknown as (typeof ALL_NODE_DEFINITION_IDS)[number],
        label: trigger === "schedule" ? "Schedule Trigger" : trigger === "webhook" ? "Webhook Trigger" : "Manual Trigger",
        config: getDefaultConfigForDefinition(trigger, p),
      },
    ];

    const edges: GeneratedWorkflowData["edges"] = [];
    let currentSourceId = "node-1";
    let currentSourceHandle = "out";

    let ifNodeId: string | null = null;

    for (let i = 0; i < validNonTriggers.length; i++) {
      const defId = validNonTriggers[i];
      const nodeId = `node-${i + 2}`;
      const label = NODE_KNOWLEDGE_SPECS[defId]?.name || defId;

      nodes.push({
        id: nodeId,
        definitionId: defId as unknown as (typeof ALL_NODE_DEFINITION_IDS)[number],
        label,
        config: getDefaultConfigForDefinition(defId, p),
      });

      const ifIdx = ifNodeId ? nodes.findIndex((n) => n.id === ifNodeId) : -1;
      const stepsAfterIf = ifIdx >= 0 ? nodes.length - 1 - ifIdx : 0;

      if (defId === "if") {
        ifNodeId = nodeId;
        edges.push({
          id: `e-${edges.length + 1}`,
          source: currentSourceId,
          target: nodeId,
          sourceHandle: currentSourceHandle,
          targetHandle: "in",
        });
      } else if (ifNodeId && stepsAfterIf === 1) {
        edges.push({
          id: `e-${edges.length + 1}`,
          source: ifNodeId,
          target: nodeId,
          sourceHandle: "true",
          targetHandle: "in",
        });
        currentSourceId = nodeId;
        currentSourceHandle = "out";
      } else if (ifNodeId && stepsAfterIf === 2) {
        edges.push({
          id: `e-${edges.length + 1}`,
          source: ifNodeId,
          target: nodeId,
          sourceHandle: "false",
          targetHandle: "in",
        });
        currentSourceId = nodeId;
        currentSourceHandle = "out";
      } else {
        edges.push({
          id: `e-${edges.length + 1}`,
          source: currentSourceId,
          target: nodeId,
          sourceHandle: currentSourceHandle,
          targetHandle: "in",
        });
        currentSourceId = nodeId;
        currentSourceHandle = "out";
      }
    }

    return {
      name: `Automated Workflow: ${effectivePlan.goal || prompt}`,
      description: `Workflow architect generated graph for: ${prompt}`,
      nodes,
      edges,
    };
  }

  // Fallback pattern matching if no specific requiredNodes were specified
  return {
    name: "Custom AI Automated Workflow",
    description: `Generated workflow for: ${prompt}`,
    nodes: [
      { id: "node-1", definitionId: "manual-trigger", label: "Manual Trigger", config: {} },
      { id: "node-2", definitionId: "ai", label: "AI Process", config: getDefaultConfigForDefinition("ai", p) },
      { id: "node-3", definitionId: "email", label: "Send Email Notification", config: getDefaultConfigForDefinition("email", p) },
    ],
    edges: [
      { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2", source: "node-2", target: "node-3", sourceHandle: "out", targetHandle: "in" },
    ],
  };
}

/**
 * Gemini 3.8 Flash LLM Direct Generator & Repair Engine
 */
async function callGemini38Flash(
  promptText: string,
  plan: WorkflowPlanData,
  repairContext?: { errors: string[]; previousGraph: GeneratedWorkflowData },
): Promise<GeneratedWorkflowData | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === "") return null;

  const systemPrompt = `You are Neuraloop's Nori AI Workflow Architect. Convert natural language user prompts into a structured JSON workflow graph.

Available 20 Node Definition IDs (YOU MUST ONLY USE THESE EXACT STRINGS):
${ALL_NODE_DEFINITION_IDS.map((id) => `- "${id}"`).join("\n")}

STRICT GENERATION RULES:
1. Trigger Node: The workflow MUST start with exactly one trigger node ("manual-trigger", "webhook", or "schedule").
2. Required Nodes: You MUST include these nodes in the graph: ${plan.requiredNodes.length > 0 ? plan.requiredNodes.join(", ") : "none"}.
3. Forbidden Nodes: You MUST NOT include any of these nodes in the graph: ${plan.forbiddenNodes.length > 0 ? plan.forbiddenNodes.join(", ") : "none"}.
4. Handle Names:
   - Standard nodes: sourceHandle: "out", targetHandle: "in"
   - IF node: sourceHandle: "true" (for true branch), "false" (for false branch), targetHandle: "in"
   - Switch node: sourceHandle: "case_1", "case_2", "default", targetHandle: "in"
   - Loop node: sourceHandle: "out", targetHandle: "in"

OUTPUT JSON SCHEMA:
{
  "name": "Short Descriptive Title",
  "description": "Clear overview of workflow actions",
  "nodes": [
    { "id": "node-1", "definitionId": "definitionId", "label": "Node Label", "config": {} }
  ],
  "edges": [
    { "id": "e1", "source": "node-1", "target": "node-2", "sourceHandle": "out", "targetHandle": "in" }
  ]
}`;

  let userContent = `User Prompt: ${promptText}\nGoal: ${plan.goal}\nRequired Nodes: ${JSON.stringify(plan.requiredNodes)}\nForbidden Nodes: ${JSON.stringify(plan.forbiddenNodes)}`;

  if (repairContext) {
    userContent += `\n\nREPAIR INSTRUCTIONS:
The previous generated graph failed validation with errors:
${repairContext.errors.map((e) => `- ${e}`).join("\n")}

Previous Invalid Graph:
${JSON.stringify(repairContext.previousGraph, null, 2)}

Please fix all validation errors and return a corrected JSON workflow.`;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${systemPrompt}\n\n${userContent}` }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    });

    if (!res.ok) {
      return null;
    }

    const resData = await res.json();
    const textStr = resData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!textStr) return null;

    const parsed = JSON.parse(textStr);
    return GeneratedWorkflowSchema.parse(parsed);
  } catch {
    return null;
  }
}

export class WorkflowGenerationService {
  static async generateWorkflow(options: {
    prompt: string;
    clientId?: string;
    userId?: string | null;
    userContext?: PlannerUserContext;
  }): Promise<{
    workflow: {
      name: string;
      description: string;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
    };
    plan: WorkflowPlanData;
    explanation: WorkflowExplanationData;
    validation: WorkflowValidationResultData;
    optimizations: WorkflowOptimizationResult;
    architectureScore: ArchitectureScoreResult;
    generationId: string;
    mode: "template-adapted" | "template-starting-point" | "gemini-3.8-flash" | "openai" | "offline-generator";
  }> {
    const { prompt, clientId = "unknown", userId, userContext } = options;

    if (!prompt || !prompt.trim()) {
      throw new Error("PROMPT_REQUIRED: Please provide a workflow description.");
    }

    const rateCheck = checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED: Generation rate limit reached (20 generations per hour). Please try again later.");
    }

    // 1. Credential & Intent-Aware Multi-Stage Planning
    const plan = WorkflowPlanner.createPlan(prompt, userContext);

    // 2. Template Matching Check
    const templateMatch = TemplateMatcher.matchAndAdapt(prompt);
    let mode: "template-adapted" | "template-starting-point" | "gemini-3.8-flash" | "openai" | "offline-generator" = "offline-generator";
    let rawGeneratedData: GeneratedWorkflowData | null = null;

    // Check if template match satisfies required & forbidden nodes
    if (templateMatch.matched && templateMatch.adaptedWorkflow) {
      const tplNodes = new Set(templateMatch.adaptedWorkflow.nodes.map((n) => n.definitionId));
      const hasForbidden = plan.forbiddenNodes.some((f) => tplNodes.has(f as unknown as typeof templateMatch.adaptedWorkflow.nodes[0]["definitionId"]));
      const hasAllRequired = plan.requiredNodes.every((r) => tplNodes.has(r as unknown as typeof templateMatch.adaptedWorkflow.nodes[0]["definitionId"]));

      if (!hasForbidden && hasAllRequired) {
        rawGeneratedData = templateMatch.adaptedWorkflow;
        mode = templateMatch.matchMode === "useTemplate" ? "template-adapted" : "template-starting-point";
      }
    }

    // 3. Gemini 3.8 Flash Reasoning Engine Generation
    if (!rawGeneratedData && process.env.GEMINI_API_KEY) {
      const geminiData = await callGemini38Flash(prompt, plan);
      if (geminiData) {
        rawGeneratedData = geminiData;
        mode = "gemini-3.8-flash";
      }
    }

    // 4. OpenAI Fallback Generation
    if (!rawGeneratedData && process.env.OPENAI_API_KEY) {
      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: `You are Neuraloop's AI Workflow Architect. Convert natural language prompts into a valid JSON workflow graph.

Available Node definitionIds (YOU MUST ONLY USE THESE EXACT KEYS):
${ALL_NODE_DEFINITION_IDS.map((id) => `- "${id}"`).join("\n")}

Handle Naming Conventions:
- Standard Triggers / Actions: sourceHandle: "out", targetHandle: "in"
- IF Nodes: sourceHandle: "true" or "false"
- Switch Nodes: sourceHandle: "case_1", "case_2", or "default"

Output JSON Schema:
{
  "name": "string",
  "description": "string",
  "nodes": [{ "id": "node-1", "definitionId": "definitionId", "label": "Label", "config": {} }],
  "edges": [{ "id": "e1", "source": "node-1", "target": "node-2", "sourceHandle": "out|true|false|case_1|default", "targetHandle": "in" }]
}`,
              },
              { role: "user", content: `Prompt: ${prompt}\nPlanned Goal: ${plan.goal}\nRequired Nodes: ${JSON.stringify(plan.requiredNodes)}\nForbidden Nodes: ${JSON.stringify(plan.forbiddenNodes)}` },
            ],
          }),
        });

        if (response.ok) {
          const resData = await response.json();
          const contentStr = resData.choices?.[0]?.message?.content;
          if (contentStr) {
            rawGeneratedData = GeneratedWorkflowSchema.parse(JSON.parse(contentStr));
            mode = "openai";
          }
        }
      } catch {
        // Fall through to offline generator
      }
    }

    // 5. Offline Deterministic Architect Generator
    if (!rawGeneratedData) {
      rawGeneratedData = generateOfflineWorkflow(prompt, plan);
      mode = "offline-generator";
    }

    // 6. Pre-Creation Validation & Automated Repair Loop (Max 2 Attempts)
    let validation = WorkflowValidator.validateGraph(rawGeneratedData, plan);
    let repairAttempts = 0;

    while (!validation.isValid && repairAttempts < 2) {
      repairAttempts++;
      if (process.env.GEMINI_API_KEY) {
        const repairedData = await callGemini38Flash(prompt, plan, {
          errors: validation.errors,
          previousGraph: rawGeneratedData,
        });
        if (repairedData) {
          rawGeneratedData = repairedData;
          validation = WorkflowValidator.validateGraph(rawGeneratedData, plan);
        } else {
          break;
        }
      } else {
        break;
      }
    }

    // Deterministic Repair Fallback if validation still fails after repair loop
    if (!validation.isValid) {
      rawGeneratedData = generateOfflineWorkflow(prompt, plan);
      validation = WorkflowValidator.validateGraph(rawGeneratedData, plan);
      mode = "offline-generator";
    }

    // 7. Schema Validation & Canvas Transformation
    const validatedData = GeneratedWorkflowSchema.parse(rawGeneratedData);

    const canonicalNodes: WorkflowNode[] = validatedData.nodes.map((n, idx) => {
      const created = createWorkflowNode(n.definitionId, { x: 0, y: 0 });
      const defaultConfig = getDefaultConfigForDefinition(n.definitionId, prompt);
      const userConfig = (n.config || {}) as Record<string, unknown>;

      const mergedConfig = Object.assign(
        {},
        created.data.config || {},
        defaultConfig,
        userConfig,
      );

      return {
        id: n.id || `node-${idx + 1}`,
        type: created.type,
        position: created.position,
        data: {
          ...created.data,
          label: n.label || created.data.label,
          config: mergedConfig,
        },
      };
    });

    const canonicalEdges: WorkflowEdge[] = validatedData.edges.map((e, idx) => ({
      id: e.id || `edge-${idx + 1}`,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle || "out",
      targetHandle: e.targetHandle || "in",
    }));

    const { nodes: cleanNodes, edges: cleanEdges } = sanitizeGraph({
      nodes: canonicalNodes,
      edges: canonicalEdges,
    });

    // 8. Non-Destructive Auto-Optimization Engine
    const { optimizations } = WorkflowOptimizer.optimizeGraph(validatedData);

    // 9. Compute 0-100 Architecture Score
    const architectureScore = ArchitectureScorer.computeScore(validatedData);

    // 10. Grid Auto-Layout
    const { nodes: layoutNodes, edges: layoutEdges } = applyAutoLayout(cleanNodes, cleanEdges);

    // 11. Natural Language Explanation Generator
    const explanation = WorkflowExplainer.explainWorkflow(validatedData, plan);

    // 12. Template Learning Analytics Tracking
    const generationId = `gen-${makeId("g")}`;
    await TemplateUsageAnalytics.logGeneration({
      userId,
      prompt,
      templateId: templateMatch.templateId,
      templateName: templateMatch.templateName,
      mode,
      architectureScore: architectureScore.score,
      status: "success",
    });

    return {
      workflow: {
        name: validatedData.name,
        description: validatedData.description,
        nodes: layoutNodes,
        edges: layoutEdges,
      },
      plan,
      explanation,
      validation,
      optimizations,
      architectureScore,
      generationId,
      mode,
    };
  }

  static refineWorkflow(
    currentWorkflow: GeneratedWorkflowData,
    refinementPrompt: string,
  ): RefinementResult {
    return WorkflowRefiner.refineWorkflow(currentWorkflow, refinementPrompt);
  }
}
