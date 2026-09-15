/**
 * Neuraloop Phase 6 — AI Workflow Generation (Node Mapping)
 * Deterministic mapping layer from natural language intents to Neuraloop node definition IDs.
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
    keywords: ["webhook", "receive lead", "incoming webhook", "http trigger", "payload"],
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
    keywords: ["openai", "ai", "llm", "gpt", "generate text", "summarize", "prompt", "chatgpt"],
    definitionId: "openai",
    defaultLabel: "OpenAI LLM",
    category: "action",
  },
  {
    keywords: ["slack", "post to slack", "send slack", "slack message", "slack channel", "notify slack"],
    definitionId: "slack",
    defaultLabel: "Slack Notification",
    category: "action",
  },
  {
    keywords: ["email", "send email", "welcome email", "notify email", "smtp", "mail"],
    definitionId: "email",
    defaultLabel: "Email Notification",
    category: "action",
  },
  {
    keywords: ["if", "condition", "check", "decision", "branch", "evaluate", "above", "below", "score"],
    definitionId: "if",
    defaultLabel: "IF Condition",
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
    if (mapping.definitionId === normalized) {
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
