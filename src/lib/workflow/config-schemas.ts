import { z } from "zod";

// 1. Key-Value pair schema (used for HTTP Headers & Query Params)
export const KeyValuePairSchema = z.object({
  key: z.string(),
  value: z.string(),
});
export type KeyValuePair = z.infer<typeof KeyValuePairSchema>;

// 2. Condition Operator & Condition Schema (used for IF & Filter nodes)
export const ConditionOperatorSchema = z.enum([
  "equals",
  "not_equals",
  "greater_than",
  "less_than",
  "greater_than_or_equal",
  "less_than_or_equal",
  "contains",
  "does_not_contain",
  "is_empty",
  "is_not_empty",
]);
export type ConditionOperator = z.infer<typeof ConditionOperatorSchema>;

export const ConditionSchema = z.object({
  field: z.string().default(""),
  operator: ConditionOperatorSchema.default("equals"),
  value: z.string().default(""),
});
export type Condition = z.infer<typeof ConditionSchema>;

// ------------------------------------------------------------------
// Node-Specific Config Schemas
// ------------------------------------------------------------------

// HTTP Request Config
export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const HttpRequestConfigSchema = z.object({
  method: HttpMethodSchema.default("GET"),
  url: z.string().default(""),
  queryParams: z.array(KeyValuePairSchema).default([]),
  headers: z.array(KeyValuePairSchema).default([]),
  bodyType: z.enum(["none", "json"]).default("none"),
  body: z.string().default(""),
});
export type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;

// OpenAI Config
export const OpenAiModelSchema = z.enum([
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "o1",
]);
export type OpenAiModel = z.infer<typeof OpenAiModelSchema>;

export const OpenAiConfigSchema = z.object({
  model: OpenAiModelSchema.default("gpt-4o-mini"),
  prompt: z.string().default(""),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(128000).default(1000),
});
export type OpenAiConfig = z.infer<typeof OpenAiConfigSchema>;

// Slack Config
export const SlackConfigSchema = z.object({
  channel: z.string().default("#general"),
  message: z.string().default(""),
});
export type SlackConfig = z.infer<typeof SlackConfigSchema>;

// Email Config
export const EmailConfigSchema = z.object({
  to: z.string().default(""),
  cc: z.string().default(""),
  bcc: z.string().default(""),
  subject: z.string().default(""),
  body: z.string().default(""),
});
export type EmailConfig = z.infer<typeof EmailConfigSchema>;

// Schedule Config
export const ScheduleFrequencySchema = z.enum([
  "cron",
  "hourly",
  "daily",
  "weekly",
  "monthly",
]);
export type ScheduleFrequency = z.infer<typeof ScheduleFrequencySchema>;

export const ScheduleConfigSchema = z.object({
  frequency: ScheduleFrequencySchema.default("daily"),
  cronExpression: z.string().default("0 8 * * *"),
  time: z.string().default("08:00"),
  timezone: z.string().default("UTC"),
});
export type ScheduleConfig = z.infer<typeof ScheduleConfigSchema>;

// Webhook Config
export const WebhookConfigSchema = z.object({
  method: z.enum(["GET", "POST", "PUT"]).default("POST"),
  path: z.string().default("/webhook/endpoint"),
  responseMode: z
    .enum(["on_received", "on_completed", "custom_response"])
    .default("on_received"),
});
export type WebhookConfig = z.infer<typeof WebhookConfigSchema>;

// Manual Trigger Config
export const ManualTriggerConfigSchema = z.object({}).passthrough();
export type ManualTriggerConfig = z.infer<typeof ManualTriggerConfigSchema>;

// IF Config
export const IfConfigSchema = z.object({
  condition: ConditionSchema.default({
    field: "lead.score",
    operator: "greater_than",
    value: "80",
  }),
});
export type IfConfig = z.infer<typeof IfConfigSchema>;

// Filter Config
export const FilterConfigSchema = z.object({
  condition: ConditionSchema.default({
    field: "status",
    operator: "equals",
    value: "active",
  }),
});
export type FilterConfig = z.infer<typeof FilterConfigSchema>;

// Delay Config
export const DelayUnitSchema = z.enum(["seconds", "minutes", "hours"]);
export type DelayUnit = z.infer<typeof DelayUnitSchema>;

export const DelayConfigSchema = z.object({
  duration: z.number().positive("Duration must be a positive number").default(5),
  unit: DelayUnitSchema.default("seconds"),
});
export type DelayConfig = z.infer<typeof DelayConfigSchema>;

// ------------------------------------------------------------------
// Map of Definition ID -> Default Config & Zod Schema
// ------------------------------------------------------------------

export const NODE_CONFIG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "manual-trigger": ManualTriggerConfigSchema,
  webhook: WebhookConfigSchema,
  schedule: ScheduleConfigSchema,
  "http-request": HttpRequestConfigSchema,
  openai: OpenAiConfigSchema,
  slack: SlackConfigSchema,
  email: EmailConfigSchema,
  if: IfConfigSchema,
  filter: FilterConfigSchema,
  delay: DelayConfigSchema,
};

export function getDefaultNodeConfig(definitionId: string): Record<string, unknown> {
  const schema = NODE_CONFIG_SCHEMAS[definitionId];
  if (!schema) return {};
  const parseResult = schema.safeParse({});
  if (parseResult.success) {
    return parseResult.data as Record<string, unknown>;
  }
  return {};
}

export function validateNodeConfig(
  definitionId: string,
  config: unknown,
): { success: boolean; data?: unknown; error?: z.ZodError } {
  const schema = NODE_CONFIG_SCHEMAS[definitionId];
  if (!schema) return { success: true, data: config ?? {} };
  const result = schema.safeParse(config ?? {});
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, error: result.error };
}
