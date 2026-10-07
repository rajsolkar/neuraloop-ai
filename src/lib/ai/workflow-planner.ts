/**
 * Neuraloop Phase 20 — AI Workflow Planner Engine
 * Performs credential-aware multi-stage planning BEFORE graph construction,
 * extracting structured intent, explicit requirements, explicit exclusions, and checking user credentials.
 */

import { normalizeWorkflowName, type ALL_NODE_DEFINITION_IDS, type StructuredIntentData, type WorkflowPlanData } from "./schema";

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

  static reconcilePlanWithGraph(
    plan: WorkflowPlanData,
    workflow: import("./schema").GeneratedWorkflowData,
    context: PlannerUserContext = {},
  ): WorkflowPlanData {
    const activeOAuth = new Set((context.availableOAuthConnections || []).map((c) => c.toLowerCase()));
    const activeCreds = new Set((context.availableCredentials || []).map((c) => c.toLowerCase()));

    const actualDefIds = new Set(workflow.nodes.map((n) => n.definitionId));

    const actions: string[] = [];
    const integrations: string[] = [];
    const credentialsNeeded: string[] = [];
    const requiredNodes: string[] = Array.from(actualDefIds);

    if (actualDefIds.has("ai")) {
      actions.push("AI Agent (LLM)");
      integrations.push("OpenAI / Claude / Gemini");
      if (!activeCreds.has("openai") && !activeCreds.has("claude") && !activeCreds.has("gemini")) {
        credentialsNeeded.push("Required Credential: AI Provider API Key (BYOK Vault)");
      } else {
        credentialsNeeded.push("Using Active BYOK Vault Credential");
      }
    }

    if (actualDefIds.has("http-request")) {
      actions.push("HTTP Request Pro");
      const httpNode = workflow.nodes.find((n) => n.definitionId === "http-request");
      const configStr = JSON.stringify(httpNode?.config || {}).toLowerCase();
      if (configStr.includes("github")) {
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

    if (actualDefIds.has("telegram")) {
      actions.push("Telegram Notification");
      integrations.push("Telegram Bot");
      if (!activeCreds.has("telegram")) {
        credentialsNeeded.push("Required Credential: Telegram Bot Token");
      } else {
        credentialsNeeded.push("Using Active Telegram Credentials");
      }
    }

    if (actualDefIds.has("slack")) {
      actions.push("Slack Notification");
      integrations.push("Slack Workspace");
      if (activeOAuth.has("slack")) {
        credentialsNeeded.push("Bound to Active Slack OAuth Connection");
      } else {
        credentialsNeeded.push("Required Connection: Slack OAuth Connection");
      }
    }

    if (actualDefIds.has("discord")) {
      actions.push("Discord Webhook");
      integrations.push("Discord Server");
      credentialsNeeded.push("Discord Webhook URL");
    }

    if (actualDefIds.has("google-sheets")) {
      actions.push("Google Sheets");
      integrations.push("Google Workspace");
      if (activeOAuth.has("google")) {
        credentialsNeeded.push("Bound to Active Google Workspace OAuth Connection");
      } else {
        credentialsNeeded.push("Required Connection: Google Workspace OAuth Connection");
      }
    }

    if (actualDefIds.has("email")) {
      actions.push("Email Notification");
      integrations.push("SMTP Email");
      credentialsNeeded.push("SMTP Server Credentials");
    }

    if (actualDefIds.has("switch") || actualDefIds.has("if")) {
      actions.push("Conditional Branching (Switch / IF)");
    }

    if (actualDefIds.has("loop")) {
      actions.push("Loop Execution");
    }

    if (actualDefIds.has("transform")) {
      actions.push("Data Transform");
    }

    if (actualDefIds.has("code")) {
      actions.push("Custom JavaScript Code");
    }

    if (actualDefIds.has("webhook-response")) {
      actions.push("HTTP Webhook Response");
    }

    if (actions.length === 0) {
      actions.push("HTTP Action");
      integrations.push("REST API");
    }

    let triggerType = plan.triggerType;
    if (actualDefIds.has("schedule")) triggerType = "schedule";
    else if (actualDefIds.has("webhook")) triggerType = "webhook";
    else if (actualDefIds.has("manual-trigger")) triggerType = "manual-trigger";

    const forbiddenNodes = (plan.forbiddenNodes || []).filter(
      (f) => !actualDefIds.has(f as unknown as typeof workflow.nodes[0]["definitionId"]),
    );

    const variablesUsed: string[] = ["input (Trigger Payload)"];
    if (actualDefIds.has("ai")) variablesUsed.push("steps.ai.output.text");
    if (actualDefIds.has("http-request")) variablesUsed.push("steps.http.output.body");
    if (actualDefIds.has("transform")) variablesUsed.push("steps.transform.output.result");
    if (actualDefIds.has("loop")) variablesUsed.push("loop.item");

    const totalStepCount = workflow.nodes.length;
    let estimatedComplexity: WorkflowPlanData["estimatedComplexity"] = "low";
    if (totalStepCount >= 5 || actualDefIds.has("loop") || actualDefIds.has("switch") || actualDefIds.has("if")) {
      estimatedComplexity = "high";
    } else if (totalStepCount >= 3) {
      estimatedComplexity = "medium";
    }

    return {
      goal: plan.goal,
      triggerType,
      requiredNodes,
      forbiddenNodes,
      actions,
      integrations: Array.from(new Set(integrations)),
      credentialsNeeded: Array.from(new Set(credentialsNeeded)),
      variablesUsed: Array.from(new Set(variablesUsed)),
      recommendedPattern: plan.recommendedPattern || "Custom",
      estimatedComplexity,
    };
  }
}

export function generateConciseWorkflowName(
  prompt: string,
  plan?: WorkflowPlanData,
  rawName?: string,
): string {
  if (rawName) {
    const trimmedRaw = rawName.trim();
    if (
      trimmedRaw.length > 0 &&
      trimmedRaw.length <= 100 &&
      trimmedRaw !== prompt.trim() &&
      !trimmedRaw.toLowerCase().startsWith("automated workflow:") &&
      !trimmedRaw.toLowerCase().startsWith("generated workflow for:") &&
      !trimmedRaw.toLowerCase().startsWith("custom ai automated workflow")
    ) {
      return normalizeWorkflowName(trimmedRaw);
    }
  }

  const p = prompt.toLowerCase();
  const req = new Set(plan?.requiredNodes || []);

  // 1. Determine Trigger Phrase
  let triggerPrefix = "";
  if (p.includes("every morning") || p.includes("daily")) {
    triggerPrefix = "Daily";
  } else if (p.includes("every hour") || p.includes("hourly")) {
    triggerPrefix = "Hourly";
  } else if (p.includes("every monday") || p.includes("weekly")) {
    triggerPrefix = "Weekly";
  } else if (plan?.triggerType === "schedule" || req.has("schedule")) {
    triggerPrefix = "Scheduled";
  } else if (p.includes("lead")) {
    triggerPrefix = "Lead";
  } else if (p.includes("ticket") || p.includes("support")) {
    triggerPrefix = "Support Ticket";
  } else if (p.includes("form") || plan?.triggerType === "webhook" || req.has("webhook")) {
    triggerPrefix = "Webhook";
  } else {
    triggerPrefix = "Automated";
  }

  // 2. Determine Action / Subject Phrase
  let actionPhrase = "";
  if (p.includes("ai news") || (req.has("ai") && p.includes("news"))) {
    actionPhrase = "AI News";
  } else if (p.includes("qualify") || p.includes("qualification")) {
    actionPhrase = "AI Lead Qualification";
  } else if (p.includes("weather")) {
    actionPhrase = "Weather Fetch";
  } else if (p.includes("pr") || p.includes("pull request") || p.includes("github")) {
    actionPhrase = "GitHub Review";
  } else if (req.has("ai") && (p.includes("summarize") || p.includes("summary"))) {
    actionPhrase = "AI Summary";
  } else if (req.has("ai")) {
    actionPhrase = "AI Processing";
  } else if (req.has("http-request")) {
    actionPhrase = "Data Fetch";
  } else if (req.has("google-sheets")) {
    actionPhrase = "Google Sheets Sync";
  } else if (req.has("code")) {
    actionPhrase = "Code Processing";
  } else {
    actionPhrase = "Workflow Task";
  }

  // 3. Determine Target / Destination Phrase
  let targetPhrase = "";
  if (req.has("telegram") || p.includes("telegram")) {
    targetPhrase = "to Telegram";
  } else if (req.has("slack") || p.includes("slack")) {
    targetPhrase = "to Slack";
  } else if (req.has("discord") || p.includes("discord")) {
    targetPhrase = "to Discord";
  } else if (req.has("email") || p.includes("email")) {
    targetPhrase = "to Email";
  } else if (req.has("google-sheets") && !actionPhrase.includes("Google Sheets")) {
    targetPhrase = "to Google Sheets";
  } else if (req.has("webhook-response")) {
    targetPhrase = "Response";
  }

  if (triggerPrefix === "Lead" && actionPhrase.startsWith("AI Lead")) {
    triggerPrefix = "";
  }

  const fullName = `${triggerPrefix} ${actionPhrase} ${targetPhrase}`.replace(/\s+/g, " ").trim();
  return normalizeWorkflowName(fullName);
}
