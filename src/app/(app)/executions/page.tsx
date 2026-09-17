"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Ban,
  Layers,
  Filter,
  Search,
  Globe,
  Zap,
  Code,
  Clock3,
  FileText,
  ArrowRightLeft,
  Bot,
  Activity,
  DollarSign,
  Cpu,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExecutionComparisonModal,
  type ExecutionComparisonItem,
} from "@/components/execution/execution-comparison";

interface AnalyticsSummary {
  totalRuns: number;
  successfulRuns?: number;
  failedRuns?: number;
  successRate: number;
  avgRuntimeMs: number;
  totalAiTokens: number;
  totalAiCost: number;
  totalHttpRequests: number;
}

export default function ExecutionsPage() {
  const [executions, setExecutions] = useState<ExecutionComparisonItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Selection for comparison
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const url =
        statusFilter === "all"
          ? "/api/executions"
          : `/api/executions?status=${statusFilter}`;
      const [execRes, analyticsRes] = await Promise.all([
        fetch(url),
        fetch("/api/executions/analytics"),
      ]);

      if (execRes.ok) {
        const data = await execRes.json();
        setExecutions(data.executions || []);
      }

      if (analyticsRes.ok) {
        const data = await analyticsRes.json();
        setAnalytics(data.analytics || null);
      }
    } catch {
      // Gracefully handle errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const filteredExecutions = useMemo(() => {
    return executions.filter((e) => {
      // Source filter
      if (sourceFilter !== "all" && e.source !== sourceFilter) {
        return false;
      }
      // Search query filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        (e.workflowName || "").toLowerCase().includes(q) ||
        (e.id || "").toLowerCase().includes(q) ||
        (e.source || "").toLowerCase().includes(q)
      );
    });
  }, [executions, sourceFilter, searchQuery]);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((i) => i !== id);
      }
      if (prev.length >= 2) {
        return [prev[1], id];
      }
      return [...prev, id];
    });
  };

  const selectedExecA = executions.find((e) => e.id === selectedIds[0]);
  const selectedExecB = executions.find((e) => e.id === selectedIds[1]);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-6xl mx-auto w-full">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink flex items-center gap-2">
            <Play className="h-5 w-5 text-accent-ink" />
            Workflow Execution History & Observability
          </h1>
          <p className="text-xs text-ink-faint mt-1">
            Inspect live production runs, debug failures, track AI token usage, and replay past executions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length === 2 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsComparing(true)}
              className="text-xs gap-1.5 bg-accent text-accent-ink font-semibold"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
              Compare Selected (2)
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={loading}
            className="text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh History
          </Button>
        </div>
      </div>

      {/* Nori Debug Companion Tip (User Rule: Mascot Dialog Box BG #A7B3A1) */}
      <div
        className="rounded-2xl p-4 shadow-sm flex items-start gap-3.5 border border-black/10"
        style={{ backgroundColor: "#A7B3A1" }}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white/40">
          <Image
            src="/mascot/happy.png"
            alt="Nori Mascot"
            fill
            className="object-contain p-0.5"
          />
        </div>
        <div className="flex flex-col text-slate-900 text-xs">
          <span className="font-bold flex items-center gap-1 text-slate-950">
            Nori&apos;s Execution Copilot
          </span>
          <p className="mt-0.5 leading-relaxed text-slate-900/90 font-medium">
            Select any two execution runs using the checkboxes to open side-by-side diff mode! Click on any execution ID to step into full visual node timelines and humanized error tracebacks.
          </p>
        </div>
      </div>

      {/* Analytics Summary Metric Cards */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-faint flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-accent-ink" />
              Total Runs
            </span>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-lg font-bold text-ink font-mono">{analytics.totalRuns}</span>
              <span className="text-[11px] font-semibold text-success font-mono">
                {analytics.successRate}% Success
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-faint flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-blue-600" />
              Avg Runtime
            </span>
            <span className="text-lg font-bold text-ink font-mono mt-1">
              {analytics.avgRuntimeMs}ms
            </span>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-faint flex items-center gap-1">
              <Bot className="h-3.5 w-3.5 text-purple-600" />
              AI Tokens & Cost
            </span>
            <div className="flex items-baseline justify-between mt-1 font-mono">
              <span className="text-lg font-bold text-ink">
                {analytics.totalAiTokens.toLocaleString()}
              </span>
              <span className="text-[11px] text-ink-faint">
                ${analytics.totalAiCost.toFixed(4)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3.5 shadow-2xs flex flex-col gap-1">
            <span className="text-[11px] font-medium text-ink-faint flex items-center gap-1">
              <Globe className="h-3.5 w-3.5 text-emerald-600" />
              HTTP Requests
            </span>
            <span className="text-lg font-bold text-ink font-mono mt-1">
              {analytics.totalHttpRequests}
            </span>
          </div>
        </div>
      )}

      {/* Toolbar: Filters & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border pb-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1 overflow-x-auto">
            <Filter className="h-3.5 w-3.5 text-ink-faint shrink-0 mr-1" />
            {["all", "success", "failed", "running", "queued"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors capitalize ${
                  statusFilter === st
                    ? "bg-accent text-accent-ink font-semibold shadow-2xs"
                    : "bg-surface text-ink-soft hover:bg-canvas"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Source Filter */}
          <div className="flex items-center gap-1 overflow-x-auto border-l border-border pl-3">
            <span className="text-[11px] text-ink-faint font-medium mr-1">Source:</span>
            {["all", "manual", "webhook", "schedule", "api"].map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSourceFilter(src)}
                className={`px-2 py-0.5 text-[11px] rounded font-mono transition-colors capitalize ${
                  sourceFilter === src
                    ? "bg-ink/15 text-ink font-bold"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                {src}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-64 shrink-0">
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

      {/* Executions Table */}
      <div className="rounded-xl border border-border bg-surface shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12 text-xs text-ink-faint gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Loading workflow execution history...
          </div>
        ) : filteredExecutions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="h-8 w-8 text-ink-faint mb-2" />
            <h3 className="text-sm font-semibold text-ink">No Execution Runs Found</h3>
            <p className="text-xs text-ink-faint mt-1 max-w-sm">
              Trigger a test run in the visual canvas editor or send a webhook request to record execution logs.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredExecutions.map((exec) => {
              const isSelected = selectedIds.includes(exec.id);
              const source = exec.source || "manual";

              return (
                <div
                  key={exec.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 transition-colors gap-3 ${
                    isSelected ? "bg-accent/10" : "hover:bg-canvas/50"
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    {/* Checkbox for side-by-side diff */}
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(exec.id)}
                      className="mt-1 sm:mt-0 rounded border-border text-accent focus:ring-accent h-4 w-4 shrink-0 cursor-pointer"
                      title="Select for side-by-side diff comparison"
                    />

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
                        <Link
                          href={`/executions/${exec.id}`}
                          className="text-xs font-bold text-ink hover:text-accent-ink hover:underline truncate"
                        >
                          {exec.workflowName}
                        </Link>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          v{exec.versionNumber || 1}
                        </Badge>
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
                    {/* Resource Usage Info */}
                    <div className="flex items-center gap-4 text-xs font-mono text-ink-faint">
                      {(exec.aiTokensIn || exec.aiTokensOut) ? (
                        <span className="flex items-center gap-1 text-[11px]" title="AI Tokens & Estimated Cost">
                          <Bot className="h-3 w-3 text-purple-600" />
                          {(exec.aiTokensIn || 0) + (exec.aiTokensOut || 0)} tks (${(exec.aiEstimatedCost || 0).toFixed(3)})
                        </span>
                      ) : null}

                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exec.duration !== undefined && exec.duration !== null ? `${exec.duration}ms` : "In progress"}
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

      {/* Side-by-Side Comparison Modal */}
      {isComparing && selectedExecA && selectedExecB && (
        <ExecutionComparisonModal
          executionA={selectedExecA}
          executionB={selectedExecB}
          onClose={() => setIsComparing(false)}
        />
      )}
    </div>
  );
}