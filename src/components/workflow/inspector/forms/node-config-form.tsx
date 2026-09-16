"use client";

import React from "react";
import { FormField, FormSelect, KeyValueEditor, ConditionBuilder, CredentialSelect } from "./form-components";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  HttpRequestConfig,
  OpenAiConfig,
  SlackConfig,
  EmailConfig,
  ScheduleConfig,
  WebhookConfig,
  IfConfig,
  FilterConfig,
  DelayConfig,
  SetVariableConfig,
  CodeConfig,
  WebhookResponseConfig,
} from "@/lib/workflow/config-schemas";

interface NodeConfigFormProps {
  definitionId: string;
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}

export function NodeConfigForm({ definitionId, config, onChange }: NodeConfigFormProps) {
  switch (definitionId) {
    case "http-request":
      return <HttpRequestForm config={config as HttpRequestConfig} onChange={onChange} />;
    case "openai":
      return <OpenAiForm config={config as OpenAiConfig} onChange={onChange} />;
    case "slack":
      return <SlackForm config={config as SlackConfig} onChange={onChange} />;
    case "email":
      return <EmailForm config={config as EmailConfig} onChange={onChange} />;
    case "schedule":
      return <ScheduleForm config={config as ScheduleConfig} onChange={onChange} />;
    case "webhook":
      return <WebhookForm config={config as WebhookConfig} onChange={onChange} />;
    case "code":
      return <CodeForm config={config as CodeConfig} onChange={onChange} />;
    case "webhook-response":
      return <WebhookResponseForm config={config as WebhookResponseConfig} onChange={onChange} />;
    case "if":
      return <IfForm config={config as IfConfig} onChange={onChange} />;
    case "filter":
      return <FilterForm config={config as FilterConfig} onChange={onChange} />;
    case "set-variable":
      return <SetVariableForm config={config as SetVariableConfig} onChange={onChange} />;
    case "delay":
      return <DelayForm config={config as DelayConfig} onChange={onChange} />;
    case "manual-trigger":
      return (
        <div className="rounded-md border border-border bg-canvas px-3 py-2.5 text-xs text-ink-soft">
          This trigger starts the workflow manually when tested or run. No configuration required.
        </div>
      );
    default:
      return (
        <div className="text-xs text-ink-faint">
          No configuration parameters for {definitionId}.
        </div>
      );
  }
}

// ------------------------------------------------------------------
// 1. HTTP Request Form
// ------------------------------------------------------------------
function HttpRequestForm({
  config,
  onChange,
}: {
  config: HttpRequestConfig & { credentialId?: string };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const method = config.method ?? "GET";
  const url = config.url ?? "";
  const queryParams = config.queryParams ?? [];
  const headers = config.headers ?? [];
  const bodyType = config.bodyType ?? "none";
  const body = config.body ?? "";

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="custom"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="Authentication Credential (Optional)"
      />

      <FormField label="Method">
        <FormSelect
          value={method}
          onChange={(val) => onChange({ ...config, method: val })}
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
            { value: "PATCH", label: "PATCH" },
            { value: "DELETE", label: "DELETE" },
          ]}
        />
      </FormField>

      <FormField label="URL" description="Full HTTP/HTTPS endpoint URL">
        <Input
          placeholder="https://api.example.com/v1/resource"
          value={url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <KeyValueEditor
        title="Query Parameters"
        items={queryParams}
        onChange={(items) => onChange({ ...config, queryParams: items })}
      />

      <KeyValueEditor
        title="Headers"
        items={headers}
        onChange={(items) => onChange({ ...config, headers: items })}
      />

      <FormField label="Body Type">
        <FormSelect
          value={bodyType}
          onChange={(val) => onChange({ ...config, bodyType: val })}
          options={[
            { value: "none", label: "None" },
            { value: "json", label: "JSON" },
          ]}
        />
      </FormField>

      {bodyType === "json" && (
        <FormField label="JSON Body">
          <Textarea
            placeholder='{ "key": "value" }'
            value={body}
            onChange={(e) => onChange({ ...config, body: e.target.value })}
            className="font-mono text-xs h-24"
          />
        </FormField>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// 2. OpenAI Form
// ------------------------------------------------------------------
function OpenAiForm({
  config,
  onChange,
}: {
  config: OpenAiConfig & { credentialId?: string };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const model = config.model ?? "gpt-4o-mini";
  const prompt = config.prompt ?? "";
  const temperature = config.temperature ?? 0.7;
  const maxTokens = config.maxTokens ?? 1000;

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="openai"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="AI API Credential"
      />

      <FormField label="Model">
        <FormSelect
          value={model}
          onChange={(val) => onChange({ ...config, model: val })}
          options={[
            { value: "gpt-4o-mini", label: "gpt-4o-mini (Fast & Efficient)" },
            { value: "gpt-4o", label: "gpt-4o (High Intelligence)" },
            { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
            { value: "o1", label: "o1 Reasoning" },
          ]}
        />
      </FormField>

      <FormField label="Prompt">
        <Textarea
          placeholder="System or user prompt instructions..."
          value={prompt}
          onChange={(e) => onChange({ ...config, prompt: e.target.value })}
          className="text-xs h-24"
        />
      </FormField>

      <FormField label={`Temperature (${temperature})`}>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={temperature}
          onChange={(e) => onChange({ ...config, temperature: parseFloat(e.target.value) })}
          className="w-full accent-accent"
        />
      </FormField>

      <FormField label="Max Tokens">
        <Input
          type="number"
          min="1"
          max="128000"
          value={maxTokens}
          onChange={(e) => onChange({ ...config, maxTokens: parseInt(e.target.value, 10) || 1000 })}
          className="text-xs"
        />
      </FormField>
    </div>
  );
}

// ------------------------------------------------------------------
// 3. Slack Form
// ------------------------------------------------------------------
function SlackForm({
  config,
  onChange,
}: {
  config: SlackConfig & { credentialId?: string };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const channel = config.channel ?? "#general";
  const message = config.message ?? "";

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="slack"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="Slack Bot Credential"
      />

      <FormField label="Channel">
        <Input
          placeholder="#general or channel-id"
          value={channel}
          onChange={(e) => onChange({ ...config, channel: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <FormField label="Message text">
        <Textarea
          placeholder="Type message text or use variables..."
          value={message}
          onChange={(e) => onChange({ ...config, message: e.target.value })}
          className="text-xs h-20"
        />
      </FormField>
    </div>
  );
}

// ------------------------------------------------------------------
// 4. Email Form
// ------------------------------------------------------------------
function EmailForm({
  config,
  onChange,
}: {
  config: EmailConfig & { credentialId?: string };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const to = config.to ?? "";
  const cc = config.cc ?? "";
  const bcc = config.bcc ?? "";
  const subject = config.subject ?? "";
  const body = config.body ?? "";

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="smtp"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="SMTP Email Credential"
      />

      <FormField label="To (Recipient Email)">
        <Input
          placeholder="user@example.com"
          value={to}
          onChange={(e) => onChange({ ...config, to: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <FormField label="CC (Optional)">
        <Input
          placeholder="cc@example.com"
          value={cc}
          onChange={(e) => onChange({ ...config, cc: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <FormField label="BCC (Optional)">
        <Input
          placeholder="bcc@example.com"
          value={bcc}
          onChange={(e) => onChange({ ...config, bcc: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <FormField label="Subject">
        <Input
          placeholder="Email subject title"
          value={subject}
          onChange={(e) => onChange({ ...config, subject: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <FormField label="Email Body">
        <Textarea
          placeholder="Email body text or HTML..."
          value={body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          className="text-xs h-24"
        />
      </FormField>
    </div>
  );
}

// ------------------------------------------------------------------
// 5. Schedule Form
// ------------------------------------------------------------------
import {
  presetToCron,
  formatCronHumanReadable,
  getNextNRunDates,
} from "@/lib/scheduler/cron-parser-utils";

function ScheduleForm({
  config,
  onChange,
}: {
  config: ScheduleConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const frequency = config.frequency ?? "daily";
  const customCron = config.cronExpression ?? "0 8 * * *";
  const time = config.time ?? "08:00";
  const timezone = config.timezone ?? "UTC";

  const effectiveCron = presetToCron(frequency, customCron, time);
  const humanReadable = formatCronHumanReadable(effectiveCron);
  const upcomingRuns = getNextNRunDates(effectiveCron, 3, timezone);

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="Frequency Preset">
        <FormSelect
          value={frequency}
          onChange={(val) => onChange({ ...config, frequency: val })}
          options={[
            { value: "every_minute", label: "Every Minute (* * * * *)" },
            { value: "hourly", label: "Every Hour (0 * * * *)" },
            { value: "daily", label: "Every Day" },
            { value: "weekly", label: "Every Week (Sundays)" },
            { value: "monthly", label: "Every Month (1st of month)" },
            { value: "cron", label: "Custom Cron Expression" },
          ]}
        />
      </FormField>

      {frequency === "cron" || frequency === "custom" ? (
        <FormField label="Cron Expression" description="Standard 5-part cron syntax (minute hour day month day-of-week)">
          <Input
            placeholder="0 8 * * *"
            value={customCron}
            onChange={(e) => onChange({ ...config, cronExpression: e.target.value })}
            className="font-mono text-xs"
          />
        </FormField>
      ) : (
        frequency !== "every_minute" && frequency !== "hourly" && (
          <FormField label="Trigger Time">
            <Input
              type="time"
              value={time}
              onChange={(e) => onChange({ ...config, time: e.target.value })}
              className="text-xs"
            />
          </FormField>
        )
      )}

      <FormField label="Timezone">
        <FormSelect
          value={timezone}
          onChange={(val) => onChange({ ...config, timezone: val })}
          options={[
            { value: "UTC", label: "UTC (Coordinated Universal Time)" },
            { value: "America/New_York", label: "Eastern Time (US & Canada)" },
            { value: "America/Chicago", label: "Central Time (US & Canada)" },
            { value: "America/Los_Angeles", label: "Pacific Time (US & Canada)" },
            { value: "Europe/London", label: "London / GMT" },
            { value: "Europe/Paris", label: "Paris / Berlin (CET)" },
            { value: "Asia/Kolkata", label: "India Standard Time (IST)" },
            { value: "Asia/Tokyo", label: "Japan Standard Time (JST)" },
            { value: "Australia/Sydney", label: "Australian Eastern Time (AEST)" },
          ]}
        />
      </FormField>

      {/* Human-Readable Schedule Preview Box */}
      <div className="rounded-md border border-border/80 bg-canvas-subtle p-3 text-xs flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>{humanReadable}</span>
        </div>
        <div className="text-[11px] font-mono text-ink-muted">
          Cron: {effectiveCron} ({timezone})
        </div>

        {upcomingRuns.length > 0 && (
          <div className="mt-1 pt-2 border-t border-border/60 flex flex-col gap-1">
            <div className="text-[10px] uppercase tracking-wider font-semibold text-ink-faint">
              Upcoming Scheduled Runs:
            </div>
            {upcomingRuns.map((runDate, idx) => (
              <div key={idx} className="text-[11px] font-mono text-ink-soft">
                #{idx + 1}: {runDate.toISOString().replace("T", " ").substring(0, 19)} UTC
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 6. Webhook Form
// ------------------------------------------------------------------
function WebhookForm({
  config,
  onChange,
}: {
  config: WebhookConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const method = config.method ?? "POST";
  const path = config.path ?? "/webhook/endpoint";
  const responseMode = config.responseMode ?? "on_received";

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="HTTP Method">
        <FormSelect
          value={method}
          onChange={(val) => onChange({ ...config, method: val })}
          options={[
            { value: "GET", label: "GET" },
            { value: "POST", label: "POST" },
            { value: "PUT", label: "PUT" },
          ]}
        />
      </FormField>

      <FormField label="Webhook Path">
        <Input
          placeholder="/webhook/my-trigger"
          value={path}
          onChange={(e) => onChange({ ...config, path: e.target.value })}
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="Response Mode">
        <FormSelect
          value={responseMode}
          onChange={(val) => onChange({ ...config, responseMode: val })}
          options={[
            { value: "on_received", label: "On Received (Immediate 200 OK)" },
            { value: "on_completed", label: "On Workflow Completed" },
            { value: "custom_response", label: "Custom Response" },
          ]}
        />
      </FormField>
    </div>
  );
}

// ------------------------------------------------------------------
// 7. IF Form
// ------------------------------------------------------------------
function IfForm({
  config,
  onChange,
}: {
  config: IfConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const condition = config.condition ?? {
    field: "lead.score",
    operator: "greater_than",
    value: "80",
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between text-xs font-semibold text-ink">
        <span>IF Branching Rule</span>
        <span className="text-[10px] text-ink-faint">Ports: TRUE / FALSE</span>
      </div>
      <ConditionBuilder
        condition={condition}
        onChange={(updatedCondition) => onChange({ ...config, condition: updatedCondition })}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// 8. Filter Form
// ------------------------------------------------------------------
function FilterForm({
  config,
  onChange,
}: {
  config: FilterConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const condition = config.condition ?? {
    field: "status",
    operator: "equals",
    value: "active",
  };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="text-xs font-semibold text-ink">Filter Rule</div>
      <ConditionBuilder
        condition={condition}
        onChange={(updatedCondition) => onChange({ ...config, condition: updatedCondition })}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// 9. Delay Form
// ------------------------------------------------------------------
function DelayForm({
  config,
  onChange,
}: {
  config: DelayConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const duration = config.duration ?? 5;
  const unit = config.unit ?? "seconds";

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="Duration">
        <Input
          type="number"
          min="1"
          value={duration}
          onChange={(e) =>
            onChange({ ...config, duration: Math.max(1, parseInt(e.target.value, 10) || 1) })
          }
          className="text-xs"
        />
      </FormField>

      <FormField label="Unit">
        <FormSelect
          value={unit}
          onChange={(val) => onChange({ ...config, unit: val })}
          options={[
            { value: "seconds", label: "Seconds" },
            { value: "minutes", label: "Minutes" },
            { value: "hours", label: "Hours" },
          ]}
        />
      </FormField>
    </div>
  );
}

// ------------------------------------------------------------------
// 10. Set Variable Form
// ------------------------------------------------------------------
function SetVariableForm({
  config,
  onChange,
}: {
  config: SetVariableConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const variables = config.variables ?? [{ key: "varName", value: "sampleValue" }];

  return (
    <div className="flex flex-col gap-3.5">
      <KeyValueEditor
        title="Set Workflow Variables"
        items={variables}
        onChange={(items) => onChange({ ...config, variables: items })}
      />
    </div>
  );
}

// ------------------------------------------------------------------
// 11. Code Form
// ------------------------------------------------------------------
function CodeForm({
  config,
  onChange,
}: {
  config: CodeConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const code = config.code ?? "// Write JS code snippet\nreturn { success: true };";
  const mode = config.mode ?? "javascript";

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="Language Mode">
        <FormSelect
          value={mode}
          onChange={(val) => onChange({ ...config, mode: val })}
          options={[{ value: "javascript", label: "JavaScript / TypeScript" }]}
        />
      </FormField>

      <FormField label="JavaScript Code Snippet" description="Injected variables: input, steps, context">
        <Textarea
          placeholder="// Write code snippet...\nreturn { key: input.val };"
          value={code}
          onChange={(e) => onChange({ ...config, code: e.target.value })}
          className="font-mono text-xs h-40 bg-canvas"
        />
      </FormField>

      <div className="rounded-md border border-border/80 bg-canvas p-2.5 text-[11px] text-ink-faint font-mono">
        💡 Tip: Use <code className="text-accent-ink font-bold">return &#123; result: ... &#125;;</code> to return objects to downstream nodes.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 12. Webhook Response Form
// ------------------------------------------------------------------
function WebhookResponseForm({
  config,
  onChange,
}: {
  config: WebhookResponseConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const statusCode = config.statusCode ?? 200;
  const headers = config.headers ?? [{ key: "Content-Type", value: "application/json" }];
  const bodyType = config.bodyType ?? "json";
  const body = config.body ?? '{\n  "success": true\n}';

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="HTTP Status Code">
        <Input
          type="number"
          min="100"
          max="599"
          value={statusCode}
          onChange={(e) => onChange({ ...config, statusCode: parseInt(e.target.value, 10) || 200 })}
          className="font-mono text-xs"
        />
      </FormField>

      <KeyValueEditor
        title="HTTP Response Headers"
        items={headers}
        onChange={(items) => onChange({ ...config, headers: items })}
      />

      <FormField label="Response Body Type">
        <FormSelect
          value={bodyType}
          onChange={(val) => onChange({ ...config, bodyType: val })}
          options={[
            { value: "json", label: "JSON" },
            { value: "text", label: "Plain Text / Raw" },
          ]}
        />
      </FormField>

      <FormField label="Response Body Payload">
        <Textarea
          placeholder="Response body template..."
          value={body}
          onChange={(e) => onChange({ ...config, body: e.target.value })}
          className="font-mono text-xs h-32 bg-canvas"
        />
      </FormField>
    </div>
  );
}
