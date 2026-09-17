"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Globe, GitBranch, MessageSquare, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Trash2, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface OAuthConnectionItem {
  id: string;
  provider: string;
  accountEmail: string | null;
  accountName: string | null;
  accountAvatar: string | null;
  status: string;
  lastRefreshedAt: string | null;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

const PROVIDERS = [
  {
    id: "google",
    name: "Google Workspace",
    description: "Connect Google Sheets & Drive APIs for automated data reporting.",
    icon: Globe,
    accent: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  {
    id: "github",
    name: "GitHub",
    description: "Connect GitHub repos for automated PR reviews & issue summaries.",
    icon: GitBranch,
    accent: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  {
    id: "slack",
    name: "Slack",
    description: "Connect Slack workspaces for real-time incident & automated alerts.",
    icon: MessageSquare,
    accent: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
];

export default function ConnectionsPage() {
  const [connections, setConnections] = useState<OAuthConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchConnections = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/connections");
      const data = await res.json();
      if (data.connections) {
        setConnections(data.connections);
      }
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConnections();

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("connected") === "true") {
        const p = params.get("provider") || "OAuth";
        setBanner({ type: "success", message: `Successfully connected ${p.toUpperCase()} to Neuraloop Vault!` });
      } else if (params.get("error")) {
        setBanner({ type: "error", message: `Connection error: ${params.get("error")}` });
      }
    }
  }, []);

  const handleConnect = (providerId: string) => {
    window.location.href = `/api/oauth/${providerId}/authorize`;
  };

  const handleDisconnect = async (connId: string) => {
    setDisconnectingId(connId);
    try {
      const res = await fetch(`/api/connections?id=${connId}`, { method: "DELETE" });
      if (res.ok) {
        setConnections((prev) => prev.filter((c) => c.id !== connId));
        setBanner({ type: "success", message: "Connection revoked and deleted from Vault." });
      }
    } catch (err) {
      console.error("Disconnect error:", err);
    } finally {
      setDisconnectingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-canvas text-ink p-6 max-w-5xl mx-auto flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <Link href="/settings" className="p-1.5 rounded-md hover:bg-canvas-soft transition-colors text-ink-soft">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              OAuth 2.0 Connection Hub
            </h1>
            <p className="text-xs text-ink-soft">
              One-click SaaS authentication. All access & refresh tokens are encrypted using AES-256-GCM.
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchConnections} disabled={loading} className="text-xs gap-1.5">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh Connections
        </Button>
      </div>

      {/* Banner Notice */}
      {banner && (
        <div
          className={`px-4 py-3 rounded-lg border text-xs flex items-center justify-between ${
            banner.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
              : "bg-rose-500/10 border-rose-500/20 text-rose-500"
          }`}
        >
          <div className="flex items-center gap-2">
            {banner.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{banner.message}</span>
          </div>
          <button onClick={() => setBanner(null)} className="text-xs opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Connection Connectors Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PROVIDERS.map((p) => {
          const Icon = p.icon;
          const conn = connections.find((c) => c.provider === p.id);
          const isConnected = Boolean(conn && conn.status === "active");

          return (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-canvas-card p-5 flex flex-col justify-between gap-4 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2.5 rounded-lg border ${p.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                      isConnected
                        ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/20"
                        : "bg-canvas-soft text-ink-faint border border-border"
                    }`}
                  >
                    {isConnected ? "Connected" : "Not Connected"}
                  </span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-ink">{p.name}</h3>
                  <p className="text-xs text-ink-soft mt-1 leading-relaxed">{p.description}</p>
                </div>

                {/* Health Check Metrics Card */}
                {isConnected && conn && (
                  <div className="mt-2 p-3 rounded-lg bg-canvas-soft border border-border text-[11px] flex flex-col gap-1.5 font-mono">
                    <div className="flex justify-between items-center text-ink-soft">
                      <span>Account:</span>
                      <span className="font-semibold text-ink truncate max-w-[140px]" title={conn.accountEmail || conn.accountName || ""}>
                        {conn.accountEmail || conn.accountName || "Connected"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-ink-soft">
                      <span>Last Refreshed:</span>
                      <span>{conn.lastRefreshedAt ? new Date(conn.lastRefreshedAt).toLocaleTimeString() : "Just now"}</span>
                    </div>
                    <div className="flex justify-between items-center text-ink-soft">
                      <span>Token Expiry:</span>
                      <span className="text-emerald-500 font-sans font-medium">Active (Auto-refresh)</span>
                    </div>
                    <div className="flex justify-between items-center text-ink-soft">
                      <span>Last Used:</span>
                      <span>{conn.lastUsedAt ? new Date(conn.lastUsedAt).toLocaleDateString() : "Never"}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                {isConnected && conn ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnectingId === conn.id}
                    onClick={() => handleDisconnect(conn.id)}
                    className="w-full text-xs text-rose-500 border-rose-500/20 hover:bg-rose-500/10 gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    {disconnectingId === conn.id ? "Disconnecting..." : "Disconnect Account"}
                  </Button>
                ) : (
                  <Button
                    onClick={() => handleConnect(p.id)}
                    size="sm"
                    className="w-full text-xs gap-1.5 bg-primary text-white hover:bg-primary/90"
                  >
                    Connect {p.name}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
