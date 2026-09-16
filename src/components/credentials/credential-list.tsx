"use client";

import React, { useState } from "react";
import { KeyRound, ShieldCheck, Clock, Trash2, Edit2, Play, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CredentialItem } from "@/lib/security/credential-service";

interface CredentialListProps {
  credentials: CredentialItem[];
  loading: boolean;
  onRefresh: () => void;
  onEdit: (credential: CredentialItem) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
}

const PROVIDER_ICONS: Record<string, { label: string; icon: string }> = {
  openai: { label: "OpenAI", icon: "🤖" },
  anthropic: { label: "Anthropic", icon: "🧠" },
  gemini: { label: "Google Gemini", icon: "✨" },
  slack: { label: "Slack", icon: "💬" },
  smtp: { label: "Email / SMTP", icon: "✉️" },
  custom: { label: "Custom API", icon: "🔑" },
};

function formatLastUsed(isoString: string | null): string {
  if (!isoString) return "Never used";
  const date = new Date(isoString);
  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function CredentialList({
  credentials,
  loading,
  onEdit,
  onDelete,
  onCreateNew,
}: CredentialListProps) {
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  const handleTestCredential = async (cred: CredentialItem) => {
    setTestingId(cred.id);
    try {
      const res = await fetch(`/api/credentials/${cred.id}/test`, { method: "POST" });
      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [cred.id]: data }));
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [cred.id]: { success: false, message: "Connectivity test failed" },
      }));
    } finally {
      setTestingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 flex-col items-center justify-center gap-2 text-ink-muted">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
        <span className="text-xs font-medium">Loading credentials...</span>
      </div>
    );
  }

  if (credentials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-canvas p-10 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-dim/40 text-accent-ink">
          <KeyRound className="h-6 w-6" />
        </div>
        <h3 className="mt-4 text-sm font-bold text-ink">No credentials saved</h3>
        <p className="mt-1 max-w-sm text-xs text-ink-muted">
          Store your API keys, OAuth tokens, and SMTP credentials safely with AES-256-GCM encryption.
        </p>
        <Button variant="primary" size="sm" onClick={onCreateNew} className="mt-4 gap-2">
          <Plus className="h-4 w-4" />
          Add Credential
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-ink-muted">
          {credentials.length} {credentials.length === 1 ? "Credential" : "Credentials"} Configured
        </div>
        <Button variant="outline" size="sm" onClick={onCreateNew} className="gap-1.5 text-xs">
          <Plus className="h-3.5 w-3.5" />
          Add Credential
        </Button>
      </div>

      <div className="grid gap-3">
        {credentials.map((cred) => {
          const providerInfo = PROVIDER_ICONS[cred.provider] || { label: cred.provider, icon: "🔑" };
          const isTesting = testingId === cred.id;
          const result = testResults[cred.id];

          return (
            <div
              key={cred.id}
              className="group flex flex-col justify-between rounded-xl border border-border bg-surface p-4 transition-all hover:border-accent/40 sm:flex-row sm:items-center"
            >
              <div className="flex items-start gap-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-hover text-lg border border-border">
                  {providerInfo.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-ink">{cred.name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {providerInfo.label}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-ink-faint">
                    <span className="font-mono text-ink-muted">{cred.maskedValue}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Last Used: <strong className="font-medium text-ink-muted">{formatLastUsed(cred.lastUsedAt)}</strong>
                    </span>
                  </div>

                  {result && (
                    <div
                      className={`text-[11px] font-medium ${
                        result.success ? "text-success" : "text-error"
                      }`}
                    >
                      {result.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-3 flex items-center gap-1.5 border-t border-border pt-3 sm:mt-0 sm:border-t-0 sm:pt-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleTestCredential(cred)}
                  disabled={isTesting}
                  title="Test Connectivity"
                  className="h-8 gap-1 text-xs text-ink-muted hover:text-ink"
                >
                  {isTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                  Test
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onEdit(cred)}
                  title="Edit Credential"
                  className="h-8 w-8 text-ink-muted hover:text-ink"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(cred.id)}
                  title="Delete Credential"
                  className="h-8 w-8 text-ink-muted hover:text-error"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
