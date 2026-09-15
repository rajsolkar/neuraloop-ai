"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Play, CheckCircle2, XCircle, Clock, RefreshCw, Ban, Layers, Filter, Search, Globe, Zap, Code, Clock3, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ExecutionSummary {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersionId: string;
  versionNumber: number;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  source?: "manual" | "webhook" | "schedule" | "api" | "template";
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  error?: string | null;
  nodeExecutions?: Array<unknown>;
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const loadExecutions = async (filter = statusFilter) => {
    setLoading(true);
    try {
      const url = filter === "all" ? "/api/executions" : `/api/executions?status=${filter}`;
      const execRes = await fetch(url);
      if (execRes.ok) {
        const data = await execRes.json();
        setExecutions(data.executions || []);
      }
    } catch {
      // Ignore fetch errors
    } fontinally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    async function init() {
      try {
        const url = statusFilter === "all" ? "/api/executions" : `/api/executions?status=${statusFilter}`;
        const execRes = await fetch(url);
        if (execRes.ok) {
          const data = await execRes.json();
          if (isMounted) setExecutions(data.executions || []);
        }
      } catch {
        // Ignore fetch errors
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    init();
    return () => {
      isMounted = false;
    };
  }, [statusFilter]);

  const filteredExecutions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return executions;
    return executions.filter(
      (e) =>
        e.workflowName.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q) ||
        (e.source || "").toLowerCase().includes(q),
    );
  }, [executions, searchQuery]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Play className="h-5 w-5 text-accent-ink" />
            Workflow Execution History
          </h1>
          <p className="text-xs text-ink-faint mt-1">
            Monitor live production webhook runs, manual tests, BullMQ queue status, and node execution timelines.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadExecutions(statusFilter)}
          disabled={loading}
          className="text-xs gap-1.5"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh History
        </Button>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border pb-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <Filter className="h-4 w-4 text-ink-faint shrink-0 mr-1" />
          {["all", "success", "failed", "running", "queued", "cancelled"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors shrink-0 ${
                statusFilter === st
                  ? "bg-accent text-accent-ink font-semibold shadow-2xs"
                  : "bg-surface text-ink-soft hover:bg-canvas"
              }`}
            >
              {st[0].toUpperCase() + st.slice(1)}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-64 shrink-0">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workflow or ID..."
            className="w-full font-sans text-xs bg-canvas pl-8 pr-3 py-1.5 rounded-md border border-border focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Executions List Table */}
      <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-ink-faint gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading execution runs...
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="h-8 w-8 text-ink-faint mb-2" />
            <h3 className="text-sm font-semibold text-ink">No Executions Found</h3>
            <p className="text-xs text-ink-faint mt-1 max-w-sm">
              Publish a workflow and trigger a <strong>Production Webhook</strong> or test run in the editor.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredExecutions.map((exec) => {
              const source = exec.source || "manual";
              return (
                <div
                  key={exec.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-canvas/50 transition-colors gap-3"
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Status Badge */}
                    {exec.status === "success" && (
                      <Badge variant="active" className="gap-1 shrink-0 mt-0.5 sm:mt-0">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Success
                      </Badge>
                    )}
                    {exec.status === "failed" && (
                      <Badge variant="draft" className="gap-1 bg-error/15 text-error border-error/30 shrink-0 mt-0.5 sm:mt-0">
                        <XCircle className="h-3.5 w-3.5" />
                        Failed
                      </Badge>
                    )}
                    {exec.status === "queued" && (
                      <Badge variant="draft" className="gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30 shrink-0 mt-0.5 sm:mt-0">
                        <Clock className="h-3.5 w-3.5 animate-pulse" />
                        Queued
                      </Badge>
                    )}
                    {exec.status === "running" && (
                      <Badge variant="draft" className="gap-1 bg-blue-500/15 text-blue-600 border-blue-500/30 shrink-0 mt-0.5 sm:mt-0">
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        Running
                      </Badge>
                    )}
                    {exec.status === "cancelled" && (
                      <Badge variant="draft" className="gap-1 bg-ink/15 text-ink border-border shrink-0 mt-0.5 sm:mt-0">
                        <Ban className="h-3.5 w-3.5" />
                        Cancelled
                      </Badge>
                    )}

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-ink truncate">
                          {exec.workflowName}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          v{exec.versionNumber || 1}
                        </Badge>
                        {/* Source Tag Badge */}
                        <Badge
                          variant="outline"
                          className="text-[10px] capitalize gap-1 font-mono bg-canvas"
                        >
                          {source === "webhook" && <Globe className="h-3 w-3 text-accent-ink" />}
                          {source === "manual" && <Zap className="h-3 w-3 text-amber-600" />}
                          {source === "api" && <Code className="h-3 w-3 text-blue-600" />}
                          {source === "schedule" && <Clock3 className="h-3 w-3 text-purple-600" />}
                          {source === "template" && <FileText className="h-3 w-3 text-emerald-600" />}
                          {source}
                        </Badge>
                      </div>
                      <span className="text-[11px] font-mono text-ink-faint truncate mt-0.5">
                        ID: {exec.id}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 pt-2 sm:pt-0 border-t sm:border-t-0 border-border shrink-0">
                    <div className="flex flex-col items-start sm:items-end text-xs text-ink-faint">
                      <span className="flex items-center gap-1 font-mono">
                        <Clock className="h-3 w-3" />
                        {exec.duration !== undefined && exec.duration !== null ? `${exec.duration}ms` : "In progress"}
                      </span>
                      <span className="text-[11px]">
                        {new Date(exec.startedAt).toLocaleString()}
                      </span>
                    </div>

                    <Link
                      href={`/executions/${exec.id}`}
                      className="text-xs font-semibold text-accent-ink hover:underline shrink-0"
                    >
                      View Timeline →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}