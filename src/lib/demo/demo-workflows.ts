import { prisma } from "@/lib/prisma";
import { createWorkflowNode } from "@/lib/workflow";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import crypto from "crypto";

export interface DemoWorkflowSpec {
  id: string;
  name: string;
  description: string;
  status: "published" | "draft";
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const SHOWCASE_DEMO_WORKFLOWS: DemoWorkflowSpec[] = [
  {
    id: "demo-lead-qualification",
    name: "AI Lead Qualification & Escalation",
    description: "Evaluates inbound webhook leads with Claude 3.5 Sonnet, routes high-value prospects to Slack, and flags spam.",
    status: "published",
    nodes: [
      createWorkflowNode("webhook", { x: 100, y: 150 }),
      createWorkflowNode("ai", { x: 380, y: 150 }),
      createWorkflowNode("switch", { x: 660, y: 150 }),
      createWorkflowNode("slack", { x: 940, y: 100 }),
      createWorkflowNode("email", { x: 940, y: 220 }),
    ],
    edges: [
      { id: "e1-2", source: "n-1", target: "n-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2-3", source: "n-2", target: "n-3", sourceHandle: "out", targetHandle: "in" },
      { id: "e3-4", source: "n-3", target: "n-4", sourceHandle: "true", targetHandle: "in" },
      { id: "e3-5", source: "n-3", target: "n-5", sourceHandle: "false", targetHandle: "in" },
    ],
  },
  {
    id: "demo-support-router",
    name: "Customer Support Smart Router",
    description: "Analyzes incoming support ticket urgency using GPT-4o, categorizes sentiment, and dispatches email alerts.",
    status: "published",
    nodes: [
      createWorkflowNode("webhook", { x: 100, y: 150 }),
      createWorkflowNode("ai", { x: 380, y: 150 }),
      createWorkflowNode("switch", { x: 660, y: 150 }),
      createWorkflowNode("email", { x: 940, y: 150 }),
    ],
    edges: [
      { id: "e1-2", source: "n-1", target: "n-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2-3", source: "n-2", target: "n-3", sourceHandle: "out", targetHandle: "in" },
      { id: "e3-4", source: "n-3", target: "n-4", sourceHandle: "out", targetHandle: "in" },
    ],
  },
  {
    id: "demo-content-factory",
    name: "Automated Social Content Factory",
    description: "Runs on a cron schedule to synthesize AI social media posts and append draft campaigns into Google Sheets.",
    status: "published",
    nodes: [
      createWorkflowNode("schedule", { x: 100, y: 150 }),
      createWorkflowNode("ai", { x: 380, y: 150 }),
      createWorkflowNode("google-sheets", { x: 660, y: 150 }),
    ],
    edges: [
      { id: "e1-2", source: "n-1", target: "n-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2-3", source: "n-2", target: "n-3", sourceHandle: "out", targetHandle: "in" },
    ],
  },
  {
    id: "demo-research-assistant",
    name: "Daily Industry Research Assistant",
    description: "Iterates through topic list in Google Sheets, executes web research with Gemini 1.5 Pro, and emails daily digest.",
    status: "published",
    nodes: [
      createWorkflowNode("google-sheets", { x: 100, y: 150 }),
      createWorkflowNode("loop", { x: 380, y: 150 }),
      createWorkflowNode("ai", { x: 660, y: 150 }),
      createWorkflowNode("email", { x: 940, y: 150 }),
    ],
    edges: [
      { id: "e1-2", source: "n-1", target: "n-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2-3", source: "n-2", target: "n-3", sourceHandle: "out", targetHandle: "in" },
      { id: "e3-4", source: "n-3", target: "n-4", sourceHandle: "out", targetHandle: "in" },
    ],
  },
  {
    id: "demo-incident-monitor",
    name: "Real-time Infrastructure Incident Monitor",
    description: "Filters high-severity alert webhooks and immediately triggers urgent Slack devops alerts with retry logic.",
    status: "published",
    nodes: [
      createWorkflowNode("webhook", { x: 100, y: 150 }),
      createWorkflowNode("transform", { x: 380, y: 150 }),
      createWorkflowNode("slack", { x: 660, y: 150 }),
    ],
    edges: [
      { id: "e1-2", source: "n-1", target: "n-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2-3", source: "n-2", target: "n-3", sourceHandle: "out", targetHandle: "in" },
    ],
  },
  {
    id: "demo-github-reviewer",
    name: "GitHub PR AI Code Auditor",
    description: "Intercepts GitHub pull request webhooks, runs security audit with Claude 3.5, and posts review summary to Discord.",
    status: "published",
    nodes: [
      createWorkflowNode("webhook", { x: 100, y: 150 }),
      createWorkflowNode("ai", { x: 380, y: 150 }),
      createWorkflowNode("telegram", { x: 660, y: 150 }),
    ],
    edges: [
      { id: "e1-2", source: "n-1", target: "n-2", sourceHandle: "out", targetHandle: "in" },
      { id: "e2-3", source: "n-2", target: "n-3", sourceHandle: "out", targetHandle: "in" },
    ],
  },
];

export async function ensureDemoDataSeeded(userId: string = "demo-user") {
  try {
    const existingCount = await prisma.workflow.count({ where: { userId } });
    if (existingCount > 0) return;

    for (const spec of SHOWCASE_DEMO_WORKFLOWS) {
      const workflowId = spec.id || crypto.randomUUID();
      const versionId = crypto.randomUUID();

      const created = await prisma.workflow.create({
        data: {
          id: workflowId,
          name: spec.name,
          description: spec.description,
          status: spec.status,
          userId,
          publishedVersionNumber: 1,
          activeVersionNumber: 1,
        },
      });

      // Version 1
      const createdVersion = await prisma.workflowVersion.create({
        data: {
          id: versionId,
          workflowId: created.id,
          version: 1,
          comment: "Initial Demo Release v1.0",
          definition: {
            nodes: spec.nodes,
            edges: spec.edges,
          } as any,
          isActive: true,
        },
      });

      // Seed realistic execution history for analytics showcase
      const runStatuses: Array<"success" | "failed" | "running"> = [
        "success", "success", "success", "success", "success",
        "success", "success", "success", "success", "failed",
      ];

      for (let i = 0; i < 5; i++) {
        const runStatus = runStatuses[i % runStatuses.length];
        const duration = Math.floor(Math.random() * 800) + 200;
        const tokensIn = Math.floor(Math.random() * 400) + 150;
        const tokensOut = Math.floor(Math.random() * 300) + 100;
        const cost = (tokensIn * 0.000015 + tokensOut * 0.00006);

        await prisma.workflowExecution.create({
          data: {
            id: crypto.randomUUID(),
            workflowId: created.id,
            workflowVersionId: createdVersion.id,
            userId,
            status: runStatus,
            source: "webhook",
            startedAt: new Date(Date.now() - (i + 1) * 3600000),
            completedAt: runStatus !== "running" ? new Date(Date.now() - (i + 1) * 3600000 + duration) : null,
            duration,
            aiTokensIn: tokensIn,
            aiTokensOut: tokensOut,
            aiEstimatedCost: parseFloat(cost.toFixed(4)),
            input: { payload: "Demo input payload" },
            output: { result: "Demo output payload", confidence: 0.98 },
            errorMessage: runStatus === "failed" ? "Simulated API Rate Limit 429" : null,
            nodeExecutions: {
              create: spec.nodes.map((n, idx) => ({
                id: crypto.randomUUID(),
                nodeId: n.id,
                nodeType: n.data.definitionId,
                status: runStatus === "failed" && idx === spec.nodes.length - 1 ? "failed" : "success",
                startedAt: new Date(),
                completedAt: new Date(),
                duration: Math.floor(duration / spec.nodes.length),
                input: { payload: "Demo step input" },
                output: { result: "Demo step output" },
                errorMessage: runStatus === "failed" && idx === spec.nodes.length - 1 ? "Simulated API Rate Limit 429" : null,
              })),
            },
          },
        });
      }
    }
  } catch (err) {
    console.error("Failed to seed demo workflows:", err);
  }
}
