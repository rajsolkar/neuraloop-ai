/**
 * Neuraloop Phase 20 — Architecture Scoring Engine
 * Computes a 0–100 architecture quality score for every generated workflow based on:
 * - Valid Node Registry Types (20 pts)
 * - Credential & OAuth Binding Completeness (20 pts)
 * - Variable Handlebars Reference Syntax Correctness (20 pts)
 * - Error & Branch Handling (20 pts)
 * - Node Efficiency & Non-Redundancy (20 pts)
 */

import { NODE_KNOWLEDGE_SPECS } from "./workflow-knowledge-base";
import type { GeneratedWorkflowData } from "./schema";

export interface ArchitectureScoreResult {
  score: number; // 0 - 100
  breakdown: {
    validNodesScore: number;       // max 20
    credentialScore: number;        // max 20
    variableSyntaxScore: number;   // max 20
    errorHandlingScore: number;    // max 20
    efficiencyScore: number;       // max 20
  };
  feedback: string[];
}

export class ArchitectureScorer {
  static computeScore(workflow: GeneratedWorkflowData): ArchitectureScoreResult {
    const { nodes, edges } = workflow;
    const feedback: string[] = [];

    // 1. Valid Nodes Score (max 20)
    let validNodesScore = 20;
    const hasTrigger = nodes.some((n) => ["manual-trigger", "webhook", "schedule"].includes(n.definitionId));
    if (!hasTrigger) {
      validNodesScore -= 10;
      feedback.push("Missing a valid workflow trigger node.");
    }
    const invalidNodes = nodes.filter((n) => !NODE_KNOWLEDGE_SPECS[n.definitionId]);
    if (invalidNodes.length > 0) {
      validNodesScore -= Math.min(10, invalidNodes.length * 5);
      feedback.push(`Found ${invalidNodes.length} unregistered node definitions.`);
    }

    // 2. Credential & OAuth Score (max 20)
    let credentialScore = 20;
    for (const n of nodes) {
      const config = n.config || {};
      if (n.definitionId === "telegram" && !config.chatId) {
        credentialScore -= 5;
        feedback.push(`Telegram node '${n.label}' requires a chatId.`);
      }
      if (n.definitionId === "slack" && !config.channel && !config.message) {
        credentialScore -= 5;
        feedback.push(`Slack node '${n.label}' requires channel configuration.`);
      }
    }
    credentialScore = Math.max(0, credentialScore);

    // 3. Variable Syntax Score (max 20)
    let variableSyntaxScore = 20;
    const declaredNodeIds = new Set(nodes.map((n) => n.id));
    const exprRegex = /\{\{\s*steps\.([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_.]+)\s*\}\}/g;

    for (const n of nodes) {
      const str = JSON.stringify(n.config || {});
      let match: RegExpExecArray | null;
      while ((match = exprRegex.exec(str)) !== null) {
        const refId = match[1];
        if (!declaredNodeIds.has(refId) && refId !== "input") {
          variableSyntaxScore -= 5;
          feedback.push(`Node '${n.label}' references output from undeclared step '${refId}'.`);
        }
      }
    }
    variableSyntaxScore = Math.max(0, variableSyntaxScore);

    // 4. Error & Branch Handling Score (max 20)
    let errorHandlingScore = 20;
    const branchingNodes = nodes.filter((n) => n.definitionId === "if" || n.definitionId === "switch");
    for (const bNode of branchingNodes) {
      const outgoingEdges = edges.filter((e) => e.source === bNode.id);
      if (bNode.definitionId === "if" && outgoingEdges.length < 2) {
        errorHandlingScore -= 5;
        feedback.push(`IF Condition '${bNode.label}' only has one connected branch.`);
      }
    }
    errorHandlingScore = Math.max(0, errorHandlingScore);

    // 5. Node Efficiency Score (max 20)
    let efficiencyScore = 20;
    for (let i = 0; i < nodes.length - 1; i++) {
      if (nodes[i].definitionId === "ai" && nodes[i + 1].definitionId === "ai") {
        efficiencyScore -= 5;
        feedback.push("Consecutive AI nodes detected.");
      }
    }
    efficiencyScore = Math.max(0, efficiencyScore);

    const score = Math.min(
      100,
      Math.max(
        0,
        validNodesScore + credentialScore + variableSyntaxScore + errorHandlingScore + efficiencyScore,
      ),
    );

    if (feedback.length === 0) {
      feedback.push("Excellent workflow architecture with 100% valid node configuration!");
    }

    return {
      score,
      breakdown: {
        validNodesScore,
        credentialScore,
        variableSyntaxScore,
        errorHandlingScore,
        efficiencyScore,
      },
      feedback,
    };
  }
}
