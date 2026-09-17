/**
 * Neuraloop Phase 20 — AI Workflow Generation (Node Mapping)
 * Canonical mapping layer from natural language intents to 20 Neuraloop node definition IDs.
 */

export interface NodeMappingResult {
  definitionId: string;
  defaultLabel: string;
  category: "trigger" | "action" | "logic";
}

const INTENT_MAPPINGS: Array<{
  keywords: string[];
  definitionId: string;
  defaultLabel: string;
  category: "trigger" | "action" | "logic";
}> = [
  {
    keywords: ["webhook", "receive lead", "incoming webhook", "http trigger", "payload", "form submission"],
    definitionId: "webhook",
    defaultLabel: "Webhook Trigger",
    category: "trigger",
  },
  {
    keywords: ["manual", "start", "click", "trigger", "manual trigger"],
    definitionId: "manual-trigger",
    defaultLabel: "Manual Trigger",
    category: "trigger",
  },
  {
    keywords: ["schedule", "cron", "every day", "daily", "hourly", "morning", "timer", "interval"],
    definitionId: "schedule",
    defaultLabel: "Schedule Trigger",
    category: "trigger",
  },
  {
    keywords: ["http", "request", "fetch", "api", "rest", "post request", "get request", "call api"],
    definitionId: "http-request",
    defaultLabel: "HTTP Request",
    category: "action",
  },
  {
    keywords: ["ai", "openai", "claude", "gemini", "llm", "gpt", "generate text", "summarize", "prompt", "chatgpt"],
    definitionId: "ai",
    defaultLabel: "AI Agent",
    category: "action",
  },
  {
    keywords: ["slack", "post to slack", "send slack", "slack message", "slack channel", "notify slack"],
    definitionId: "slack",
    defaultLabel: "Slack Notification",
    category: "action",
  },
  {
    keywords: ["telegram", "send telegram", "telegram message", "telegram bot", "notify telegram"],
    definitionId: "telegram",
    defaultLabel: "Telegram Notification",
    category: "action",
  },
  {
    keywords: ["discord", "send discord", "discord embed", "discord webhook", "notify discord"],
    definitionId: "discord",
    defaultLabel: "Discord Webhook",
    category: "action",
  },
  {
    keywords: ["sheets", "google sheets", "append row", "read sheet", "spreadsheet"],
    definitionId: "google-sheets",
    defaultLabel: "Google Sheets",
    category: "action",
  },
  {
    keywords: ["email", "send email", "welcome email", "notify email", "smtp", "mail"],
    definitionId: "email",
    defaultLabel: "Email Notification",
    category: "action",
  },
  {
    keywords: ["code", "javascript", "script", "custom code"],
    definitionId: "code",
    defaultLabel: "Custom Code",
    category: "action",
  },
  {
    keywords: ["webhook response", "return response", "http response"],
    definitionId: "webhook-response",
    defaultLabel: "Webhook Response",
    category: "action",
  },
  {
    keywords: ["if", "condition", "check", "decision", "branch", "evaluate", "above", "below", "score"],
    definitionId: "if",
    defaultLabel: "IF Condition",
    category: "logic",
  },
  {
    keywords: ["switch", "route category", "multi branch", "ticket router"],
    definitionId: "switch",
    defaultLabel: "Switch Router",
    category: "logic",
  },
  {
    keywords: ["loop", "iterate", "for each", "array items"],
    definitionId: "loop",
    defaultLabel: "Loop Execution",
    category: "logic",
  },
  {
    keywords: ["merge", "combine streams", "consolidate"],
    definitionId: "merge",
    defaultLabel: "Merge Paths",
    category: "logic",
  },
  {
    keywords: ["transform", "normalize", "format json", "set defaults", "flatten"],
    definitionId: "transform",
    defaultLabel: "Transform Data",
    category: "logic",
  },
  {
    keywords: ["set variable", "assign variable", "tag status"],
    definitionId: "set-variable",
    defaultLabel: "Set Variable",
    category: "logic",
  },
  {
    keywords: ["filter", "filter data", "exclude", "only include"],
    definitionId: "filter",
    defaultLabel: "Filter Data",
    category: "logic",
  },
  {
    keywords: ["delay", "wait", "sleep", "pause", "1 hour", "delay execution"],
    definitionId: "delay",
    defaultLabel: "Delay Execution",
    category: "logic",
  },
];

export function mapIntentToNodeDefinition(intent: string): NodeMappingResult {
  const normalized = intent.toLowerCase().trim();

  for (const mapping of INTENT_MAPPINGS) {
    if (mapping.definitionId === normalized || (normalized === "openai" && mapping.definitionId === "ai")) {
      return {
        definitionId: mapping.definitionId,
        defaultLabel: mapping.defaultLabel,
        category: mapping.category,
      };
    }
    for (const keyword of mapping.keywords) {
      if (normalized.includes(keyword)) {
        return {
          definitionId: mapping.definitionId,
          defaultLabel: mapping.defaultLabel,
          category: mapping.category,
        };
      }
    }
  }

  // Fallback default node definition
  return {
    definitionId: "http-request",
    defaultLabel: "HTTP Action",
    category: "action",
  };
}
