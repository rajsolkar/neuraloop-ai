/**
 * Neuraloop Phase 20 — AI Workflow Architect Service v2
 * Orchestrates multi-stage workflow planning, template adaptation, knowledge base node matching,
 * pre-creation graph validation, structural auto-optimization, architecture scoring, and learning analytics.
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
      return { provider: "openai", model: "gpt-4o-mini", prompt: "Summarize payload data" };
    case "slack":
      return { channel: "#general", message: "New automated notification from Neuraloop workflow" };
    case "email":
      return { to: "alerts@company.com", subject: "Workflow Digest", body: "Here is your workflow summary digest." };
    case "telegram":
      return { chatId: "@alerts_channel", message: "**Workflow Alert**:\n{{input.message}}", parseMode: "Markdown" };
    case "discord":
      return { messageType: "embed", content: "**Daily Digest**", embedTitle: "Workflow Summary", embedColor: 3447003 };
    case "google-sheets":
      return { operation: "append_row", range: "Sheet1!A:C", valuesJson: "[[\"{{input.name}}\", \"{{input.email}}\"]]" };
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
      return { duration: 1, unit: "hours" };
    case "if":
      return { fieldPath: "score", operator: "greater_than", value: "80" };
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

export function generateOfflineWorkflow(prompt: string): GeneratedWorkflowData {
  const p = prompt.toLowerCase();

  // Pattern 1: IF Branching (Webhook -> IF -> Email / Slack)
  if (p.includes("check if") || (p.includes("webhook") && p.includes("if"))) {
    return {
      name: "Conditional Lead Ingestion Workflow",
      description: "Ingests webhook data, evaluates condition, and routes to email or slack",
      nodes: [
        { id: "node-1", definitionId: "webhook", label: "Webhook Trigger", config: getDefaultConfigForDefinition("webhook", p) },
        { id: "node-2", definitionId: "if", label: "Check Score", config: getDefaultConfigForDefinition("if", p) },
        { id: "node-3", definitionId: "email", label: "Send Email", config: getDefaultConfigForDefinition("email", p) },
        { id: "node-4", definitionId: "slack", label: "Send Slack Alert", config: getDefaultConfigForDefinition("slack", p) },
      ],
      edges: [
        { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        { id: "e2", source: "node-2", target: "node-3", sourceHandle: "true", targetHandle: "in" },
        { id: "e3", source: "node-2", target: "node-4", sourceHandle: "false", targetHandle: "in" },
      ],
    };
  }

  // Pattern 2: Delay Onboarding Sequence (Manual/Webhook -> Delay -> Email)
  if (p.includes("delay") || p.includes("wait ")) {
    return {
      name: "Customer Onboarding Sequence",
      description: "Wait delay step before welcome email",
      nodes: [
        { id: "node-1", definitionId: "manual-trigger", label: "Manual Trigger", config: {} },
        { id: "node-2", definitionId: "delay", label: "Delay Wait", config: getDefaultConfigForDefinition("delay", p) },
        { id: "node-3", definitionId: "email", label: "Welcome Email", config: getDefaultConfigForDefinition("email", p) },
      ],
      edges: [
        { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        { id: "e2", source: "node-2", target: "node-3", sourceHandle: "out", targetHandle: "in" },
      ],
    };
  }

  // Pattern 3: Webhook / Form Ingestion -> Transform -> AI -> Switch -> Telegram / Sheets
  if (p.includes("webhook") || p.includes("lead") || p.includes("form") || p.includes("ticket")) {
    const hasSheets = p.includes("sheets") || p.includes("google");
    const hasTelegram = p.includes("telegram");

    const nodes: GeneratedWorkflowData["nodes"] = [
      { id: "node-1", definitionId: "webhook", label: "Webhook Trigger", config: getDefaultConfigForDefinition("webhook", p) },
      { id: "node-2", definitionId: "transform", label: "Normalize Payload", config: getDefaultConfigForDefinition("transform", p) },
      { id: "node-3", definitionId: "ai", label: "Qualify Payload", config: getDefaultConfigForDefinition("ai", p) },
      { id: "node-4", definitionId: "switch", label: "Route Priority Tier", config: getDefaultConfigForDefinition("switch", p) },
    ];

    const edges: GeneratedWorkflowData["edges"] = [
      { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2", source: "node-2", target: "node-3", sourceHandle: "out", targetHandle: "in" },
      { id: "e3", source: "node-3", target: "node-4", sourceHandle: "out", targetHandle: "in" },
    ];

    if (hasTelegram) {
      nodes.push({ id: "node-5", definitionId: "telegram", label: "Send Telegram Alert", config: getDefaultConfigForDefinition("telegram", p) });
      edges.push({ id: "e4", source: "node-4", target: "node-5", sourceHandle: "case_1", targetHandle: "in" });
    }

    if (hasSheets || !hasTelegram) {
      nodes.push({ id: "node-6", definitionId: "google-sheets", label: "Log to Google Sheets", config: getDefaultConfigForDefinition("google-sheets", p) });
      edges.push({ id: "e5", source: "node-4", target: "node-6", sourceHandle: "default", targetHandle: "in" });
    }

    return {
      name: "Automated Webhook Lead & Ticket Router",
      description: "Ingests form webhook data, normalizes fields with Transform, evaluates intent via AI, and routes output.",
      nodes,
      edges,
    };
  }

  // Pattern 4: Schedule -> HTTP Request -> Slack (Direct weather/feed fetch)
  if (p.includes("weather") || (p.includes("schedule") && p.includes("http"))) {
    return {
      name: "Scheduled Weather Fetcher",
      description: "Daily weather data fetcher dispatching to Slack",
      nodes: [
        { id: "node-1", definitionId: "schedule", label: "Schedule Trigger", config: getDefaultConfigForDefinition("schedule", p) },
        { id: "node-2", definitionId: "http-request", label: "Fetch Weather Data", config: getDefaultConfigForDefinition("http-request", p) },
        { id: "node-3", definitionId: "slack", label: "Post to Slack", config: getDefaultConfigForDefinition("slack", p) },
      ],
      edges: [
        { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        { id: "e2", source: "node-2", target: "node-3", sourceHandle: "out", targetHandle: "in" },
      ],
    };
  }

  // Pattern 2: Schedule -> HTTP Request / Sheets -> AI -> Loop / Notification
  if (p.includes("schedule") || p.includes("morning") || p.includes("every") || p.includes("news") || p.includes("monitor")) {
    const hasDiscord = p.includes("discord");
    const hasTelegram = p.includes("telegram");
    const hasSlack = p.includes("slack");

    const targetNotify = hasDiscord ? "discord" : hasTelegram ? "telegram" : hasSlack ? "slack" : "email";
    const notifyLabel = hasDiscord ? "Alert Discord" : hasTelegram ? "Send Telegram Alert" : hasSlack ? "Notify Slack" : "Email Digest";

    return {
      name: "Scheduled AI News & Monitoring Digest",
      description: "Scheduled workflow to fetch target feed, analyze insights using AI, and dispatch alert notifications.",
      nodes: [
        { id: "node-1", definitionId: "schedule", label: "Schedule Trigger", config: getDefaultConfigForDefinition("schedule", p) },
        { id: "node-2", definitionId: "http-request", label: "Fetch Feed Data", config: getDefaultConfigForDefinition("http-request", p) },
        { id: "node-3", definitionId: "ai", label: "Extract AI Insights", config: getDefaultConfigForDefinition("ai", p) },
        { id: "node-4", definitionId: targetNotify, label: notifyLabel, config: getDefaultConfigForDefinition(targetNotify, p) },
      ],
      edges: [
        { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        { id: "e2", source: "node-2", target: "node-3", sourceHandle: "out", targetHandle: "in" },
        { id: "e3", source: "node-3", target: "node-4", sourceHandle: "out", targetHandle: "in" },
      ],
    };
  }

  // Generic Fallback
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
    mode: "template-adapted" | "template-starting-point" | "openai" | "offline-generator";
  }> {
    const { prompt, clientId = "unknown", userId, userContext } = options;

    if (!prompt || !prompt.trim()) {
      throw new Error("PROMPT_REQUIRED: Please provide a workflow description.");
    }

    const rateCheck = checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED: Generation rate limit reached (20 generations per hour). Please try again later.");
    }

    // 1. Tiered Template Matcher (score >= 0.85 -> useTemplate, 0.60 <= score < 0.85 -> useTemplateAsStartingPoint)
    const templateMatch = TemplateMatcher.matchAndAdapt(prompt);
    let mode: "template-adapted" | "template-starting-point" | "openai" | "offline-generator" = "offline-generator";
    let rawGeneratedData: GeneratedWorkflowData;

    // 2. Credential-Aware Multi-Stage Planning
    const plan = WorkflowPlanner.createPlan(prompt, userContext);

    if (templateMatch.matched && templateMatch.adaptedWorkflow) {
      rawGeneratedData = templateMatch.adaptedWorkflow;
      mode = templateMatch.matchMode === "useTemplate" ? "template-adapted" : "template-starting-point";
    } else {
      const apiKey = process.env.OPENAI_API_KEY;
      if (apiKey && apiKey.trim() !== "") {
        try {
          const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
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

OAuth Connection Rules:
- When prompt references GitHub, Slack, or Google Workspace APIs, use "http-request" node with:
  "authType": "oauth_connection", "connectionProvider": "github" | "slack" | "google"

Output JSON Schema:
{
  "name": "string",
  "description": "string",
  "nodes": [{ "id": "node-1", "definitionId": "definitionId", "label": "Label", "config": {} }],
  "edges": [{ "id": "e1", "source": "node-1", "target": "node-2", "sourceHandle": "out|true|false|case_1|default", "targetHandle": "in" }]
}`,
                },
                { role: "user", content: `Prompt: ${prompt}\nPlanned Goal: ${plan.goal}\nRecommended Pattern: ${plan.recommendedPattern}` },
              ],
            }),
          });

          if (response.ok) {
            const resData = await response.json();
            const contentStr = resData.choices?.[0]?.message?.content;
            if (contentStr) {
              const parsed = JSON.parse(contentStr);
              rawGeneratedData = GeneratedWorkflowSchema.parse(parsed);
              mode = "openai";
            } else {
              rawGeneratedData = generateOfflineWorkflow(prompt);
            }
          } else {
            rawGeneratedData = generateOfflineWorkflow(prompt);
          }
        } catch {
          rawGeneratedData = generateOfflineWorkflow(prompt);
        }
      } else {
        rawGeneratedData = generateOfflineWorkflow(prompt);
      }
    }

    // 3. Schema Validation & Canvas Transformation
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

    // 4. Pre-Creation Graph Validation
    const validation = WorkflowValidator.validateGraph(validatedData);

    // 5. Non-Destructive Auto-Optimization Engine
    const { optimizations } = WorkflowOptimizer.optimizeGraph(validatedData);

    // 6. Compute 0-100 Architecture Score
    const architectureScore = ArchitectureScorer.computeScore(validatedData);

    // 7. Grid Auto-Layout
    const { nodes: layoutNodes, edges: layoutEdges } = applyAutoLayout(cleanNodes, cleanEdges);

    // 8. Natural Language Explanation Generator
    const explanation = WorkflowExplainer.explainWorkflow(validatedData, plan);

    // 9. Template Learning Analytics Tracking
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

  /**
   * Phase 20.5: Conversational "Ask Nori" Workflow Refinements Engine
   */
  static refineWorkflow(
    currentWorkflow: GeneratedWorkflowData,
    refinementPrompt: string,
  ): RefinementResult {
    return WorkflowRefiner.refineWorkflow(currentWorkflow, refinementPrompt);
  }
}
