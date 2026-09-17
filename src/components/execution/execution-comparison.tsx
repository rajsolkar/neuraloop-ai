"use client";

import { useState } from "react";
import { X, ArrowRightLeft, CheckCircle2, XCircle, Clock, Globe, Zap, Code, Clock3, FileText, Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ExecutionComparisonItem {
  id: string;
  workflowName: string;
  versionNumber: number;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  source?: string;
  startedAt: string;
  duration?: number | null;
  aiTokensIn?: number;
  aiTokensOut?: number;
  aiEstimatedCost?: number;
  httpRequestsCount?: number;
  error?: string | null;
  nodeExecutions?: Array<{
    id: string;
    nodeId: string;
    nodeLabel: string;
    nodeType: string;
    status: string;
    duration?: number | null;
    input?: Record<string, unknown> | null;
    output?: Record<string, unknown> | null;
    error?: string | null;
  }>;
}

interface ExecutionComparisonProps {
  executionA: ExecutionComparisonItem;
  executionB: ExecutionComparisonItem;
  onClose: () => void;
}

export function ExecutionComparisonModal({
  executionA,
  executionB,
  onClose,
}: ExecutionComparisonProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Map node executions by nodeId for side-by-side comparison
  const nodeMapA = new Map((executionA.nodeExecutions || []).map((n) => [n.nodeId, n]));
  const nodeMapB = new Map((executionB.nodeExecutions || []).map((n) => [n.nodeId, n]));

  const allNodeIds = Array.from(new Set([...nodeMapA.keys(), ...nodeMapB.keys()]));

  const selectedNodeA = selectedNodeId ? nodeMapA.get(selectedNodeId) : null;
  const selectedNodeB = selectedNodeId ? nodeMapB.get(selectedNodeId) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-canvas/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/20 text-accent-ink">
              <ArrowRightLeft className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Side-by-Side Execution Diff Viewer</h2>
              <p className="text-xs text-ink-faint">
                Comparing run <span className="font-mono text-ink font-semibold">{executionA.id.slice(0, 8)}</span> vs{" "}
                <span className="font-mono text-ink font-semibold">{executionB.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
            <X className="h-4 w-4 text-ink-faint hover:text-ink" />
          </Button>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex flex-col gap-6">
          {/* Overview Cards Comparison Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Execution A Card */}
            <ExecutionCard execution={executionA} label="Execution A (Baseline)" />
            {/* Execution B Card */}
            <ExecutionCard execution={executionB} label="Execution B (Comparison)" />
          </div>

          {/* Metrics Diff Table */}
          <div className="rounded-xl border border-border bg-canvas/30 p-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint mb-3">
              Performance & Resource Diff
            </h3>
            <div className="grid grid-cols-3 gap-2 text-xs font-mono">
              <span className="text-ink-faint font-sans">Metric</span>
              <span className="font-semibold text-ink">Execution A</span>
              <span className="font-semibold text-ink">Execution B</span>

              <span className="text-ink-faint font-sans border-t border-border/60 pt-2">Status</span>
              <span className="border-t border-border/60 pt-2">
                <StatusBadge status={executionA.status} />
              </span>
              <span className="border-t border-border/60 pt-2">
                <StatusBadge status={executionB.status} />
              </span>

              <span className="text-ink-faint font-sans border-t border-border/60 pt-2">Duration</span>
              <span className="border-t border-border/60 pt-2 font-bold text-ink">
                {executionA.duration ?? 0}ms
              </span>
              <span className="border-t border-border/60 pt-2 font-bold text-ink">
                {executionB.duration ?? 0}ms{" "}
                {executionA.duration != null && executionB.duration != null && (
                  <span
                    className={`text-[10px] font-normal ${
                      executionB.duration <= executionA.duration ? "text-success" : "text-error"
                    }`}
                  >
                    ({executionB.duration - executionA.duration >= 0 ? "+" : ""}
                    {executionB.duration - executionA.duration}ms)
                  </span>
                )}
              </span>

              <span className="text-ink-faint font-sans border-t border-border/60 pt-2">AI Tokens</span>
              <span className="border-t border-border/60 pt-2">
                {((executionA.aiTokensIn || 0) + (executionA.aiTokensOut || 0)).toLocaleString()} tokens
              </span>
              <span className="border-t border-border/60 pt-2">
                {((executionB.aiTokensIn || 0) + (executionB.aiTokensOut || 0)).toLocaleString()} tokens
              </span>

              <span className="text-ink-faint font-sans border-t border-border/60 pt-2">AI Cost</span>
              <span className="border-t border-border/60 pt-2">
                ${(executionA.aiEstimatedCost || 0).toFixed(4)}
              </span>
              <span className="border-t border-border/60 pt-2">
                ${(executionB.aiEstimatedCost || 0).toFixed(4)}
              </span>

              <span className="text-ink-faint font-sans border-t border-border/60 pt-2">HTTP Requests</span>
              <span className="border-t border-border/60 pt-2">{executionA.httpRequestsCount || 0}</span>
              <span className="border-t border-border/60 pt-2">{executionB.httpRequestsCount || 0}</span>
            </div>
          </div>

          {/* Node Step Diff List */}
          <div className="flex flex-col gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-faint">
              Node Execution Step-by-Step Diff
            </h3>

            <div className="rounded-xl border border-border bg-surface overflow-hidden divide-y divide-border">
              {allNodeIds.map((nodeId) => {
                const nodeA = nodeMapA.get(nodeId);
                const nodeB = nodeMapB.get(nodeId);
                const label = nodeA?.nodeLabel || nodeB?.nodeLabel || nodeId;
                const isSelected = selectedNodeId === nodeId;

                const isDiff =
                  !nodeA ||
                  !nodeB ||
                  nodeA.status !== nodeB.status ||
                  JSON.stringify(nodeA.output) !== JSON.stringify(nodeB.output);

                return (
                  <div key={nodeId} className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => setSelectedNodeId(isSelected ? null : nodeId)}
                      className={`flex items-center justify-between p-3.5 text-left text-xs transition-colors hover:bg-canvas/50 ${
                        isSelected ? "bg-canvas" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-bold text-ink truncate">{label}</span>
                        <span className="text-[11px] font-mono text-ink-faint truncate">({nodeId})</span>
                        {isDiff && (
                          <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300">
                            Diff Detected
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-4 shrink-0 font-mono text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink-faint">A:</span>
                          {nodeA ? <StatusBadge status={nodeA.status} size="sm" /> : <span className="text-ink-faint">N/A</span>}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-ink-faint">B:</span>
                          {nodeB ? <StatusBadge status={nodeB.status} size="sm" /> : <span className="text-ink-faint">N/A</span>}
                        </div>
                      </div>
                    </button>

                    {/* Detailed Node JSON Side-by-Side Diff Drawer */}
                    {isSelected && (
                      <div className="p-4 bg-canvas border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-ink flex items-center justify-between">
                            Execution A Step Output
                            {nodeA?.duration != null && <span className="text-[11px] font-mono text-ink-faint">{nodeA.duration}ms</span>}
                          </span>
                          <pre className="p-3 bg-surface rounded-lg border border-border text-[10px] font-mono text-ink-soft overflow-x-auto max-h-48">
                            {nodeA ? JSON.stringify(nodeA.output || nodeA.error || {}, null, 2) : "Node did not execute in Run A"}
                          </pre>
                        </div>

                        <div className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-ink flex items-center justify-between">
                            Execution B Step Output
                            {nodeB?.duration != null && <span className="text-[11px] font-mono text-ink-faint">{nodeB.duration}ms</span>}
                          </span>
                          <pre className="p-3 bg-surface rounded-lg border border-border text-[10px] font-mono text-ink-soft overflow-x-auto max-h-48">
                            {nodeB ? JSON.stringify(nodeB.output || nodeB.error || {}, null, 2) : "Node did not execute in Run B"}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExecutionCard({ execution, label }: { execution: ExecutionComparisonItem; label: string }) {
  const source = execution.source || "manual";
  return (
    <div className="rounded-xl border border-border bg-canvas/40 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between border-b border-border/80 pb-2.5">
        <div>
          <span className="text-[11px] font-semibold text-accent-ink uppercase tracking-wider">{label}</span>
          <h4 className="text-sm font-bold text-ink flex items-center gap-1.5 mt-0.5">
            {execution.workflowName}
            <Badge variant="outline" className="text-[10px] font-mono">v{execution.versionNumber}</Badge>
          </h4>
        </div>
        <StatusBadge status={execution.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
        <div>
          <span className="text-[10px] text-ink-faint block font-sans">Execution ID</span>
          <span className="text-ink truncate block" title={execution.id}>{execution.id.slice(0, 14)}...</span>
        </div>
        <div>
          <span className="text-[10px] text-ink-faint block font-sans">Started At</span>
          <span className="text-ink block">{new Date(execution.startedAt).toLocaleTimeString()}</span>
        </div>
        <div>
          <span className="text-[10px] text-ink-faint block font-sans">Trigger Source</span>
          <span className="text-ink capitalize flex items-center gap-1">
            {source === "webhook" && <Globe className="h-3 w-3 text-accent-ink" />}
            {source === "manual" && <Zap className="h-3 w-3 text-amber-600" />}
            {source === "api" && <Code className="h-3 w-3 text-blue-600" />}
            {source === "schedule" && <Clock3 className="h-3 w-3 text-purple-600" />}
            {source === "template" && <FileText className="h-3 w-3 text-emerald-600" />}
            {source}
          </span>
        </div>
        <div>
          <span className="text-[10px] text-ink-faint block font-sans">Runtime Duration</span>
          <span className="text-ink font-bold">{execution.duration ?? 0}ms</span>
        </div>
      </div>

      {execution.error && (
        <div className="p-2 rounded bg-error/10 border border-error/30 text-error font-mono text-[11px] mt-1">
          {execution.error}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, size = "md" }: { status: string; size?: "sm" | "md" }) {
  const py = size === "sm" ? "py-0.5 px-1.5 text-[10px]" : "py-1 px-2.5 text-xs";
  return (
    <Badge
      variant={status === "success" ? "active" : status === "failed" ? "draft" : "outline"}
      className={`${py} capitalize gap-1 ${
        status === "failed" ? "bg-error/15 text-error border-error/30" : ""
      }`}
    >
      {status === "success" && <CheckCircle2 className="h-3 w-3" />}
      {status === "failed" && <XCircle className="h-3 w-3" />}
      {status === "running" && <Clock className="h-3 w-3 animate-spin" />}
      {status}
    </Badge>
  );
}
