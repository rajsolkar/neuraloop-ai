"use client";

import React, { useState, useEffect } from "react";
import { KeyRound, Settings, ShieldCheck, User } from "lucide-react";
import { CredentialList } from "@/components/credentials/credential-list";
import { CreateCredentialDialog } from "@/components/credentials/create-credential-dialog";
import type { CredentialItem } from "@/lib/security/credential-service";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"credentials" | "general">("credentials");
  const [credentials, setCredentials] = useState<CredentialItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCred, setEditingCred] = useState<CredentialItem | null>(null);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/credentials");
      const data = await res.json();
      setCredentials(data.credentials || []);
    } catch (err) {
      console.error("Failed to fetch credentials:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  const handleCreateNew = () => {
    setEditingCred(null);
    setDialogOpen(true);
  };

  const handleEdit = (cred: CredentialItem) => {
    setEditingCred(cred);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this credential? Nodes referencing it will fail.")) {
      return;
    }
    try {
      await fetch(`/api/credentials/${id}`, { method: "DELETE" });
      fetchCredentials();
    } catch (err) {
      console.error("Failed to delete credential:", err);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">Settings & Integrations</h1>
        <p className="text-xs text-ink-muted">
          Manage workspace settings, API security keys, and encrypted credentials.
        </p>
      </div>

      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab("credentials")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "credentials"
              ? "border-accent text-accent-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <KeyRound className="h-4 w-4" />
          Credential Vault
        </button>
        <button
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition-colors ${
            activeTab === "general"
              ? "border-accent text-accent-ink"
              : "border-transparent text-ink-muted hover:text-ink"
          }`}
        >
          <Settings className="h-4 w-4" />
          General Preferences
        </button>
      </div>

      {activeTab === "credentials" ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-surface p-4 text-xs text-ink-soft flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent-ink shrink-0" />
            <div>
              <strong className="text-ink">AES-256-GCM Vault Security</strong>: Secrets are encrypted at rest with dedicated IVs and authentication tags. Workflow nodes reference credential IDs and decrypt secrets only at runtime.
            </div>
          </div>

          <CredentialList
            credentials={credentials}
            loading={loading}
            onRefresh={fetchCredentials}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCreateNew={handleCreateNew}
          />

          <CreateCredentialDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            credentialToEdit={editingCred}
            onSuccess={() => fetchCredentials()}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-6 space-y-4">
          <div className="flex items-center gap-3">
            <User className="h-5 w-5 text-ink-muted" />
            <div>
              <h3 className="text-sm font-semibold text-ink">Workspace Information</h3>
              <p className="text-xs text-ink-faint">Neuraloop Public Beta Edition</p>
            </div>
          </div>
          <div className="text-xs text-ink-muted">
            Workspace environment is running with production security enabled. Multi-tenant isolation is active.
          </div>
        </div>
      )}
    </div>
  );
}