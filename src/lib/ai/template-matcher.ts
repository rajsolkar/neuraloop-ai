/**
 * Neuraloop Phase 20 — AI Workflow Template Matcher Engine
 * Stage 1: Classifies prompt intent into business domain
 * Stage 2: Scores prompt similarity against 18 official marketplace templates
 * Stage 3: Tiered Adaptation Logic:
 *  - score >= 0.85 -> useTemplate()
 *  - 0.60 <= score < 0.85 -> useTemplateAsStartingPoint()
 *  - score < 0.60 -> generateFromScratch()
 */

import { OFFICIAL_TEMPLATE_SPECS, type TemplateSpec } from "./workflow-knowledge-base";
import { INITIAL_TEMPLATES } from "../../../prisma/seed-templates";
import type { GeneratedWorkflowData } from "./schema";

export type TemplateMatchMode = "useTemplate" | "useTemplateAsStartingPoint" | "generateFromScratch";

export interface TemplateMatchResult {
  matched: boolean;
  matchMode: TemplateMatchMode;
  templateId?: string;
  templateName?: string;
  similarityScore: number;
  domain: string;
  adaptedWorkflow?: GeneratedWorkflowData;
}

export class TemplateMatcher {
  static classifyDomain(prompt: string): string {
    const p = prompt.toLowerCase();
    if (p.includes("monitor") || p.includes("uptime") || p.includes("status") || p.includes("ping") || p.includes("outage")) {
      return "Monitoring";
    }
    if (p.includes("lead") || p.includes("qualify") || p.includes("sales") || p.includes("form submission")) {
      return "Lead Management";
    }
    if (p.includes("content") || p.includes("post") || p.includes("social") || p.includes("draft") || p.includes("calendar")) {
      return "Content Creation";
    }
    if (p.includes("research") || p.includes("topics") || p.includes("competitor") || p.includes("extract")) {
      return "Research";
    }
    if (p.includes("ticket") || p.includes("support") || p.includes("triage") || p.includes("issue")) {
      return "Support";
    }
    if (p.includes("summary") || p.includes("digest") || p.includes("report") || p.includes("email")) {
      return "Notifications";
    }
    return "General Automation";
  }

  static matchAndAdapt(prompt: string): TemplateMatchResult {
    const p = prompt.toLowerCase();
    const domain = this.classifyDomain(prompt);

    let bestMatch: { spec: TemplateSpec; score: number } | null = null;

    for (const spec of OFFICIAL_TEMPLATE_SPECS) {
      let matchedTags = 0;
      for (const tag of spec.tags) {
        if (p.includes(tag)) matchedTags++;
      }

      let matchedNodes = 0;
      for (const nodeKey of spec.requiredNodes) {
        if (p.includes(nodeKey)) matchedNodes++;
      }

      const tagScore = spec.tags.length > 0 ? matchedTags / spec.tags.length : 0;
      const nodeScore = spec.requiredNodes.length > 0 ? matchedNodes / spec.requiredNodes.length : 0;

      const score = parseFloat((tagScore * 0.6 + nodeScore * 0.4).toFixed(2));

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { spec, score };
      }
    }

    const score = bestMatch ? bestMatch.score : 0;

    let matchMode: TemplateMatchMode = "generateFromScratch";
    if (score >= 0.85) {
      matchMode = "useTemplate";
    } else if (score >= 0.60) {
      matchMode = "useTemplateAsStartingPoint";
    }

    if (matchMode === "generateFromScratch" || !bestMatch) {
      return {
        matched: false,
        matchMode: "generateFromScratch",
        similarityScore: score,
        domain,
      };
    }

    const seededTemplate = INITIAL_TEMPLATES.find((t) => t.name === bestMatch?.spec.name);
    if (!seededTemplate) {
      return { matched: false, matchMode: "generateFromScratch", similarityScore: score, domain };
    }

    const rawDef = JSON.parse(JSON.stringify(seededTemplate.definition));

    const adaptedNodes = (rawDef.nodes as Array<Record<string, unknown>>).map((node) => {
      const data = (node.data || {}) as Record<string, unknown>;
      const config = (data.config || {}) as Record<string, unknown>;
      const defId = (data.definitionId as string) || "";

      if (defId === "telegram" && (p.includes("@") || p.includes("chat"))) {
        const match = prompt.match(/@[a-zA-Z0-9_]+/);
        if (match) config.chatId = match[0];
      }

      if (defId === "slack" && p.includes("#")) {
        const match = prompt.match(/#[a-zA-Z0-9_\-]+/);
        if (match) config.channel = match[0];
      }

      if (defId === "email" && p.includes("@")) {
        const match = prompt.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (match) config.to = match[0];
      }

      return {
        id: node.id as string,
        definitionId: defId as GeneratedWorkflowData["nodes"][number]["definitionId"],
        label: (data.label as string) || defId,
        config,
      };
    });

    const adaptedEdges = (rawDef.edges as Array<Record<string, unknown>>).map((edge) => ({
      id: edge.id as string,
      source: edge.source as string,
      target: edge.target as string,
      sourceHandle: (edge.sourceHandle as string) || "out",
      targetHandle: (edge.targetHandle as string) || "in",
    }));

    return {
      matched: true,
      matchMode,
      templateId: bestMatch.spec.id,
      templateName: bestMatch.spec.name,
      similarityScore: score,
      domain,
      adaptedWorkflow: {
        name: rawDef.name || seededTemplate.name,
        description: rawDef.description || seededTemplate.description,
        nodes: adaptedNodes,
        edges: adaptedEdges,
      },
    };
  }
}
