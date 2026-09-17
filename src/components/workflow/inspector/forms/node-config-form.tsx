"use client";

import { useState } from "react";
import { FormField, FormSelect, KeyValueEditor, ConditionBuilder, CredentialSelect } from "./form-components";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { VariablePicker } from "../variable-picker";
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
  LoopConfig,
  SwitchConfig,
  MergeConfig,
  TelegramConfig,
  DiscordConfig,
  GoogleSheetsConfig,
  TransformConfig,
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
    case "ai":
    case "openai":
      return <AIForm config={config} onChange={onChange} />;
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
    case "loop":
      return <LoopForm config={config as LoopConfig} onChange={onChange} />;
    case "switch":
      return <SwitchForm config={config as SwitchConfig} onChange={onChange} />;
    case "merge":
      return <MergeForm config={config as MergeConfig} onChange={onChange} />;
    case "telegram":
      return <TelegramForm config={config as TelegramConfig} onChange={onChange} />;
    case "discord":
      return <DiscordForm config={config as DiscordConfig} onChange={onChange} />;
    case "google-sheets":
      return <GoogleSheetsForm config={config as GoogleSheetsConfig} onChange={onChange} />;
    case "transform":
      return <TransformForm config={config as TransformConfig} onChange={onChange} />;
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
// 1. HTTP Request Pro Form with Preset Templates & Live Test Button
// ------------------------------------------------------------------
function HttpRequestForm({
  config,
  onChange,
}: {
  config: HttpRequestConfig & { credentialId?: string; authType?: string };
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const [activeTab, setActiveTab] = useState<"request" | "auth" | "headers" | "reliability">("request");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    status?: number;
    statusText?: string;
    duration?: number;
    ok?: boolean;
    data?: unknown;
    error?: string;
  } | null>(null);

  const method = config.method ?? "GET";
  const url = config.url ?? "";
  const authType = config.authType ?? (config.credentialId ? "vault" : "none");
  const credentialId = config.credentialId ?? "";
  const bearerToken = config.bearerToken ?? "";
  const basicUsername = config.basicUsername ?? "";
  const basicPassword = config.basicPassword ?? "";
  const apiKeyName = config.apiKeyName ?? "Authorization";
  const apiKeyValue = config.apiKeyValue ?? "";
  const apiKeyIn = config.apiKeyIn ?? "header";
  const customHeaderName = config.customHeaderName ?? "";
  const customHeaderValue = config.customHeaderValue ?? "";

  const queryParams = config.queryParams ?? [];
  const headers = config.headers ?? [];
  const bodyType = config.bodyType ?? "none";
  const body = config.body ?? "";
  const formData = config.formData ?? [];
  const rawBody = config.rawBody ?? "";

  const responseType = config.responseType ?? "auto";
  const responseKey = config.responseKey ?? "";
  const timeout = config.timeout ?? 10000;
  const retryCount = config.retryCount ?? 0;
  const retryDelay = config.retryDelay ?? 1000;

  const applyPreset = (presetKey: string) => {
    if (presetKey === "github") {
      onChange({
        ...config,
        method: "GET",
        url: "https://api.github.com/zen",
        authType: "vault",
        headers: [
          { key: "Accept", value: "application/vnd.github+json" },
          { key: "X-GitHub-Api-Version", value: "2022-11-28" },
        ],
      });
    } else if (presetKey === "stripe") {
      onChange({
        ...config,
        method: "GET",
        url: "https://api.stripe.com/v1/customers",
        authType: "vault",
        headers: [{ key: "Authorization", value: "Bearer {{credential.secret}}" }],
      });
    } else if (presetKey === "slack") {
      onChange({
        ...config,
        method: "POST",
        url: "https://slack.com/api/chat.postMessage",
        authType: "vault",
        bodyType: "json",
        body: '{\n  "channel": "#general",\n  "text": "Hello from Neuraloop Workflow!"\n}',
        headers: [{ key: "Authorization", value: "Bearer {{credential.secret}}" }],
      });
    } else if (presetKey === "openweather") {
      onChange({
        ...config,
        method: "GET",
        url: "https://api.openweathermap.org/data/2.5/weather",
        authType: "vault",
        queryParams: [
          { key: "q", value: "London" },
          { key: "appid", value: "{{credential.secret}}" },
        ],
      });
    } else {
      onChange({
        ...config,
        method: "GET",
        url: "",
        authType: "vault",
        bodyType: "none",
        queryParams: [],
        headers: [],
      });
    }
  };

  const handleTestRequest = async () => {
    setIsTesting(true);
    setTestResult(null);
    const startTime = Date.now();
    try {
      let targetUrl = url;
      if (!targetUrl || !targetUrl.trim()) {
        throw new Error("HTTP URL is required to test request.");
      }
      if (queryParams.length > 0) {
        const parsed = new URL(targetUrl);
        for (const q of queryParams) {
          if (q.key) parsed.searchParams.append(q.key, q.value);
        }
        targetUrl = parsed.toString();
      }
      const headersObj: Record<string, string> = {};
      for (const h of headers) {
        if (h.key) headersObj[h.key] = h.value;
      }
      if (authType === "bearer" && bearerToken) {
        headersObj["Authorization"] = `Bearer ${bearerToken}`;
      } else if (authType === "custom_header" && customHeaderName) {
        headersObj[customHeaderName] = customHeaderValue;
      }

      let bodyPayload: string | undefined = undefined;
      if (method !== "GET") {
        if (bodyType === "json" && body) bodyPayload = body;
        else if (bodyType === "form_data" && formData.length > 0) {
          const params = new URLSearchParams();
          for (const f of formData) if (f.key) params.append(f.key, f.value);
          bodyPayload = params.toString();
          if (!headersObj["Content-Type"]) headersObj["Content-Type"] = "application/x-www-form-urlencoded";
        } else if (bodyType === "raw" && (rawBody || body)) {
          bodyPayload = rawBody || body;
        }
      }

      const res = await fetch(targetUrl, {
        method,
        headers: headersObj,
        body: bodyPayload,
      });

      const duration = Date.now() - startTime;
      const text = await res.text();
      let json: unknown = null;
      try { json = JSON.parse(text); } catch {}

      setTestResult({
        status: res.status,
        statusText: res.statusText,
        duration,
        ok: res.ok,
        data: json ?? text,
      });
    } catch (err: unknown) {
      setTestResult({
        status: 0,
        statusText: "REQUEST_ERROR",
        duration: Date.now() - startTime,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      {/* Preset Selector */}
      <FormField label="API Preset Template" description="Prefill API integration settings">
        <FormSelect
          value=""
          onChange={(val) => applyPreset(val)}
          options={[
            { value: "", label: "-- Quick Preset Template --" },
            { value: "generic", label: "Generic REST API" },
            { value: "github", label: "GitHub API" },
            { value: "stripe", label: "Stripe API" },
            { value: "slack", label: "Slack API" },
            { value: "openweather", label: "OpenWeather API" },
          ]}
        />
      </FormField>

      {/* Sub-Tab Navigation */}
      <div className="flex border-b border-border text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("request")}
          className={`px-3 py-1.5 border-b-2 transition-colors ${
            activeTab === "request"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Request
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("auth")}
          className={`px-3 py-1.5 border-b-2 transition-colors ${
            activeTab === "auth"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Auth
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("headers")}
          className={`px-3 py-1.5 border-b-2 transition-colors ${
            activeTab === "headers"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Headers & Params
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("reliability")}
          className={`px-3 py-1.5 border-b-2 transition-colors ${
            activeTab === "reliability"
              ? "border-primary text-primary font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Reliability & Output
        </button>
      </div>

      {/* Tab 1: Request */}
      {activeTab === "request" && (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <div className="w-28 flex-shrink-0">
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
            </div>
            <div className="flex-1">
              <FormField label="URL" description="Endpoint target URL">
                <div className="relative flex items-center">
                  <Input
                    placeholder="https://api.example.com/v1/resource"
                    value={url}
                    onChange={(e) => onChange({ ...config, url: e.target.value })}
                    className="text-xs pr-8"
                  />
                  <div className="absolute right-1.5">
                    <VariablePicker onSelect={(path) => onChange({ ...config, url: `${url}{{${path}}}` })} />
                  </div>
                </div>
              </FormField>
            </div>
          </div>

          <FormField label="Body Type">
            <FormSelect
              value={bodyType}
              onChange={(val) => onChange({ ...config, bodyType: val })}
              options={[
                { value: "none", label: "None" },
                { value: "json", label: "JSON" },
                { value: "form_data", label: "Form Data (URL-encoded)" },
                { value: "raw", label: "Raw Content" },
              ]}
            />
          </FormField>

          {bodyType === "json" && (
            <FormField label="JSON Body Payload">
              <div className="relative">
                <Textarea
                  placeholder='{ "name": "{{trigger.name}}" }'
                  value={body}
                  onChange={(e) => onChange({ ...config, body: e.target.value })}
                  className="font-mono text-xs h-28"
                />
                <div className="absolute right-2 top-2">
                  <VariablePicker onSelect={(path) => onChange({ ...config, body: `${body}{{${path}}}` })} />
                </div>
              </div>
            </FormField>
          )}

          {bodyType === "form_data" && (
            <KeyValueEditor
              title="Form Data Fields"
              items={formData}
              onChange={(items) => onChange({ ...config, formData: items })}
            />
          )}

          {bodyType === "raw" && (
            <FormField label="Raw Payload Content">
              <div className="relative">
                <Textarea
                  placeholder="Raw request body text..."
                  value={rawBody}
                  onChange={(e) => onChange({ ...config, rawBody: e.target.value })}
                  className="font-mono text-xs h-24"
                />
                <div className="absolute right-2 top-2">
                  <VariablePicker onSelect={(path) => onChange({ ...config, rawBody: `${rawBody}{{${path}}}` })} />
                </div>
              </div>
            </FormField>
          )}
        </div>
      )}

      {/* Tab 2: Authentication */}
      {activeTab === "auth" && (
        <div className="flex flex-col gap-3">
          <FormField label="Authentication Mode" description="Recommended: Vault Credential or OAuth Connection">
            <FormSelect
              value={authType}
              onChange={(val) => onChange({ ...config, authType: val })}
              options={[
                { value: "vault", label: "🔒 Vault Credential (Recommended)" },
                { value: "oauth_connection", label: "🌐 OAuth 2.0 Connection (Google, GitHub, Slack)" },
                { value: "bearer", label: "Bearer Token" },
                { value: "basic", label: "Basic Auth (Username/Password)" },
                { value: "api_key", label: "API Key (Header / Query)" },
                { value: "custom_header", label: "Custom Header" },
                { value: "none", label: "No Authentication" },
              ]}
            />
          </FormField>

          {authType === "oauth_connection" && (
            <div className="flex flex-col gap-2.5 p-3 rounded-lg border border-border bg-canvas-soft">
              <FormField label="OAuth Provider">
                <FormSelect
                  value={config.connectionProvider ?? "github"}
                  onChange={(val) => onChange({ ...config, connectionProvider: val })}
                  options={[
                    { value: "google", label: "🌐 Google Workspace" },
                    { value: "github", label: "🐙 GitHub" },
                    { value: "slack", label: "💬 Slack" },
                  ]}
                />
              </FormField>
              <CredentialSelect
                provider={config.connectionProvider ?? "custom"}
                value={config.connectionId ?? credentialId}
                onChange={(cid) => onChange({ ...config, connectionId: cid, credentialId: cid })}
                label="Select OAuth Connection Account"
              />
              <a
                href="/settings/connections"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline font-medium self-end"
              >
                + Connect / Manage OAuth Connections →
              </a>
            </div>
          )}

          {authType === "vault" && (
            <CredentialSelect
              provider="custom"
              value={credentialId}
              onChange={(cid) => onChange({ ...config, credentialId: cid })}
              label="Select Vault Credential"
            />
          )}

          {authType === "bearer" && (
            <FormField label="Bearer Token">
              <div className="relative flex items-center">
                <Input
                  type="password"
                  placeholder="bearer_token_123 or {{credential.secret}}"
                  value={bearerToken}
                  onChange={(e) => onChange({ ...config, bearerToken: e.target.value })}
                  className="text-xs pr-8"
                />
                <div className="absolute right-1.5">
                  <VariablePicker onSelect={(path) => onChange({ ...config, bearerToken: `{{${path}}}` })} />
                </div>
              </div>
            </FormField>
          )}

          {authType === "basic" && (
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Username">
                <Input
                  placeholder="api_user"
                  value={basicUsername}
                  onChange={(e) => onChange({ ...config, basicUsername: e.target.value })}
                  className="text-xs"
                />
              </FormField>
              <FormField label="Password / Secret">
                <Input
                  type="password"
                  placeholder="secret_pass"
                  value={basicPassword}
                  onChange={(e) => onChange({ ...config, basicPassword: e.target.value })}
                  className="text-xs"
                />
              </FormField>
            </div>
          )}

          {authType === "api_key" && (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <FormField label="Key Name">
                  <Input
                    placeholder="X-API-Key or Authorization"
                    value={apiKeyName}
                    onChange={(e) => onChange({ ...config, apiKeyName: e.target.value })}
                    className="text-xs"
                  />
                </FormField>
                <FormField label="Location">
                  <FormSelect
                    value={apiKeyIn}
                    onChange={(val) => onChange({ ...config, apiKeyIn: val })}
                    options={[
                      { value: "header", label: "Header" },
                      { value: "query", label: "Query Parameter" },
                    ]}
                  />
                </FormField>
              </div>
              <FormField label="Key Value">
                <Input
                  type="password"
                  placeholder="key_val_123 or {{credential.secret}}"
                  value={apiKeyValue}
                  onChange={(e) => onChange({ ...config, apiKeyValue: e.target.value })}
                  className="text-xs"
                />
              </FormField>
            </div>
          )}

          {authType === "custom_header" && (
            <div className="grid grid-cols-2 gap-2">
              <FormField label="Header Name">
                <Input
                  placeholder="X-Custom-Auth"
                  value={customHeaderName}
                  onChange={(e) => onChange({ ...config, customHeaderName: e.target.value })}
                  className="text-xs"
                />
              </FormField>
              <FormField label="Header Value">
                <Input
                  placeholder="custom_val"
                  value={customHeaderValue}
                  onChange={(e) => onChange({ ...config, customHeaderValue: e.target.value })}
                  className="text-xs"
                />
              </FormField>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Headers & Parameters */}
      {activeTab === "headers" && (
        <div className="flex flex-col gap-3">
          <KeyValueEditor
            title="Query Parameters"
            items={queryParams}
            onChange={(items) => onChange({ ...config, queryParams: items })}
          />
          <KeyValueEditor
            title="HTTP Headers"
            items={headers}
            onChange={(items) => onChange({ ...config, headers: items })}
          />
        </div>
      )}

      {/* Tab 4: Reliability & Output */}
      {activeTab === "reliability" && (
        <div className="flex flex-col gap-3">
          <FormField label="Response Parsing Mode">
            <FormSelect
              value={responseType}
              onChange={(val) => onChange({ ...config, responseType: val })}
              options={[
                { value: "auto", label: "Auto (Detect JSON / Fallback to Text)" },
                { value: "json", label: "JSON (Force JSON Parse)" },
                { value: "text", label: "Text (Raw Plain Text)" },
              ]}
            />
          </FormField>

          <FormField label="Save Response As (Custom Key)" description="e.g. 'products' enables {{steps.http.products}}">
            <Input
              placeholder="e.g. products, items, payload"
              value={responseKey}
              onChange={(e) => onChange({ ...config, responseKey: e.target.value })}
              className="text-xs font-mono"
            />
          </FormField>

          <div className="grid grid-cols-3 gap-2">
            <FormField label="Timeout (ms)">
              <Input
                type="number"
                value={timeout}
                onChange={(e) => onChange({ ...config, timeout: parseInt(e.target.value, 10) || 10000 })}
                className="text-xs"
              />
            </FormField>
            <FormField label="Retry Count (0-5)">
              <Input
                type="number"
                min={0}
                max={5}
                value={retryCount}
                onChange={(e) => onChange({ ...config, retryCount: parseInt(e.target.value, 10) || 0 })}
                className="text-xs"
              />
            </FormField>
            <FormField label="Retry Delay (ms)">
              <Input
                type="number"
                value={retryDelay}
                onChange={(e) => onChange({ ...config, retryDelay: parseInt(e.target.value, 10) || 1000 })}
                className="text-xs"
              />
            </FormField>
          </div>
        </div>
      )}

      {/* Live Test Request Button & Result Viewer */}
      <div className="pt-2 border-t border-border flex flex-col gap-2">
        <button
          type="button"
          onClick={handleTestRequest}
          disabled={isTesting}
          className="w-full py-1.5 px-3 rounded-md bg-primary text-white text-xs font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {isTesting ? "Executing Test Request..." : "⚡ Test Request"}
        </button>

        {testResult && (
          <div className="rounded-md border border-border bg-canvas px-3 py-2 text-xs flex flex-col gap-1 font-mono">
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${testResult.ok ? "text-emerald-500" : "text-rose-500"}`}>
                {testResult.status ? `Status: ${testResult.status} ${testResult.statusText || ""}` : testResult.error}
              </span>
              <span className="text-ink-faint text-[10px]">{testResult.duration}ms</span>
            </div>
            <div className="max-h-36 overflow-auto text-[11px] bg-canvas-soft p-1.5 rounded border border-border mt-1">
              <pre className="whitespace-pre-wrap break-all">
                {typeof testResult.data === "object"
                  ? JSON.stringify(testResult.data, null, 2)
                  : String(testResult.data || testResult.error || "")}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 2. AI Form (Unified Provider-Agnostic LLM Form)
// ------------------------------------------------------------------
function AIForm({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const provider = (config.provider as string) || "openai";
  const credentialId = (config.credentialId as string) ?? "";
  const model =
    (config.model as string) ??
    (provider === "claude"
      ? "claude-3-5-sonnet-20241022"
      : provider === "gemini"
      ? "gemini-2.5-flash"
      : "gpt-4o-mini");
  const prompt = (config.prompt as string) ?? "";
  const systemPrompt = (config.systemPrompt as string) ?? "";
  const temperature = (config.temperature as number) ?? 0.7;
  const maxTokens = (config.maxTokens as number) ?? 1000;

  const getModelOptions = () => {
    switch (provider) {
      case "claude":
        return [
          { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet" },
          { value: "claude-3-5-haiku-20241022", label: "Claude 3.5 Haiku" },
          { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
        ];
      case "gemini":
        return [
          { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
          { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro" },
          { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash" },
        ];
      case "openai":
      default:
        return [
          { value: "gpt-4o-mini", label: "gpt-4o-mini (Fast & Efficient)" },
          { value: "gpt-4o", label: "gpt-4o (High Intelligence)" },
          { value: "gpt-4-turbo", label: "gpt-4-turbo" },
        ];
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="AI Provider">
        <FormSelect
          value={provider}
          onChange={(val) => {
            const defaultM =
              val === "claude"
                ? "claude-3-5-sonnet-20241022"
                : val === "gemini"
                ? "gemini-2.5-flash"
                : "gpt-4o-mini";
            onChange({ ...config, provider: val, model: defaultM });
          }}
          options={[
            { value: "openai", label: "OpenAI" },
            { value: "claude", label: "Anthropic Claude" },
            { value: "gemini", label: "Google Gemini" },
          ]}
        />
      </FormField>

      <CredentialSelect
        provider={provider}
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="AI Credential (Required)"
      />

      <FormField label="Model">
        <FormSelect
          value={model}
          onChange={(val) => onChange({ ...config, model: val })}
          options={getModelOptions()}
        />
      </FormField>

      <div className="space-y-1">
        <FormField label="System Prompt (Optional)">
          <Textarea
            placeholder="System behavior guidelines..."
            value={systemPrompt}
            onChange={(e) => onChange({ ...config, systemPrompt: e.target.value })}
            className="text-xs h-16"
          />
        </FormField>
        <VariablePicker onSelect={(expr) => onChange({ ...config, systemPrompt: systemPrompt ? `${systemPrompt} ${expr}` : expr })} />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-ink">User Prompt</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  prompt:
                    "Analyze the following input data and return a JSON response with keys 'summary', 'sentiment' (positive/negative/neutral), and 'action_items':\n\n{{steps.trigger.body}}",
                })
              }
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-colors"
            >
              ✨ Generate
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  prompt: prompt
                    ? `${prompt}\n\nPlease respond strictly in JSON format without markdown codeblocks.`
                    : "Analyze input and return strictly JSON.",
                })
              }
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors"
            >
              🔧 Improve
            </button>
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...config,
                  prompt: prompt
                    ? `[DEBUG MODE: If input is empty, return {"error": "Missing input"}].\n${prompt}`
                    : "If input is empty, return error.",
                })
              }
              className="text-[10px] font-medium px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-colors"
            >
              🔍 Debug Guard
            </button>
          </div>
        </div>
        <FormField label="">
          <Textarea
            placeholder="User prompt instructions with {{variables}}..."
            value={prompt}
            onChange={(e) => onChange({ ...config, prompt: e.target.value })}
            className="text-xs h-24"
          />
        </FormField>
        <VariablePicker onSelect={(expr) => onChange({ ...config, prompt: prompt ? `${prompt} ${expr}` : expr })} />
      </div>

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

// ------------------------------------------------------------------
// 13. Loop Form
// ------------------------------------------------------------------
function LoopForm({
  config,
  onChange,
}: {
  config: LoopConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const arrayPath = config.arrayPath ?? "items";

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Array Field / Path</span>
        <VariablePicker onSelect={(expr) => onChange({ ...config, arrayPath: expr })} />
      </div>
      <Input
        placeholder="e.g. items or {{steps.http.data.records}}"
        value={arrayPath}
        onChange={(e) => onChange({ ...config, arrayPath: e.target.value })}
        className="font-mono text-xs"
      />
      <div className="rounded-md border border-border bg-canvas p-2 text-[11px] text-ink-soft">
        Iterates over items. Downstream nodes can reference <code className="font-mono text-accent-ink font-bold">&#123;&#123;loop.item&#125;&#125;</code> and <code className="font-mono text-accent-ink font-bold">&#123;&#123;loop.currentIndex&#125;&#125;</code>.
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// 14. Switch Form
// ------------------------------------------------------------------
function SwitchForm({
  config,
  onChange,
}: {
  config: SwitchConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const cases = config.cases ?? [
    { id: "case_1", label: "case_1", fieldPath: "priority", operator: "equals", value: "high" },
    { id: "case_2", label: "case_2", fieldPath: "priority", operator: "equals", value: "medium" },
  ];

  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Switch Routing Cases</span>
      </div>
      {cases.map((c, idx) => (
        <div key={c.id || idx} className="rounded-md border border-border bg-canvas/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-ink">
            <span>Branch: {c.label || `case_${idx + 1}`}</span>
            <VariablePicker onSelect={(expr) => {
              const updated = [...cases];
              updated[idx] = { ...updated[idx], fieldPath: expr };
              onChange({ ...config, cases: updated });
            }} />
          </div>
          <Input
            placeholder="Field Path (e.g. priority)"
            value={c.fieldPath}
            onChange={(e) => {
              const updated = [...cases];
              updated[idx] = { ...updated[idx], fieldPath: e.target.value };
              onChange({ ...config, cases: updated });
            }}
            className="text-xs"
          />
          <Input
            placeholder="Target Value (e.g. high)"
            value={c.value}
            onChange={(e) => {
              const updated = [...cases];
              updated[idx] = { ...updated[idx], value: e.target.value };
              onChange({ ...config, cases: updated });
            }}
            className="text-xs"
          />
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------
// 15. Merge Form
// ------------------------------------------------------------------
function MergeForm({
  config,
  onChange,
}: {
  config: MergeConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const mode = config.mode ?? "combine";

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="Merge Mode">
        <FormSelect
          value={mode}
          onChange={(val) => onChange({ ...config, mode: val })}
          options={[
            { value: "combine", label: "Combine (Shallow Object Merge)" },
            { value: "append", label: "Append (Array Collection)" },
            { value: "overwrite", label: "Overwrite (Take Latest Payload)" },
          ]}
        />
      </FormField>
    </div>
  );
}

// ------------------------------------------------------------------
// 16. Telegram Form
// ------------------------------------------------------------------
function TelegramForm({
  config,
  onChange,
}: {
  config: TelegramConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const chatId = config.chatId ?? "";
  const operation = config.operation ?? "send_message";
  const text = config.text ?? "";
  const photoUrl = config.photoUrl ?? "";

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="telegram-bot-token"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="Telegram Bot Credential"
      />

      <FormField label="Operation">
        <FormSelect
          value={operation}
          onChange={(val) => onChange({ ...config, operation: val })}
          options={[
            { value: "send_message", label: "Send Text Message" },
            { value: "send_photo", label: "Send Photo Image" },
          ]}
        />
      </FormField>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Chat ID / Channel Handle</span>
        <VariablePicker onSelect={(expr) => onChange({ ...config, chatId: config.chatId ? `${config.chatId} ${expr}` : expr })} />
      </div>
      <Input
        placeholder="e.g. @mychannel or 123456789"
        value={chatId}
        onChange={(e) => onChange({ ...config, chatId: e.target.value })}
        className="font-mono text-xs"
      />

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Message Text (Markdown)</span>
        <VariablePicker onSelect={(expr) => onChange({ ...config, text: config.text ? `${config.text} ${expr}` : expr })} />
      </div>
      <Textarea
        placeholder="Type message text or use variables..."
        value={text}
        onChange={(e) => onChange({ ...config, text: e.target.value })}
        className="text-xs h-20"
      />

      {operation === "send_photo" && (
        <FormField label="Photo Image URL">
          <Input
            placeholder="https://example.com/image.jpg"
            value={photoUrl}
            onChange={(e) => onChange({ ...config, photoUrl: e.target.value })}
            className="text-xs"
          />
        </FormField>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// 17. Discord Form
// ------------------------------------------------------------------
function DiscordForm({
  config,
  onChange,
}: {
  config: DiscordConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const webhookUrl = config.webhookUrl ?? "";
  const operation = config.operation ?? "send_message";
  const content = config.content ?? "";

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="discord-webhook"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="Discord Webhook Credential"
      />

      <FormField label="Webhook URL (Optional if set in Vault)">
        <Input
          placeholder="https://discord.com/api/webhooks/..."
          value={webhookUrl}
          onChange={(e) => onChange({ ...config, webhookUrl: e.target.value })}
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="Operation">
        <FormSelect
          value={operation}
          onChange={(val) => onChange({ ...config, operation: val })}
          options={[
            { value: "send_message", label: "Send Text Message" },
            { value: "send_embed", label: "Send Rich Embed Card" },
          ]}
        />
      </FormField>

      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-ink">Message Content</span>
        <VariablePicker onSelect={(expr) => onChange({ ...config, content: config.content ? `${config.content} ${expr}` : expr })} />
      </div>
      <Textarea
        placeholder="Type Discord message..."
        value={content}
        onChange={(e) => onChange({ ...config, content: e.target.value })}
        className="text-xs h-20"
      />
    </div>
  );
}

// ------------------------------------------------------------------
// 18. Google Sheets Form
// ------------------------------------------------------------------
function GoogleSheetsForm({
  config,
  onChange,
}: {
  config: GoogleSheetsConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const credentialId = config.credentialId ?? "";
  const spreadsheetId = config.spreadsheetId ?? "";
  const sheetName = config.sheetName ?? "Sheet1";
  const range = config.range ?? "A1:Z100";
  const operation = config.operation ?? "read_rows";
  const rowValues = config.rowValues ?? "";

  return (
    <div className="flex flex-col gap-3.5">
      <CredentialSelect
        provider="google-sheets"
        value={credentialId}
        onChange={(cid) => onChange({ ...config, credentialId: cid })}
        label="Google Sheets Credential"
      />

      <FormField label="Spreadsheet ID">
        <Input
          placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
          value={spreadsheetId}
          onChange={(e) => onChange({ ...config, spreadsheetId: e.target.value })}
          className="font-mono text-xs"
        />
      </FormField>

      <FormField label="Sheet Name">
        <Input
          placeholder="Sheet1"
          value={sheetName}
          onChange={(e) => onChange({ ...config, sheetName: e.target.value })}
          className="text-xs"
        />
      </FormField>

      <FormField label="Operation">
        <FormSelect
          value={operation}
          onChange={(val) => onChange({ ...config, operation: val })}
          options={[
            { value: "read_rows", label: "Read Rows" },
            { value: "append_row", label: "Append Row" },
          ]}
        />
      </FormField>

      {operation === "read_rows" && (
        <FormField label="Range">
          <Input
            placeholder="A1:Z100"
            value={range}
            onChange={(e) => onChange({ ...config, range: e.target.value })}
            className="font-mono text-xs"
          />
        </FormField>
      )}

      {operation === "append_row" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Row Values (JSON Array or CSV)</span>
            <VariablePicker onSelect={(expr) => onChange({ ...config, rowValues: config.rowValues ? `${config.rowValues} ${expr}` : expr })} />
          </div>
          <Input
            placeholder='["Val1", "Val2", "Val3"]'
            value={rowValues}
            onChange={(e) => onChange({ ...config, rowValues: e.target.value })}
            className="font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// 20. Transform Form with Interactive Live Preview Panel
// ------------------------------------------------------------------
function TransformForm({
  config,
  onChange,
}: {
  config: TransformConfig;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const operation = (config.operation as string) || "add_field";

  // Real-time Live Preview simulation
  const getLivePreview = () => {
    const sampleInput: Record<string, unknown> = {
      name: "Raj Solkar",
      email: "raj@example.com",
      status: "active",
      score: 95,
      timestamp: "2026-09-17T14:00:00.000Z",
      address: { city: "San Francisco", zip: "94105" },
    };

    switch (operation) {
      case "add_field": {
        const k = (config.key as string) || "fieldName";
        const v = (config.value as string) || "sampleValue";
        return { ...sampleInput, [k]: v };
      }
      case "remove_field": {
        const p = (config.targetPath as string) || "status";
        const copy = { ...sampleInput };
        delete copy[p];
        return copy;
      }
      case "rename_field": {
        const oldK = (config.targetPath as string) || "name";
        const newK = (config.newKey as string) || "fullName";
        const copy = { ...sampleInput };
        if (oldK in copy) {
          copy[newK] = copy[oldK];
          delete copy[oldK];
        }
        return copy;
      }
      case "keep_fields": {
        const keysStr = (config.targetPath as string) || "name, email";
        const keys = keysStr.split(",").map((k) => k.trim()).filter(Boolean);
        const filtered: Record<string, unknown> = {};
        for (const k of keys) {
          if (k in sampleInput) filtered[k] = sampleInput[k];
        }
        return filtered;
      }
      case "set_default_values": {
        return {
          ...sampleInput,
          phone: "+1-555-0199",
          role: "member",
        };
      }
      case "merge_objects": {
        return { ...sampleInput, mergedSource: "https://api.example.com/user" };
      }
      case "flatten_json": {
        return {
          name: "Raj Solkar",
          email: "raj@example.com",
          status: "active",
          score: 95,
          "address.city": "San Francisco",
          "address.zip": "94105",
        };
      }
      case "extract_nested": {
        return { city: "San Francisco", zip: "94105" };
      }
      case "date_format": {
        return { isoString: "2026-09-17T14:00:00.000Z" };
      }
      case "string_format": {
        return { text: "RAJ SOLKAR", original: "Raj Solkar" };
      }
      case "math_operation": {
        return { value: 105, base: 95, operand: 10 };
      }
      case "json_parse_stringify": {
        return { jsonString: JSON.stringify(sampleInput) };
      }
      default:
        return sampleInput;
    }
  };

  return (
    <div className="flex flex-col gap-3.5">
      <FormField label="Transform Operation">
        <FormSelect
          value={operation}
          onChange={(val) => onChange({ ...config, operation: val })}
          options={[
            { value: "add_field", label: "Add Field" },
            { value: "remove_field", label: "Remove Field" },
            { value: "rename_field", label: "Rename Field" },
            { value: "keep_fields", label: "Filter Fields (Keep Only)" },
            { value: "set_default_values", label: "Default Values" },
            { value: "merge_objects", label: "Merge Objects" },
            { value: "flatten_json", label: "Flatten JSON" },
            { value: "extract_nested", label: "Extract Nested Values" },
            { value: "date_format", label: "Date Formatting" },
            { value: "string_format", label: "String Formatting" },
            { value: "math_operation", label: "Math Operations" },
            { value: "json_parse_stringify", label: "JSON Parse / Stringify" },
          ]}
        />
      </FormField>

      {/* Operation Controls */}
      {operation === "add_field" && (
        <>
          <FormField label="Field Key">
            <Input
              value={(config.key as string) || ""}
              onChange={(e) => onChange({ ...config, key: e.target.value })}
              placeholder="e.g. tier"
              className="text-xs"
            />
          </FormField>
          <div className="space-y-1">
            <FormField label="Field Value / Expression">
              <Input
                value={(config.value as string) || ""}
                onChange={(e) => onChange({ ...config, value: e.target.value })}
                placeholder="e.g. {{steps.ai.output.text}}"
                className="text-xs"
              />
            </FormField>
            <VariablePicker onSelect={(expr) => onChange({ ...config, value: ((config.value as string) || "") + expr })} />
          </div>
        </>
      )}

      {(operation === "remove_field" || operation === "rename_field") && (
        <FormField label="Target Property Key Path">
          <Input
            value={(config.targetPath as string) || ""}
            onChange={(e) => onChange({ ...config, targetPath: e.target.value })}
            placeholder="e.g. internal_id"
            className="text-xs"
          />
        </FormField>
      )}

      {operation === "rename_field" && (
        <FormField label="New Property Key Name">
          <Input
            value={(config.newKey as string) || ""}
            onChange={(e) => onChange({ ...config, newKey: e.target.value })}
            placeholder="e.g. customer_id"
            className="text-xs"
          />
        </FormField>
      )}

      {operation === "keep_fields" && (
        <FormField label="Keys to Keep (Comma separated)">
          <Input
            value={(config.targetPath as string) || ""}
            onChange={(e) => onChange({ ...config, targetPath: e.target.value })}
            placeholder="e.g. name, email, phone"
            className="text-xs"
          />
        </FormField>
      )}

      {operation === "string_format" && (
        <>
          <FormField label="String Action">
            <FormSelect
              value={(config.stringOp as string) || "uppercase"}
              onChange={(val) => onChange({ ...config, stringOp: val })}
              options={[
                { value: "uppercase", label: "UPPERCASE" },
                { value: "lowercase", label: "lowercase" },
                { value: "trim", label: "Trim Whitespace" },
                { value: "concat", label: "Concatenate String" },
                { value: "slice", label: "Slice String" },
                { value: "replace", label: "Replace Pattern" },
              ]}
            />
          </FormField>
          <FormField label="Target Field Path (Optional)">
            <Input
              value={(config.targetPath as string) || ""}
              onChange={(e) => onChange({ ...config, targetPath: e.target.value })}
              placeholder="e.g. user.email"
              className="text-xs"
            />
          </FormField>
        </>
      )}

      {operation === "date_format" && (
        <FormField label="Date Format Output">
          <FormSelect
            value={(config.dateFormat as string) || "iso"}
            onChange={(val) => onChange({ ...config, dateFormat: val })}
            options={[
              { value: "iso", label: "ISO 8601 (2026-09-17T14:00:00.000Z)" },
              { value: "timestamp", label: "Unix Epoch Milliseconds" },
              { value: "locale_date", label: "Locale Date String" },
            ]}
          />
        </FormField>
      )}

      {/* Live Preview Panel */}
      <div className="rounded-lg border border-border bg-canvas/60 p-3 space-y-2 mt-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-accent-ink flex items-center gap-1.5">
            ✨ Interactive Live Preview
          </span>
          <span className="text-[10px] font-mono text-ink-faint">Real-time Transformation</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
          <div className="rounded border border-border bg-surface p-2">
            <div className="text-[9px] text-ink-faint mb-1">INPUT JSON</div>
            <pre className="text-ink-muted whitespace-pre-wrap overflow-x-auto max-h-32">
              {JSON.stringify({ name: "Raj Solkar", email: "raj@example.com", status: "active" }, null, 2)}
            </pre>
          </div>
          <div className="rounded border border-border bg-surface p-2">
            <div className="text-[9px] text-accent-ink mb-1">OUTPUT JSON</div>
            <pre className="text-accent-ink whitespace-pre-wrap overflow-x-auto max-h-32">
              {JSON.stringify(getLivePreview(), null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

