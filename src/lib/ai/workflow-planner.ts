/**
 * Neuraloop Phase 20 — AI Workflow Planner Engine
 * Performs credential-aware multi-stage planning BEFORE graph construction,
 * extracting structured intent, explicit requirements, explicit exclusions, and checking user credentials.
 */

import type { ALL_NODE_DEFINITION_IDS, StructuredIntentData, WorkflowPlanData } from "./schema";

export interface PlannerUserContext {
  availableCredentials?: string[];
  availableOAuthConnections?: string[];
}

export class WorkflowPlanner {
  static extractIntent(prompt: string): StructuredIntentData {
    const p = prompt.toLowerCase();

    // 1. Identify Trigger Type (Word boundary regex to avoid "form" matching "format")
    let trigger: StructuredIntentData["trigger"] = "manual-trigger";
    if (/\b(schedule|cron|every|daily|morning|weekly|monday|tuesday|wednesday|thursday|friday|saturday|sunday|hourly)\b/i.test(p)) {
      trigger = "schedule";
    } else if (/\b(webhook|form|lead|ticket|incoming|listen)\b/i.test(p) || p.includes("listen for")) {
      trigger = "webhook";
    }

    const requiredNodes = new Set<(typeof ALL_NODE_DEFINITION_IDS)[number]>();
    const forbiddenNodes = new Set<(typeof ALL_NODE_DEFINITION_IDS)[number]>();

    // Trigger node is always required
    requiredNodes.add(trigger);

    // 2. Identify Exclusion Directives (Explicit Exclusions)
    if (p.includes("instead of slack") || p.includes("no slack") || p.includes("not slack") || p.includes("do not use slack") || p.includes("without slack")) {
      forbiddenNodes.add("slack");
    }
    if (p.includes("instead of telegram") || p.includes("no telegram") || p.includes("not telegram") || p.includes("do not use telegram") || p.includes("without telegram")) {
      forbiddenNodes.add("telegram");
    }
    if (p.includes("no ai") || p.includes("do not use ai") || p.includes("without ai") || p.includes("not ai")) {
      forbiddenNodes.add("ai");
    }
    if (p.includes("no email") || p.includes("do not use email")) {
      forbiddenNodes.add("email");
    }

    // 3. Identify Explicit Requirements
    if (!forbiddenNodes.has("telegram") && p.includes("telegram")) {
      requiredNodes.add("telegram");
    }
    if (!forbiddenNodes.has("slack") && p.includes("slack")) {
      requiredNodes.add("slack");
    }
    if (!forbiddenNodes.has("ai") && (/\b(ai|openai|claude|gemini|summarize|qualify|gpt|insights|nlp)\b/i.test(p))) {
      requiredNodes.add("ai");
    }
    if (/\b(http|api|github|fetch|weather|news|ping)\b/i.test(p)) {
      requiredNodes.add("http-request");
    }
    if (p.includes("discord")) {
      requiredNodes.add("discord");
    }
    if (p.includes("sheets") || p.includes("google sheet") || p.includes("excel")) {
      requiredNodes.add("google-sheets");
    }
    if (!forbiddenNodes.has("email") && (/\b(email|mail)\b/i.test(p))) {
      requiredNodes.add("email");
    }
    if (/\b(code|javascript|script)\b/i.test(p)) {
      requiredNodes.add("code");
    }
    if (p.includes("webhook response") || p.includes("return response") || p.includes("http response")) {
      requiredNodes.add("webhook-response");
    }
    if (/\b(loop|each|iterate|for each)\b/i.test(p) || p.includes("for each")) {
      requiredNodes.add("loop");
    }
    if (p.includes("switch") || p.includes("route by priority") || p.includes("route ticket") || p.includes("route priority") || p.includes("priority router")) {
      requiredNodes.add("switch");
    }
    if (p.includes("check if") || p.includes("if score") || p.includes("evaluate condition") || (/\bif\b/i.test(p) && !p.includes("notification") && !p.includes("modify"))) {
      requiredNodes.add("if");
    }
    if (/\b(filter|filter out)\b/i.test(p)) {
      requiredNodes.add("filter");
    }
    if (p.includes("set variable") || p.includes("set-variable") || p.includes("status='validated'") || p.includes("validated")) {
      requiredNodes.add("set-variable");
    }
    if (/\b(delay|wait)\b/i.test(p)) {
      requiredNodes.add("delay");
    }
    if (p.includes("merge") || p.includes("merge outputs") || p.includes("parallel")) {
      requiredNodes.add("merge");
    }
    if (p.includes("transform") || p.includes("normalize") || p.includes("format")) {
      requiredNodes.add("transform");
    }

    // Ensure forbidden nodes take precedence
    for (const forbidden of forbiddenNodes) {
      requiredNodes.delete(forbidden);
    }

    return {
      trigger,
      requiredNodes: Array.from(requiredNodes),
      forbiddenNodes: Array.from(forbiddenNodes),
      actions: Array.from(requiredNodes).filter((n) => n !== trigger),
      integrations: [],
      parameters: {},
    };
  }

  static createPlan(prompt: string, context: PlannerUserContext = {}): WorkflowPlanData {
    const p = prompt.toLowerCase();
    const activeOAuth = new Set((context.availableOAuthConnections || []).map((c) => c.toLowerCase()));
    const activeCreds = new Set((context.availableCredentials || []).map((c) => c.toLowerCase()));

    const intent = this.extractIntent(prompt);
    const triggerType = intent.trigger;

    // Build Action Names & Credentials
    const actions: string[] = [];
    const integrations: string[] = [];
    const credentialsNeeded: string[] = [];

    if (intent.requiredNodes.includes("ai")) {
      actions.push("AI Agent (LLM)");
      integrations.push("OpenAI / Claude / Gemini");
      if (!activeCreds.has("openai") && !activeCreds.has("claude") && !activeCreds.has("gemini")) {
        credentialsNeeded.push("Required Credential: AI Provider API Key (BYOK Vault)");
      } else {
        credentialsNeeded.push("Using Active BYOK Vault Credential");
      }
    }

    if (intent.requiredNodes.includes("http-request")) {
      actions.push("HTTP Request Pro");
      if (p.includes("github")) {
        integrations.push("GitHub API");
        if (activeOAuth.has("github")) {
          credentialsNeeded.push("Bound to Active GitHub OAuth Connection");
        } else {
          credentialsNeeded.push("Required Connection: GitHub OAuth Connection");
        }
      } else {
        integrations.push("External REST API");
      }
    }

    if (intent.requiredNodes.includes("telegram")) {
      actions.push("Telegram Notification");
      integrations.push("Telegram Bot");
      if (!activeCreds.has("telegram")) {
        credentialsNeeded.push("Required Credential: Telegram Bot Token");
      } else {
        credentialsNeeded.push("Using Active Telegram Credentials");
      }
    }

    if (intent.requiredNodes.includes("slack")) {
      actions.push("Slack Notification");
      integrations.push("Slack Workspace");
      if (activeOAuth.has("slack")) {
        credentialsNeeded.push("Bound to Active Slack OAuth Connection");
      } else {
        credentialsNeeded.push("Required Connection: Slack OAuth Connection");
      }
    }

    if (intent.requiredNodes.includes("discord")) {
      actions.push("Discord Webhook");
      integrations.push("Discord Server");
      credentialsNeeded.push("Discord Webhook URL");
    }

    if (intent.requiredNodes.includes("google-sheets")) {
      actions.push("Google Sheets");
      integrations.push("Google Workspace");
      if (activeOAuth.has("google")) {
        credentialsNeeded.push("Bound to Active Google Workspace OAuth Connection");
      } else {
        credentialsNeeded.push("Required Connection: Google Workspace OAuth Connection");
      }
    }

    if (intent.requiredNodes.includes("email")) {
      actions.push("Email Notification");
      integrations.push("SMTP Email");
      credentialsNeeded.push("SMTP Server Credentials");
    }

    if (intent.requiredNodes.includes("switch") || intent.requiredNodes.includes("if")) {
      actions.push("Conditional Branching (Switch / IF)");
    }

    if (intent.requiredNodes.includes("loop")) {
      actions.push("Loop Execution");
    }

    if (intent.requiredNodes.includes("transform")) {
      actions.push("Data Transform");
    }

    if (intent.requiredNodes.includes("code")) {
      actions.push("Custom JavaScript Code");
    }

    if (intent.requiredNodes.includes("webhook-response")) {
      actions.push("HTTP Webhook Response");
    }

    if (actions.length === 0) {
      actions.push("HTTP Action");
      integrations.push("REST API");
    }

    // Recommended Pattern
    let recommendedPattern: WorkflowPlanData["recommendedPattern"] = "Custom";
    if (p.includes("monitor") || p.includes("uptime") || p.includes("ping")) {
      recommendedPattern = "Monitoring";
    } else if (p.includes("research") || p.includes("topic") || p.includes("extract")) {
      recommendedPattern = "Research";
    } else if (p.includes("qualify") || p.includes("route") || p.includes("lead") || p.includes("ticket")) {
      recommendedPattern = "Approval";
    } else if (p.includes("draft") || p.includes("social") || p.includes("post") || p.includes("content")) {
      recommendedPattern = "Content Generation";
    } else if (p.includes("summary") || p.includes("digest") || p.includes("alert") || p.includes("notify")) {
      recommendedPattern = "Notification";
    }

    // Variables
    const variablesUsed: string[] = ["input (Trigger Payload)"];
    if (intent.requiredNodes.includes("ai")) variablesUsed.push("steps.ai.output.text");
    if (intent.requiredNodes.includes("http-request")) variablesUsed.push("steps.http.output.body");
    if (intent.requiredNodes.includes("transform")) variablesUsed.push("steps.transform.output.result");
    if (intent.requiredNodes.includes("loop")) variablesUsed.push("loop.item");

    // Complexity
    const totalStepCount = intent.requiredNodes.length;
    let estimatedComplexity: WorkflowPlanData["estimatedComplexity"] = "low";
    if (totalStepCount >= 5 || intent.requiredNodes.includes("loop") || intent.requiredNodes.includes("switch") || intent.requiredNodes.includes("if")) {
      estimatedComplexity = "high";
    } else if (totalStepCount >= 3) {
      estimatedComplexity = "medium";
    }

    return {
      goal: prompt.trim(),
      triggerType,
      requiredNodes: intent.requiredNodes,
      forbiddenNodes: intent.forbiddenNodes,
      actions,
      integrations,
      credentialsNeeded: Array.from(new Set(credentialsNeeded)),
      variablesUsed,
      recommendedPattern,
      estimatedComplexity,
    };
  }
}
