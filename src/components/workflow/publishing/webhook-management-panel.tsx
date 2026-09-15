"use client";

import { useState } from "react";
import { Globe, Copy, Check, Eye, EyeOff, RefreshCw, Send, Play, Code2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";

interface WebhookManagementPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  webhookSecret?: string | null;
  status?: string;
}

export function WebhookManagementPanel({ open, onOpenChange, webhookSecret, status }: WebhookManagementPanelProps) {
  const workflowId = useEditorStore((s) => s.workflowId);
  const toast = useToastStore((s) => s.toast);

  const [secretRevealed, setSecretRevealed] = useState(false);
  const [secretOverride, setSecretOverride] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"curl" | "javascript" | "python">("curl");
  const [rotating, setRotating] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; executionId?: string; error?: string } | null>(null);

  const currentSecret = secretOverride ?? webhookSecret ?? "";

  if (!open || !workflowId) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const webhookUrl = `${baseUrl}/api/webhooks/${workflowId}`;

  const samplePayload = JSON.stringify({ lead: { name: "Raj", score: 95 } }, null, 2);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const handleRotateSecret = async () => {
    setRotating(true);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/secret`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Secret rotation failed");
      setSecretOverride(data.webhookSecret);
      toast("Webhook secret rotated successfully!");
    } catch {
      toast("Failed to rotate secret", { tone: "error" });
    } finally {
      setRotating(false);
    }
  };

  const handleTestWebhookTrigger = async () => {
    setTestingWebhook(true);
    setTestResult(null);

    try {
      const res = await fetch(`/api/webhooks/${workflowId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-webhook-secret": currentSecret,
        },
        body: samplePayload,
      });

      const data = await res.json();
      if (!res.ok) {
        setTestResult({ success: false, error: data.error });
        toast("Test webhook rejected", { tone: "error" });
      } else {
        setTestResult({ success: true, executionId: data.executionId });
        toast(`Production Webhook triggered! Execution ID: ${data.executionId.slice(0, 8)}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Request failed";
      setTestResult({ success: false, error: msg });
    } finally {
      setTestingWebhook(false);
    }
  };

  // Generate Code Snippets
  const secretPlaceholder = currentSecret && currentSecret.trim() ? currentSecret : "YOUR_WEBHOOK_SECRET";

  const curlSnippet = `curl -X POST \\
  ${webhookUrl} \\
  -H "Content-Type: application/json" \\
  -H "x-webhook-secret: ${secretPlaceholder}" \\
  -d '${samplePayload.replace(/\n/g, "")}'`;

  const jsSnippet = `fetch("${webhookUrl}", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-webhook-secret": "${secretPlaceholder}"
  },
  body: JSON.stringify(${samplePayload.replace(/\n\s*/g, " ")})
})
.then(res => res.json())
.then(data => console.log("Execution Queued:", data));`;

  const pythonSnippet = `import requests

url = "${webhookUrl}"
headers = {
    "Content-Type": "application/json",
    "x-webhook-secret": "${secretPlaceholder}"
}
payload = ${samplePayload.replace(/\n/g, "")}

response = requests.post(url, json=payload, headers=headers)
print("Response:", response.json())`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-accent-ink" />
            <h2 className="text-sm font-semibold text-ink">Production Webhook Management & API Docs</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-ink-faint hover:text-ink text-xs font-medium"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {status !== "published" && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600" />
              <span>Workflow is currently <strong>Draft</strong>. Only <strong>Published</strong> workflows can process live incoming webhooks.</span>
            </div>
          )}

          {/* Webhook Endpoint Info */}
          <div className="flex flex-col gap-3 rounded-lg border border-border bg-canvas/60 p-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-ink flex items-center justify-between">
                <span>Production Webhook URL</span>
                <button
                  type="button"
                  onClick={() => handleCopy(webhookUrl, "url")}
                  className="text-[11px] text-accent-ink font-normal hover:underline flex items-center gap-1"
                >
                  {copiedKey === "url" ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                  {copiedKey === "url" ? "Copied" : "Copy URL"}
                </button>
              </label>
              <input
                readOnly
                value={webhookUrl}
                className="font-mono text-xs p-2.5 rounded border border-border bg-surface text-ink font-semibold"
              />
            </div>

            {/* Secret Key Management */}
            <div className="flex flex-col gap-1 pt-2">
              <label className="text-xs font-semibold text-ink flex items-center justify-between">
                <span>Webhook Secret (`x-webhook-secret`)</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSecretRevealed(!secretRevealed)}
                    className="text-[11px] text-ink-faint hover:text-ink flex items-center gap-1"
                  >
                    {secretRevealed ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                    {secretRevealed ? "Hide" : "Reveal"}
                  </button>
                  <button
                    type="button"
                    onClick={handleRotateSecret}
                    disabled={rotating}
                    className="text-[11px] text-accent-ink hover:underline flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${rotating ? "animate-spin" : ""}`} />
                    Rotate Secret
                  </button>
                </div>
              </label>
              <input
                readOnly
                type={secretRevealed ? "text" : "password"}
                value={currentSecret || "No secret key generated"}
                className="font-mono text-xs p-2 rounded border border-border bg-surface text-ink-soft"
              />
            </div>
          </div>

          {/* Test Live Webhook Button */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Play className="h-3.5 w-3.5 text-accent-ink" />
                Test Production Webhook Endpoint
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleTestWebhookTrigger}
                disabled={testingWebhook}
                className="text-xs gap-1.5 h-8"
              >
                {testingWebhook ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    Sending POST Request...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Trigger Test Webhook
                  </>
                )}
              </Button>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs font-mono flex items-start gap-2 ${
                  testResult.success
                    ? "border-success/30 bg-success/10 text-success"
                    : "border-error/30 bg-error/10 text-error"
                }`}
              >
                {testResult.success ? (
                  <div>
                    <strong>Webhook Execution Queued!</strong> ID: {testResult.executionId}
                  </div>
                ) : (
                  <div>
                    <strong>Webhook Execution Error:</strong> {testResult.error}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Code Generator Snippets */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                <Code2 className="h-3.5 w-3.5 text-accent-ink" />
                Webhook Request Documentation Generator
              </span>
              <div className="flex items-center gap-1">
                {(["curl", "javascript", "python"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 text-xs rounded font-mono uppercase font-semibold transition-colors ${
                      activeTab === tab
                        ? "bg-accent text-accent-ink"
                        : "text-ink-faint hover:text-ink"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <pre className="max-h-52 overflow-y-auto rounded-lg border border-border bg-canvas p-3 font-mono text-[11px] text-ink-soft">
                {activeTab === "curl" && curlSnippet}
                {activeTab === "javascript" && jsSnippet}
                {activeTab === "python" && pythonSnippet}
              </pre>
              <button
                type="button"
                onClick={() => {
                  const text =
                    activeTab === "curl"
                      ? curlSnippet
                      : activeTab === "javascript"
                      ? jsSnippet
                      : pythonSnippet;
                  handleCopy(text, `snippet-${activeTab}`);
                }}
                className="absolute right-2.5 top-2.5 rounded border border-border bg-surface px-2 py-1 text-[10px] font-semibold text-ink-faint hover:text-ink flex items-center gap-1"
              >
                {copiedKey === `snippet-${activeTab}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                Copy Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
