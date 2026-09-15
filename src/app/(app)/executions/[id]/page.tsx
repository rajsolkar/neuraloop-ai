"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExecutionResultTimeline, type TimelineNodeExecution } from "@/components/workflow/execution/execution-result-timeline";

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

  const [execution, setExecution] = useState<ExecutionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
    } finally {
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
      {/* Back & Workflow Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/executions"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-faint hover:text-ink transition-colors w-fit"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Execution History
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="text-xs gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh Details
        </Button>
      </div>

      {/* Page Title */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-ink">{execution.workflowName}</h1>
          <Badge variant="outline" className="text-[11px] font-mono">
            v{execution.versionNumber}
          </Badge>
        </div>
        <span className="text-xs font-mono text-ink-faint">
          Execution ID: {execution.id}
        </span>
      </div>

      {/* Redesigned Timeline Execution View */}
      <ExecutionResultTimeline
        status={execution.status}
        source={execution.source}
        versionNumber={execution.versionNumber}
        duration={execution.duration}
        startedAt={execution.startedAt}
        completedAt={execution.completedAt}
        error={execution.error}
        nodeExecutions={timelineNodes}
      />
    </div>
  );
}
