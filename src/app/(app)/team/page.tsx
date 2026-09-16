"use client";

import React, { useEffect, useState } from "react";
import {
  OrganizationProfile,
  useOrganization,
  useUser,
} from "@clerk/nextjs";
import { Users, Shield, History, Building2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AuditLogItem {
  id: string;
  organizationId: string | null;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export default function TeamPage() {
  const { organization, isLoaded } = useOrganization();
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState<"members" | "permissions" | "audit">("members");
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (activeTab === "audit") {
      setLoadingLogs(true);
      fetch("/api/audit-logs")
        .then((res) => res.json())
        .then((data) => {
          setAuditLogs(data.logs || []);
        })
        .catch(() => {})
        .finally(() => setLoadingLogs(false));
    }
  }, [activeTab]);

  return (
    <div className="flex flex-col gap-6 p-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Building2 className="h-5 w-5 text-accent-ink" />
            {organization ? organization.name : "Personal Workspace"}
          </h1>
          <p className="text-xs text-ink-soft mt-0.5">
            Manage organization members, role permissions, workspace settings, and audit logs.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-border text-xs font-medium">
        <button
          onClick={() => setActiveTab("members")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "members"
              ? "border-accent text-accent-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Members & Invitations
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "permissions"
              ? "border-accent text-accent-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <Shield className="h-3.5 w-3.5" />
          Role Permission Matrix
        </button>
        <button
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-1.5 px-3 py-2 border-b-2 transition-colors ${
            activeTab === "audit"
              ? "border-accent text-accent-ink font-semibold"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          <History className="h-3.5 w-3.5" />
          Workspace Audit Logs
        </button>
      </div>

      {/* Tab 1: Member Management */}
      {activeTab === "members" && (
        <div className="flex flex-col gap-4">
          {!isLoaded ? (
            <div className="h-48 w-full animate-pulse rounded-lg bg-ink/5" />
          ) : organization ? (
            <div className="rounded-xl border border-border bg-surface p-4">
              <OrganizationProfile
                appearance={{
                  elements: {
                    rootBox: "w-full shadow-none border-none",
                    cardBox: "w-full shadow-none border-none bg-transparent",
                  },
                }}
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-surface p-6 text-center flex flex-col items-center gap-3">
              <Building2 className="h-10 w-10 text-ink-faint" />
              <div>
                <h3 className="text-sm font-semibold text-ink">Personal Workspace Active</h3>
                <p className="text-xs text-ink-soft mt-1 max-w-md">
                  You are currently working in your personal workspace. Create or switch to an Organization to invite team members and share workflows.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Role Permission Matrix */}
      {activeTab === "permissions" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Role Permission Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border bg-canvas-subtle text-ink-soft">
                    <th className="p-2.5 font-semibold">Capability / Resource</th>
                    <th className="p-2.5 font-semibold text-center">Owner</th>
                    <th className="p-2.5 font-semibold text-center">Admin</th>
                    <th className="p-2.5 font-semibold text-center">Member</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-ink">
                  <tr>
                    <td className="p-2.5 font-medium">Create & Edit Workflows</td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Execute & Run Workflows</td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Use Shared Vault Credentials</td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Create & Delete Vault Credentials</td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-ink-faint"><Lock className="h-4 w-4 mx-auto text-ink-faint" /></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Manage Team & Invite Members</td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-ink-faint"><Lock className="h-4 w-4 mx-auto text-ink-faint" /></td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-medium">Delete Workspace / Billing</td>
                    <td className="p-2.5 text-center text-emerald-600"><CheckCircle2 className="h-4 w-4 mx-auto" /></td>
                    <td className="p-2.5 text-center text-ink-faint"><Lock className="h-4 w-4 mx-auto text-ink-faint" /></td>
                    <td className="p-2.5 text-center text-ink-faint"><Lock className="h-4 w-4 mx-auto text-ink-faint" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Workspace Audit Logs */}
      {activeTab === "audit" && (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <h3 className="text-sm font-semibold text-ink mb-3">Audit Activity Trail</h3>
            {loadingLogs ? (
              <div className="h-32 w-full animate-pulse rounded bg-ink/5" />
            ) : auditLogs.length === 0 ? (
              <div className="text-xs text-ink-faint text-center py-8">
                No audit events recorded for this workspace yet.
              </div>
            ) : (
              <div className="flex flex-col gap-2 divide-y divide-border">
                {auditLogs.map((log) => (
                  <div key={log.id} className="pt-2.5 first:pt-0 flex items-start justify-between text-xs">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-ink font-mono text-[11px] bg-accent-dim/40 text-accent-ink px-1.5 py-0.5 rounded w-fit">
                        {log.action}
                      </span>
                      <span className="text-ink-soft">
                        Resource: <code className="text-ink">{log.resourceType}:{log.resourceId}</code>
                      </span>
                      <span className="text-[11px] text-ink-faint">By User: {log.userId}</span>
                    </div>
                    <span className="text-[11px] text-ink-faint font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}