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

// HTTP Request Config Pro
export const HttpMethodSchema = z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]);
export type HttpMethod = z.infer<typeof HttpMethodSchema>;

export const HttpAuthTypeSchema = z.enum(["vault", "oauth_connection", "none", "bearer", "basic", "api_key", "custom_header"]);
export type HttpAuthType = z.infer<typeof HttpAuthTypeSchema>;

export const HttpResponseTypeSchema = z.enum(["auto", "json", "text"]);
export type HttpResponseType = z.infer<typeof HttpResponseTypeSchema>;

export const HttpRequestConfigSchema = z.object({
  method: HttpMethodSchema.default("GET"),
  url: z.string().default(""),
  authType: HttpAuthTypeSchema.default("vault"),
  credentialId: z.string().default(""),
  connectionId: z.string().default(""),
  connectionProvider: z.string().default("google"),
  bearerToken: z.string().default(""),
  basicUsername: z.string().default(""),
  basicPassword: z.string().default(""),
  apiKeyName: z.string().default("Authorization"),
  apiKeyValue: z.string().default(""),
  apiKeyIn: z.enum(["header", "query"]).default("header"),
  customHeaderName: z.string().default(""),
  customHeaderValue: z.string().default(""),
  queryParams: z.array(KeyValuePairSchema).default([]),
  headers: z.array(KeyValuePairSchema).default([]),
  bodyType: z.enum(["none", "json", "form_data", "raw"]).default("none"),
  body: z.string().default(""),
  formData: z.array(KeyValuePairSchema).default([]),
  rawBody: z.string().default(""),
  responseType: HttpResponseTypeSchema.default("auto"),
  responseKey: z.string().default(""),
  timeout: z.number().int().min(1000).max(60000).default(10000),
  retryCount: z.number().int().min(0).max(5).default(0),
  retryDelay: z.number().int().min(100).max(10000).default(1000),
});
export type HttpRequestConfig = z.infer<typeof HttpRequestConfigSchema>;

// Unified AI Config
export const AIProviderSchema = z.enum(["openai", "claude", "gemini"]);
export type AIProvider = z.infer<typeof AIProviderSchema>;

export const AIConfigSchema = z.object({
  provider: AIProviderSchema.default("openai"),
  credentialId: z.string().default(""),
  model: z.string().default("gpt-4o-mini"),
  prompt: z.string().default(""),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().int().min(1).max(128000).default(1000),
  systemPrompt: z.string().optional().default(""),
});
export type AIConfig = z.infer<typeof AIConfigSchema>;

// OpenAI Config (Legacy alias)
export const OpenAiModelSchema = z.enum([
  "gpt-4o",
  "gpt-4o-mini",
  "claude-3-5-sonnet",
  "o1",
]);
export type OpenAiModel = z.infer<typeof OpenAiModelSchema>;

export const OpenAiConfigSchema = AIConfigSchema;
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
  "custom",
  "every_minute",
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

// Set Variable Config
export const SetVariableConfigSchema = z.object({
  variables: z
    .array(KeyValuePairSchema)
    .default([{ key: "varName", value: "sampleValue" }]),
});
export type SetVariableConfig = z.infer<typeof SetVariableConfigSchema>;

// Code Config
export const CodeConfigSchema = z.object({
  code: z
    .string()
    .default(
      "// Write JS code snippet\n// Injected variables: input, steps, variables\nreturn { result: input.val || 'processed' };",
    ),
  mode: z.enum(["javascript"]).default("javascript"),
});
export type CodeConfig = z.infer<typeof CodeConfigSchema>;

// Webhook Response Config
export const WebhookResponseConfigSchema = z.object({
  statusCode: z.number().int().min(100).max(599).default(200),
  headers: z
    .array(KeyValuePairSchema)
    .default([{ key: "Content-Type", value: "application/json" }]),
  bodyType: z.enum(["json", "text"]).default("json"),
  body: z
    .string()
    .default('{\n  "success": true,\n  "message": "Processed successfully"\n}'),
});
export type WebhookResponseConfig = z.infer<typeof WebhookResponseConfigSchema>;

// Loop Config
export const LoopConfigSchema = z.object({
  arrayPath: z.string().default("items"),
  arrayInput: z.string().optional(),
});
export type LoopConfig = z.infer<typeof LoopConfigSchema>;

// Switch Config
export const SwitchCaseRuleSchema = z.object({
  id: z.string().default("case_1"),
  label: z.string().default("case_1"),
  fieldPath: z.string().default("priority"),
  operator: z.enum(["equals", "not_equals", "contains", "greater_than", "less_than", "is_true", "is_false"]).default("equals"),
  value: z.string().default("high"),
});

export const SwitchConfigSchema = z.object({
  cases: z.array(SwitchCaseRuleSchema).default([
    { id: "case_1", label: "case_1", fieldPath: "priority", operator: "equals", value: "high" },
    { id: "case_2", label: "case_2", fieldPath: "priority", operator: "equals", value: "medium" },
  ]),
});
export type SwitchConfig = z.infer<typeof SwitchConfigSchema>;

// Merge Config
export const MergeConfigSchema = z.object({
  mode: z.enum(["append", "combine", "overwrite"]).default("combine"),
});
export type MergeConfig = z.infer<typeof MergeConfigSchema>;

// Telegram Config
export const TelegramConfigSchema = z.object({
  credentialId: z.string().optional(),
  chatId: z.string().default(""),
  operation: z.enum(["send_message", "send_photo"]).default("send_message"),
  text: z.string().default(""),
  photoUrl: z.string().optional(),
});
export type TelegramConfig = z.infer<typeof TelegramConfigSchema>;

// Discord Config
export const DiscordConfigSchema = z.object({
  credentialId: z.string().optional(),
  webhookUrl: z.string().default(""),
  operation: z.enum(["send_message", "send_embed"]).default("send_message"),
  content: z.string().default(""),
  embedTitle: z.string().optional(),
  embedDescription: z.string().optional(),
});
export type DiscordConfig = z.infer<typeof DiscordConfigSchema>;

// Google Sheets Config
export const GoogleSheetsConfigSchema = z.object({
  credentialId: z.string().optional(),
  spreadsheetId: z.string().default(""),
  sheetName: z.string().default("Sheet1"),
  range: z.string().default("A1:Z100"),
  operation: z.enum(["read_rows", "append_row"]).default("read_rows"),
  rowValues: z.string().optional(),
});
export type GoogleSheetsConfig = z.infer<typeof GoogleSheetsConfigSchema>;

// Transform Config
export const TransformOperationSchema = z.enum([
  "add_field",
  "remove_field",
  "rename_field",
  "keep_fields",
  "set_default_values",
  "merge_objects",
  "flatten_json",
  "extract_nested",
  "date_format",
  "string_format",
  "math_operation",
  "json_parse_stringify",
]);
export type TransformOperation = z.infer<typeof TransformOperationSchema>;

export const TransformConfigSchema = z.object({
  operation: TransformOperationSchema.default("add_field"),
  key: z.string().default("fieldName"),
  value: z.string().default("sampleValue"),
  targetPath: z.string().default(""),
  newKey: z.string().default(""),
  keepKeys: z.array(z.string()).default([]),
  defaultValues: z.array(KeyValuePairSchema).default([]),
  mergeSources: z.array(z.string()).default([]),
  extractPaths: z.array(z.string()).default([]),
  dateFormat: z.enum(["iso", "timestamp", "locale_date"]).default("iso"),
  stringOp: z.enum(["uppercase", "lowercase", "trim", "concat", "slice", "replace"]).default("uppercase"),
  param1: z.string().default(""),
  param2: z.string().default(""),
  mathOp: z.enum(["add", "subtract", "multiply", "divide", "round", "floor", "ceil"]).default("add"),
  operand: z.number().default(0),
  jsonMode: z.enum(["parse", "stringify"]).default("parse"),
});
export type TransformConfig = z.infer<typeof TransformConfigSchema>;

// ------------------------------------------------------------------
// Map of Definition ID -> Default Config & Zod Schema
// ------------------------------------------------------------------

export const NODE_CONFIG_SCHEMAS: Record<string, z.ZodTypeAny> = {
  "manual-trigger": ManualTriggerConfigSchema,
  webhook: WebhookConfigSchema,
  schedule: ScheduleConfigSchema,
  "http-request": HttpRequestConfigSchema,
  ai: AIConfigSchema,
  openai: AIConfigSchema,
  slack: SlackConfigSchema,
  email: EmailConfigSchema,
  code: CodeConfigSchema,
  "webhook-response": WebhookResponseConfigSchema,
  if: IfConfigSchema,
  filter: FilterConfigSchema,
  "set-variable": SetVariableConfigSchema,
  delay: DelayConfigSchema,
  loop: LoopConfigSchema,
  switch: SwitchConfigSchema,
  merge: MergeConfigSchema,
  telegram: TelegramConfigSchema,
  discord: DiscordConfigSchema,
  "google-sheets": GoogleSheetsConfigSchema,
  transform: TransformConfigSchema,
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
