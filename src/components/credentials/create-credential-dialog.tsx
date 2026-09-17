"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CredentialItem } from "@/lib/security/credential-service";

interface CreateCredentialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  credentialToEdit?: CredentialItem | null;
  defaultProvider?: string;
  onSuccess: (credential: CredentialItem) => void;
}

const PROVIDERS = [
  { value: "openai-api-key", label: "OpenAI API Key", icon: "🤖" },
  { value: "claude-api-key", label: "Claude API Key", icon: "🧠" },
  { value: "gemini-api-key", label: "Gemini API Key", icon: "✨" },
  { value: "openai", label: "OpenAI API (Legacy)", icon: "🤖" },
  { value: "anthropic", label: "Anthropic Claude (Legacy)", icon: "🧠" },
  { value: "gemini", label: "Google Gemini (Legacy)", icon: "✨" },
  { value: "slack", label: "Slack Bot Token", icon: "💬" },
  { value: "telegram-bot-token", label: "Telegram Bot Token", icon: "✈️" },
  { value: "discord-webhook", label: "Discord Webhook", icon: "🎮" },
  { value: "google-sheets", label: "Google Sheets / API Key", icon: "📊" },
  { value: "smtp", label: "Email / SMTP Server", icon: "✉️" },
  { value: "custom", label: "Custom API Key / Header", icon: "🔑" },
];

export function CreateCredentialDialog({
  open,
  onOpenChange,
  credentialToEdit,
  defaultProvider = "openai",
  onSuccess,
}: CreateCredentialDialogProps) {
  const [name, setName] = useState("");
  const [provider, setProvider] = useState(defaultProvider);
  const [value, setValue] = useState("");
  const [showSecret, setShowSecret] = useState(false);

  // Metadata fields (for SMTP / Custom)
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (credentialToEdit) {
      setName(credentialToEdit.name);
      setProvider(credentialToEdit.provider);
      setValue(""); // Secret string is left blank unless user wants to replace it
      const meta = credentialToEdit.metadata || {};
      setSmtpHost((meta.smtpHost as string) || "");
      setSmtpPort(String(meta.smtpPort || "587"));
      setSmtpUser((meta.smtpUser as string) || "");
    } else {
      setName("");
      setProvider(defaultProvider);
      setValue("");
      setSmtpHost("");
      setSmtpPort("587");
      setSmtpUser("");
    }
    setTestResult(null);
    setError(null);
  }, [credentialToEdit, defaultProvider, open]);

  const handleTestConnection = async () => {
    if (!value && !credentialToEdit) {
      setError("Please enter a secret key/token to test.");
      return;
    }

    setTesting(true);
    setTestResult(null);
    setError(null);

    try {
      let res;
      if (credentialToEdit && !value) {
        res = await fetch(`/api/credentials/${credentialToEdit.id}/test`, { method: "POST" });
      } else {
        const metadataObj: Record<string, unknown> = {};
        if (provider === "smtp") {
          metadataObj.smtpHost = smtpHost;
          metadataObj.smtpPort = parseInt(smtpPort, 10) || 587;
          metadataObj.smtpUser = smtpUser;
        }

        res = await fetch("/api/credentials/test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            provider,
            value,
            metadata: metadataObj,
          }),
        });
      }

      const data = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: `Test failed: ${msg}` });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Credential name is required.");
      return;
    }
    if (!value.trim() && !credentialToEdit) {
      setError("Secret API key or token is required.");
      return;
    }

    setSaving(true);
    setError(null);

    const metadataObj: Record<string, unknown> = {};
    if (provider === "smtp") {
      metadataObj.smtpHost = smtpHost;
      metadataObj.smtpPort = parseInt(smtpPort, 10) || 587;
      metadataObj.smtpUser = smtpUser;
    }

    try {
      let res;
      if (credentialToEdit) {
        res = await fetch(`/api/credentials/${credentialToEdit.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            provider,
            value: value.trim() ? value : undefined,
            metadata: metadataObj,
          }),
        });
      } else {
        res = await fetch("/api/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            provider,
            value: value.trim(),
            metadata: metadataObj,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || data.error || "Failed to save credential.");
      }

      onSuccess(data.credential);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-accent-ink" />
            {credentialToEdit ? "Edit Credential" : "Add New Credential"}
          </DialogTitle>
          <DialogDescription>
            Secrets are encrypted with AES-256-GCM. Plaintext values are never exposed or saved in workflows.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 p-3 text-xs text-error">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Credential Name</Label>
            <Input
              placeholder="e.g. Production OpenAI Key, Marketing Slack Bot"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="text-xs"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Provider Type</Label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-canvas px-2.5 text-xs text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            >
              {PROVIDERS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
          </div>

          {provider === "smtp" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-canvas/50 p-3">
              <div className="space-y-1 col-span-2">
                <Label className="text-[11px] font-medium text-ink-muted">SMTP Host</Label>
                <Input
                  placeholder="smtp.gmail.com"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="h-8 text-xs bg-surface"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-ink-muted">Port</Label>
                <Input
                  placeholder="587"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="h-8 text-xs bg-surface"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-medium text-ink-muted">Username</Label>
                <Input
                  placeholder="user@example.com"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className="h-8 text-xs bg-surface"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-medium">
                {provider === "smtp" ? "SMTP Password / App Password" : "Secret API Key / Token"}
              </Label>
              {credentialToEdit && (
                <span className="text-[11px] text-ink-faint">Leave blank to keep existing secret</span>
              )}
            </div>
            <div className="relative flex items-center">
              <Input
                type={showSecret ? "text" : "password"}
                placeholder={credentialToEdit ? "••••••••••••••••" : "sk-..."}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="pr-9 font-mono text-xs"
              />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute right-2.5 text-ink-faint hover:text-ink"
                aria-label={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-md p-3 text-xs ${
                testResult.success
                  ? "border border-success/30 bg-success/10 text-success"
                  : "border border-error/30 bg-error/10 text-error"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing || (!value && !credentialToEdit)}
            >
              {testing ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
              Test Connection
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {credentialToEdit ? "Save Changes" : "Create Credential"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
