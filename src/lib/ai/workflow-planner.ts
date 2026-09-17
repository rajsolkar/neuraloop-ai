/**
 * Neuraloop Phase 20 — AI Workflow Planner Engine
 * Performs credential-aware multi-stage planning BEFORE graph construction,
 * checking user's available Vault credentials and active OAuth connections.
 */

import type { WorkflowPlanData } from "./schema";

export interface PlannerUserContext {
  availableCredentials?: string[];
  availableOAuthConnections?: string[];
}

export class WorkflowPlanner {
  static createPlan(prompt: string, context: PlannerUserContext = {}): WorkflowPlanData {
    const p = prompt.toLowerCase();
    const activeOAuth = new Set((context.availableOAuthConnections || []).map((c) => c.toLowerCase()));
    const activeCreds = new Set((context.availableCredentials || []).map((c) => c.toLowerCase()));

    // 1. Identify Trigger Type
    let triggerType = "manual-trigger";
    if (p.includes("webhook") || p.includes("form") || p.includes("incoming") || p.includes("lead")) {
      triggerType = "webhook";
    } else if (p.includes("schedule") || p.includes("cron") || p.includes("every") || p.includes("daily") || p.includes("morning") || p.includes("weekly")) {
      triggerType = "schedule";
    }

    // 2. Identify Action Nodes, Integrations & Required Credentials
    const actions: string[] = [];
    const integrations: string[] = [];
    const credentialsNeeded: string[] = [];

    if (p.includes("ai") || p.includes("openai") || p.includes("claude") || p.includes("gemini") || p.includes("summarize") || p.includes("qualify") || p.includes("gpt")) {
      actions.push("AI Agent (LLM)");
      integrations.push("OpenAI / Claude / Gemini");
      if (!activeCreds.has("openai") && !activeCreds.has("claude") && !activeCreds.has("gemini")) {
        credentialsNeeded.push("Required Credential: AI Provider API Key (BYOK Vault)");
      } else {
        credentialsNeeded.push("Using Active BYOK Vault Credential");
      }
    }

    if (p.includes("http") || p.includes("api") || p.includes("github") || p.includes("fetch")) {
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

    if (p.includes("telegram")) {
      actions.push("Telegram Notification");
      integrations.push("Telegram Bot");
      if (!activeCreds.has("telegram")) {
        credentialsNeeded.push("Required Credential: Telegram Bot Token");
      } else {
        credentialsNeeded.push("Using Active Telegram Credentials");
      }
    }

    if (p.includes("slack")) {
      actions.push("Slack Notification");
      integrations.push("Slack Workspace");
      if (activeOAuth.has("slack")) {
        credentialsNeeded.push("Bound to Active Slack OAuth Connection");
      } else {
        credentialsNeeded.push("Required Connection: Slack OAuth Connection");
      }
    }

    if (p.includes("discord")) {
      actions.push("Discord Webhook");
      integrations.push("Discord Server");
      credentialsNeeded.push("Discord Webhook URL");
    }

    if (p.includes("sheets") || p.includes("google sheet") || p.includes("excel")) {
      actions.push("Google Sheets");
      integrations.push("Google Workspace");
      if (activeOAuth.has("google")) {
        credentialsNeeded.push("Bound to Active Google Workspace OAuth Connection");
      } else {
        credentialsNeeded.push("Required Connection: Google Workspace OAuth Connection");
      }
    }

    if (p.includes("email") || p.includes("mail")) {
      actions.push("Email Notification");
      integrations.push("SMTP Email");
      credentialsNeeded.push("SMTP Server Credentials");
    }

    if (p.includes("switch") || p.includes("route") || p.includes("branch") || p.includes("if") || p.includes("check")) {
      actions.push("Conditional Branch (Switch / IF)");
    }

    if (p.includes("loop") || p.includes("each") || p.includes("iterate")) {
      actions.push("Loop Execution");
    }

    if (p.includes("transform") || p.includes("format") || p.includes("normalize")) {
      actions.push("Data Transform");
    }

    if (actions.length === 0) {
      actions.push("HTTP Action");
      integrations.push("REST API");
    }

    // 3. Recommended Pattern
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

    // 4. Variables & Handlebars Syntax
    const variablesUsed: string[] = ["input (Trigger Payload)"];
    if (actions.includes("AI Agent (LLM)")) variablesUsed.push("steps.ai.output.text");
    if (actions.includes("HTTP Request Pro")) variablesUsed.push("steps.http.output.body");
    if (actions.includes("Data Transform")) variablesUsed.push("steps.transform.output.result");
    if (actions.includes("Loop Execution")) variablesUsed.push("loop.item");

    // 5. Complexity
    const totalStepCount = actions.length + 1;
    let estimatedComplexity: WorkflowPlanData["estimatedComplexity"] = "low";
    if (totalStepCount >= 5 || actions.includes("Loop Execution") || actions.includes("Conditional Branch (Switch / IF)")) {
      estimatedComplexity = "high";
    } else if (totalStepCount >= 3) {
      estimatedComplexity = "medium";
    }

    return {
      goal: prompt.trim(),
      triggerType,
      actions,
      integrations,
      credentialsNeeded: Array.from(new Set(credentialsNeeded)),
      variablesUsed,
      recommendedPattern,
      estimatedComplexity,
    };
  }
}
