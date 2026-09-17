"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, RefreshCw, Play, AlertCircle, RotateCcw, FastForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ExecutionResultTimeline,
  type TimelineNodeExecution,
} from "@/components/workflow/execution/execution-result-timeline";
import { NoriDebugger } from "@/lib/ai/nori-debugger";

interface NodeExecutionDetail {
  id: string;
  executionId: string;
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  nodeTypeTitle: string;
  status: "pending" | "running" | "success" | "failed" | "skipped" | "cancelled";
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  attempt: number;
}

interface ExecutionDetail {
  id: string;
  workflowId: string;
  workflowName: string;
  workflowVersionId: string;
  versionNumber: number;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  source?: "manual" | "webhook" | "schedule" | "api";
  startedAt: string;
  completedAt?: string | null;
  duration?: number | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  metadata?: Record<string, unknown> | null;
  nodeExecutions: NodeExecutionDetail[];
}

export default function ExecutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: executionId } = use(params);
  const router = useRouter();

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replaying, setReplaying] = useState(false);

  const loadData = async () => {
    try {
      const res = await fetch(`/api/executions/${executionId}`);
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Failed to load execution details");
      } else {
        setExecution(data.execution);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to load execution details");
    } fontinally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function init() {
      try {
        const res = await fetch(`/api/executions/${executionId}`);
        const data = await res.json();
        if (!ignore) {
          if (!res.ok) {
            setErrorMsg(data.error || "Failed to load execution details");
          } else {
            setExecution(data.execution);
          }
        }
      } catch (err: unknown) {
        if (!ignore) {
          setErrorMsg(err instanceof Error ? err.message : "Failed to load execution details");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    init();
    return () => {
      ignore = true;
    };
  }, [executionId]);

  const handleRefresh = () => {
    setLoading(true);
    loadData();
  };

  const handleReplay = async (fromNodeId?: string) => {
    setReplaying(true);
    try {
      const res = await fetch(`/api/executions/${executionId}/replay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromNodeId }),
      });
      const data = await res.json();
      if (res.ok && data.execution?.id) {
        router.push(`/executions/${data.execution.id}`);
      } else {
        alert(`Replay failed: ${data.error || "Unknown error"}`);
      }
    } catch (err: unknown) {
      alert(`Replay error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setReplaying(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-xs text-ink-faint gap-2">
        <RefreshCw className="h-4 w-4 animate-spin" />
        Loading execution details...
      </div>
    );
  }

  if (errorMsg || !execution) {
    return (
      <div className="flex flex-col gap-4 p-6 max-w-4xl mx-auto w-full">
        <Link
          href="/executions"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent-ink hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Executions
        </Link>
        <div className="rounded-xl border border-error/30 bg-error/10 p-4 text-xs text-error">
          <strong>Error:</strong> {errorMsg || "Execution not found."}
        </div>
      </div>
    );
  }

  const failedNode = execution.nodeExecutions?.find((n) => n.status === "failed");

  const timelineNodes: TimelineNodeExecution[] = (execution.nodeExecutions || []).map((ne) => ({
    id: ne.id,
    nodeId: ne.nodeId,
    nodeLabel: ne.nodeLabel,
    nodeType: ne.nodeType,
    nodeTypeTitle: ne.nodeTypeTitle,
    status: ne.status,
    startedAt: ne.startedAt,
    completedAt: ne.completedAt,
    duration: ne.duration,
    input: ne.input || execution.input,
    output: ne.output,
    error: ne.error,
    attempt: ne.attempt,
  }));

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 max-w-5xl mx-auto w-full">
      {/* Back & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/executions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-ink transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Execution History
        </Link>

        <div className="flex items-center gap-2">
          {failedNode && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleReplay(failedNode.nodeId)}
              disabled={replaying}
              className="text-xs gap-1.5 border-amber-500/30 text-amber-700 hover:bg-amber-50"
            >
              <FastForward className="h-3.5 w-3.5" />
              Partial Replay (from step: {failedNode.nodeLabel})
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleReplay()}
            disabled={replaying}
            className="text-xs gap-1.5 bg-accent text-accent-ink font-semibold"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${replaying ? "animate-spin" : ""}`} />
            {replaying ? "Replaying..." : "Full Workflow Replay"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="text-xs gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Title Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-ink">{execution.workflowName}</h1>
          <Badge variant="outline" className="text-[11px] font-mono">
            v{execution.versionNumber}
          </Badge>
          <Badge variant="outline" className="text-[11px] font-mono capitalize bg-canvas">
            Source: {execution.source || "manual"}
          </Badge>
        </div>
        <span className="text-xs font-mono text-ink-faint">
          Execution ID: {execution.id}
        </span>
      </div>

      {/* Nori Mascot Debug Assistant Banner (User Rule: Mascot Dialog Box BG #A7B3A1) */}
      {execution.status === "failed" && (() => {
        const analysis = NoriDebugger.analyzeExecutionFailure({
          status: execution.status,
          error: execution.error || undefined,
          nodeExecutions: execution.nodeExecutions?.map((ne) => ({
            nodeId: ne.nodeId,
            nodeName: ne.nodeLabel,
            status: ne.status,
            error: ne.error || undefined,
          })),
        });
        return (
          <div
            className="rounded-2xl p-4 shadow-sm flex items-start gap-3.5 border border-black/10"
            style={{ backgroundColor: "#A7B3A1" }}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white/40">
              <Image
                src="/mascot/warning.png"
                alt="Nori Debugger"
                fill
                className="object-contain p-0.5"
              />
            </div>
            <div className="flex flex-col text-slate-950 text-xs w-full">
              <span className="font-bold flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-4 w-4 text-amber-900" />
                Nori Debug Assistant — Failure Analysis
              </span>
              <p className="mt-1 text-slate-900 leading-relaxed font-semibold">
                {analysis.friendlySummary}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-800 font-mono">
                Root Cause: {analysis.rootCause}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {analysis.suggestedFixes.map((fix) => (
                  <Button
                    key={fix.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (fix.actionType === "reconnect_oauth" || fix.actionType === "update_api_key") {
                        router.push("/settings/connections");
                      } else {
                        handleReplay(failedNode?.nodeId);
                      }
                    }}
                    className="h-7 text-xs bg-white/90 hover:bg-white text-slate-900 border-black/20 font-bold gap-1 shadow-xs"
                  >
                    ✨ {fix.label}
                  </Button>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReplay(failedNode?.nodeId)}
                  disabled={replaying}
                  className="h-7 text-xs bg-slate-900 text-white hover:bg-slate-800 border-none font-semibold"
                >
                  <FastForward className="h-3 w-3 mr-1" />
                  Resume Execution
                </Button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Execution Result Timeline */}
      <ExecutionResultTimeline
        executionId={execution.id}
        status={execution.status}
        source={execution.source}
        versionNumber={execution.versionNumber}
        duration={execution.duration}
        startedAt={execution.startedAt}
        completedAt={execution.completedAt}
        error={execution.error}
        parentExecutionId={execution.metadata?.replayedFromExecutionId as string | undefined}
        nodeExecutions={timelineNodes}
        onRetry={() => handleReplay()}
        isRetrying={replaying}
      />
    </div>
  );
}
