"use client";

import { useEffect, useRef, useState } from "react";
import { Play, AlertCircle, Ban, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import type { WorkflowExecutionRecord } from "@/lib/execution/types";
import { ExecutionResultTimeline, type TimelineNodeExecution } from "./execution-result-timeline";
import { Mascot } from "@/components/mascot/mascot";

interface TestExecutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TestExecutionDialog({ open, onOpenChange }: TestExecutionDialogProps) {
  const workflowId = useEditorStore((s) => s.workflowId);
  const saveWorkflow = useEditorStore((s) => s.saveWorkflow);
  const editorNodes = useEditorStore((s) => s.nodes);
  const toast = useToastStore((s) => s.toast);

  const [inputJson, setInputJson] = useState<string>(
    JSON.stringify({ lead: { score: 95, name: "Raj" } }, null, 2),
  );
  const [executing, setExecuting] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [executionResult, setExecutionResult] = useState<WorkflowExecutionRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => stopPolling();
  }, []);

  if (!open) return null;

  const handleRunExecution = async () => {
    if (!workflowId) return;

    // Save workflow to backend first if dirty
    saveWorkflow();

    setExecuting(true);
    setErrorMsg(null);
    setExecutionResult(null);
    setCurrentExecutionId(null);
    stopPolling();

    let parsedInput: Record<string, unknown> = {};
    try {
      if (inputJson.trim()) {
        parsedInput = JSON.parse(inputJson);
      }
    } catch {
      setErrorMsg("Invalid JSON input syntax");
      setExecuting(false);
      return;
    }

    try {
      const res = await fetch(`/api/workflows/${workflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: parsedInput }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "Execution failed to queue");
        toast("Execution failed to queue", { tone: "error" });
        setExecuting(false);
        return;
      }

      const execRecord: WorkflowExecutionRecord = data.execution;
      setExecutionResult(execRecord);
      setCurrentExecutionId(execRecord.id);
      toast(`Execution queued (${execRecord.id.slice(0, 10)})`);

      // Start polling for real-time background execution updates
      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/executions/${execRecord.id}`);
          if (!pollRes.ok) return;
          const pollData = await pollRes.json();
          if (pollData.execution) {
            const updated: WorkflowExecutionRecord = pollData.execution;
            setExecutionResult(updated);

            if (
              updated.status === "success" ||
              updated.status === "failed" ||
              updated.status === "cancelled"
            ) {
              stopPolling();
              setExecuting(false);
              toast(`Execution finished: ${updated.status}`);
            }
          }
        } catch {
          // Ignore transient polling fetch errors
        }
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution request failed";
      setErrorMsg(msg);
      toast("Execution request failed", { tone: "error" });
      setExecuting(false);
    }
  };

  const handleCancelExecution = async () => {
    if (!currentExecutionId) return;
    try {
      const res = await fetch(`/api/executions/${currentExecutionId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        stopPolling();
        setExecuting(false);
        toast("Execution cancelled");
        if (executionResult) {
          setExecutionResult({ ...executionResult, status: "cancelled" });
        }
      }
    } catch {
      toast("Failed to cancel execution", { tone: "error" });
    }
  };

  // Convert nodeExecutions into TimelineNodeExecution format
  const timelineNodeExecutions: TimelineNodeExecution[] = (executionResult?.nodeExecutions || []).map((ne) => {
    const matchNode = editorNodes.find((n) => n.id === ne.nodeId);
    return {
      id: ne.id,
      nodeId: ne.nodeId,
      nodeLabel: matchNode?.data?.label || ne.nodeId,
      nodeType: ne.nodeType,
      status: ne.status,
      duration: ne.duration,
      input: ne.input || (executionResult?.input as Record<string, unknown>),
      output: ne.output,
      error: ne.error,
      attempt: ne.attempt,
    };
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Play className="h-4 w-4 text-accent-ink fill-accent-ink" />
            <h2 className="text-sm font-semibold text-ink">Test Workflow Execution (Async Queue)</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              stopPolling();
              onOpenChange(false);
            }}
            className="text-ink-faint hover:text-ink text-xs font-medium"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* Nori Execution Status Feedback Card */}
          <div className="flex items-center gap-4 p-3 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <Mascot
              mood={
                executing
                  ? "working"
                  : executionResult?.status === "success"
                  ? "celebrating"
                  : executionResult?.status === "failed" || errorMsg
                  ? "warning"
                  : "default"
              }
              size="sm"
              animate={executing}
            />
            <div className="flex-1 text-xs">
              <span className="font-semibold text-zinc-100 block">
                {executing
                  ? "Nori is running nodes..."
                  : executionResult?.status === "success"
                  ? "Execution Successful! 🎉"
                  : executionResult?.status === "failed" || errorMsg
                  ? "Execution Needs Attention"
                  : "Ready for Test Execution"}
              </span>
              <span className="text-zinc-400 text-[11px] block mt-0.5">
                {executing
                  ? "Monitoring node inputs, outputs, and queue execution in real time."
                  : executionResult?.status === "success"
                  ? `Completed in ${executionResult.duration || 0}ms across ${timelineNodeExecutions.length} step(s).`
                  : executionResult?.status === "failed" || errorMsg
                  ? "Check error messages below to refine node config."
                  : "Enter optional trigger payload JSON below and click Enqueue & Run."}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-ink">Execution Input JSON (Optional)</Label>
            <Textarea
              value={inputJson}
              onChange={(e) => setInputJson(e.target.value)}
              className="font-mono text-xs h-20 bg-canvas"
              placeholder='{ "key": "value" }'
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              onClick={handleRunExecution}
              disabled={executing}
              className="flex-1 h-9 text-xs"
            >
              {executing ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Processing Execution Queue...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Enqueue & Run Execution
                </span>
              )}
            </Button>

            {executing && (
              <Button
                variant="outline"
                onClick={handleCancelExecution}
                className="h-9 text-xs border-error/30 text-error hover:bg-error/10"
              >
                <Ban className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
            )}
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <strong className="font-semibold block">Execution Error:</strong>
                <span className="font-mono">{errorMsg}</span>
              </div>
            </div>
          )}

          {executionResult && (
            <ExecutionResultTimeline
              status={executionResult.status}
              duration={executionResult.duration}
              startedAt={executionResult.startedAt}
              completedAt={executionResult.completedAt}
              error={executionResult.error}
              nodeExecutions={timelineNodeExecutions}
            />
          )}
        </div>
      </div>
    </div>
  );
}
