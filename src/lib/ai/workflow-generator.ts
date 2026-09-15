/**
 * Neuraloop Phase 6 — AI Workflow Generation Service
 * Manages OpenAI API integration, rate limiting, deterministic offline fallback,
 * Zod validation, default configs, auto-layout, and DB audit logging.
 */

import { prisma } from "@/lib/prisma";
import { makeId } from "@/lib/utils";
import { createWorkflowNode, sanitizeGraph } from "@/lib/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { mapIntentToNodeDefinition } from "./node-mapping";
import { applyAutoLayout } from "./auto-layout";
import {
  GeneratedWorkflowSchema,
  type GeneratedWorkflowData,
} from "./schema";

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
      return { url: "https://api.weatherapi.com/v1/current.json", method: "GET" };
    case "openai":
      return { model: "gpt-4o-mini", prompt: "Summarize data" };
    case "slack":
      return { channel: "#general", text: "New notification received from workflow" };
    case "email":
      return { to: "sales@example.com", subject: "Workflow Notification" };
    case "if": {
      let field = "lead.score";
      let value = "80";
      let operator = "greater_than";
      if (p.includes("score")) field = "lead.score";
      if (p.includes("80")) value = "80";
      if (p.includes("above") || p.includes(">")) operator = "greater_than";
      return { fieldPath: field, operator, value };
    }
    case "filter":
      return { fieldPath: "lead.name", operator: "is_not_empty" };
    case "delay": {
      let duration = 1;
      let unit = "hours";
      if (p.includes("1 hour")) { duration = 1; unit = "hours"; }
      else if (p.includes("10 minutes") || p.includes("minute")) { duration = 10; unit = "minutes"; }
      return { duration, unit };
    }
    default:
      return {};
  }
}

/**
 * Smart deterministic offline generator for fallback and unit testing
 */
export function generateOfflineWorkflow(prompt: string): GeneratedWorkflowData {
  const p = prompt.toLowerCase();

  // Pattern 1: Webhook -> IF -> Email (TRUE) / Slack (FALSE)
  if (p.includes("webhook") || p.includes("lead")) {
    const hasSlack = p.includes("slack");
    const hasEmail = p.includes("email");

    const nodes: GeneratedWorkflowData["nodes"] = [
      { id: "node-1", definitionId: "webhook", label: "Webhook Trigger", config: getDefaultConfigForDefinition("webhook", p) },
      { id: "node-2", definitionId: "if", label: "Lead Score Check", config: getDefaultConfigForDefinition("if", p) },
    ];
    const edges: GeneratedWorkflowData["edges"] = [
      { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
    ];

    if (hasEmail) {
      nodes.push({ id: "node-3", definitionId: "email", label: "Send Email", config: getDefaultConfigForDefinition("email", p) });
      edges.push({ id: "e2", source: "node-2", target: "node-3", sourceHandle: "true", targetHandle: "in" });
    }

    if (hasSlack) {
      nodes.push({ id: "node-4", definitionId: "slack", label: "Slack Notification", config: getDefaultConfigForDefinition("slack", p) });
      edges.push({ id: "e3", source: "node-2", target: "node-4", sourceHandle: "false", targetHandle: "in" });
    } else if (!hasEmail) {
      nodes.push({ id: "node-3", definitionId: "email", label: "Send Email", config: getDefaultConfigForDefinition("email", p) });
      edges.push({ id: "e2", source: "node-2", target: "node-3", sourceHandle: "true", targetHandle: "in" });
    }

    return {
      name: "Lead Qualification & Notification",
      description: "Automated workflow to ingest leads via webhook and branch notifications based on score.",
      nodes,
      edges,
    };
  }

  // Pattern 2: Schedule -> Weather/HTTP -> Slack
  if (p.includes("schedule") || p.includes("morning") || p.includes("weather") || p.includes("every")) {
    return {
      name: "Daily Weather & Slack Update",
      description: "Daily automated workflow to fetch data and notify Slack.",
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

  // Pattern 3: Signup -> Delay -> Welcome Email
  if (p.includes("signup") || p.includes("customer") || p.includes("wait") || p.includes("delay")) {
    return {
      name: "Customer Onboarding Sequence",
      description: "Automated sequence to send welcome email after initial delay.",
      nodes: [
        { id: "node-1", definitionId: "manual-trigger", label: "New Customer Signup", config: {} },
        { id: "node-2", definitionId: "delay", label: "Wait 1 Hour", config: getDefaultConfigForDefinition("delay", p) },
        { id: "node-3", definitionId: "email", label: "Welcome Email", config: getDefaultConfigForDefinition("email", p) },
      ],
      edges: [
        { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
        { id: "e2", source: "node-2", target: "node-3", sourceHandle: "out", targetHandle: "in" },
      ],
    };
  }

  // Generic Fallback Pattern
  const triggerDef = mapIntentToNodeDefinition(prompt);
  return {
    name: "Custom Automated Workflow",
    description: `Generated workflow for: ${prompt}`,
    nodes: [
      { id: "node-1", definitionId: triggerDef.definitionId as GeneratedWorkflowData["nodes"][number]["definitionId"], label: triggerDef.defaultLabel, config: getDefaultConfigForDefinition(triggerDef.definitionId, p) },
      { id: "node-2", definitionId: "http-request", label: "HTTP Action", config: getDefaultConfigForDefinition("http-request", p) },
    ],
    edges: [
      { id: "e1", source: "node-1", target: "node-2", sourceHandle: "out", targetHandle: "in" },
    ],
  };
}

export class WorkflowGenerationService {
  static async generateWorkflow(options: {
    prompt: string;
    clientId?: string;
  }): Promise<{
    workflow: {
      name: string;
      description: string;
      nodes: WorkflowNode[];
      edges: WorkflowEdge[];
    };
    generationId: string;
    mode: "openai" | "offline-generator";
  }> {
    const { prompt, clientId = "default-client" } = options;

    if (!prompt || !prompt.trim()) {
      throw new Error("PROMPT_REQUIRED: Please provide a workflow description.");
    }

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit(clientId);
    if (!rateCheck.allowed) {
      throw new Error("RATE_LIMIT_EXCEEDED: Generation rate limit reached (20 generations per hour). Please try again later.");
    }

    let mode: "openai" | "offline-generator" = "offline-generator";
    let rawGeneratedData: GeneratedWorkflowData;

    // 2. LLM Call via OpenAI (if OPENAI_API_KEY is configured)
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
                content: `You are Neuraloop's AI Workflow Planner. Convert natural language prompts into a valid JSON workflow graph.
Available node definitionIds:
- "manual-trigger", "webhook", "schedule" (triggers)
- "http-request", "openai", "slack", "email" (actions)
- "if", "filter", "delay" (logic)

Output JSON Schema:
{
  "name": "string",
  "description": "string",
  "nodes": [{ "id": "node-1", "definitionId": "definitionId", "label": "Label", "config": {} }],
  "edges": [{ "id": "e1", "source": "node-1", "target": "node-2", "sourceHandle": "out|true|false", "targetHandle": "in" }]
}`,
              },
              { role: "user", content: prompt },
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

    // 3. Zod Structured Schema Validation
    const validatedData = GeneratedWorkflowSchema.parse(rawGeneratedData);

    // 4. Transform into Canonical Neuraloop Workflow Nodes & Edges
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

    // 5. Apply Algorithmic Auto-Layout
    const { nodes: layoutNodes, edges: layoutEdges } = applyAutoLayout(cleanNodes, cleanEdges);

    // 6. DB Audit Log Event
    const generationId = `gen-${makeId("g")}`;
    if (process.env.DATABASE_URL) {
      try {
        await prisma.workflowGeneration.create({
          data: {
            id: generationId,
            prompt,
            status: "success",
          },
        });
      } catch (err) {
        console.warn("Failed to log WorkflowGeneration event in DB:", err);
      }
    }

    return {
      workflow: {
        name: validatedData.name,
        description: validatedData.description,
        nodes: layoutNodes,
        edges: layoutEdges,
      },
      generationId,
      mode,
    };
  }
}
