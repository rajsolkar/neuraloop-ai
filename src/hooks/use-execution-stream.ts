"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { TimelineNodeExecution } from "@/components/workflow/execution/execution-result-timeline";

export interface StreamExecutionData {
  id: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  source?: string;
  versionNumber?: number;
  duration?: number | null;
  startedAt?: string;
  completedAt?: string | null;
  error?: string | null;
  parentExecutionId?: string | null;
  retryCount?: number;
  nodeExecutions: TimelineNodeExecution[];
}

export interface UseExecutionStreamOptions {
  onUpdate?: (data: StreamExecutionData) => void;
  onComplete?: (data: StreamExecutionData) => void;
}

export function useExecutionStream(
  executionId: string | null,
  options: UseExecutionStreamOptions = {},
) {
  const [execution, setExecution] = useState<StreamExecutionData | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [streamError, setStreamError] = useState<string | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const retryCountRef = useRef<number>(0);

  const stopStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Action: Cancel execution
  const cancelExecution = useCallback(async () => {
    if (!executionId) return false;
    try {
      const res = await fetch(`/api/executions/${executionId}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        stopStream();
        setExecution((prev) => {
          if (!prev) return null;
          const updated: StreamExecutionData = {
            ...prev,
            status: "cancelled",
            nodeExecutions: prev.nodeExecutions.map((n) =>
              n.status === "running" || n.status === "pending"
                ? { ...n, status: "cancelled" as const }
                : n,
            ),
          };
          options.onUpdate?.(updated);
          options.onComplete?.(updated);
          return updated;
        });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [executionId, stopStream, options]);

  // Action: Replay/Retry execution
  const retryExecution = useCallback(async () => {
    if (!executionId) return null;
    try {
      const res = await fetch(`/api/executions/${executionId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to retry execution");
      }
      const data = await res.json();
      return data.execution as {
        id: string;
        parentExecutionId: string;
        retryCount: number;
        status: string;
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(msg);
    }
  }, [executionId]);

  // Setup EventSource or Polling fallback
  useEffect(() => {
    if (!executionId) {
      stopStream();
      setExecution(null);
      setStreamError(null);
      return;
    }

    stopStream();
    setIsStreaming(true);
    setStreamError(null);

    const streamUrl = `/api/executions/${executionId}/stream`;

    // Polling fallback helper
    const startPollingFallback = () => {
      stopStream();
      setIsStreaming(false);

      const fetchStatus = async () => {
        try {
          const res = await fetch(`/api/executions/${executionId}`);
          if (!res.ok) return;
          const data = await res.json();
          if (data.execution) {
            const exec = data.execution;
            const formatted: StreamExecutionData = {
              id: exec.id,
              status: exec.status,
              source: exec.source,
              versionNumber: exec.versionNumber,
              duration: exec.duration,
              startedAt: exec.startedAt,
              completedAt: exec.completedAt,
              error: exec.error,
              parentExecutionId: exec.parentExecutionId,
              retryCount: exec.retryCount,
              nodeExecutions: (exec.nodeExecutions || []).map((ne: any) => ({
                id: ne.id,
                nodeId: ne.nodeId,
                nodeType: ne.nodeType,
                status: ne.status,
                duration: ne.duration,
                startedAt: ne.startedAt,
                completedAt: ne.completedAt,
                input: ne.input,
                output: ne.output,
                error: ne.error,
                attempt: ne.attempt,
              })),
            };

            setExecution(formatted);
            options.onUpdate?.(formatted);

            if (["success", "failed", "cancelled"].includes(formatted.status)) {
              if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
              }
              options.onComplete?.(formatted);
            }
          }
        } catch {
          // Ignore transient poll fetch errors
        }
      };

      fetchStatus();
      pollIntervalRef.current = setInterval(fetchStatus, 1000);
    };

    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        const es = new EventSource(streamUrl);
        eventSourceRef.current = es;

        es.addEventListener("execution_status", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            const formatted: StreamExecutionData = {
              id: payload.id,
              status: payload.status,
              source: payload.source,
              versionNumber: payload.versionNumber,
              duration: payload.duration,
              startedAt: payload.startedAt,
              completedAt: payload.completedAt,
              error: payload.error,
              parentExecutionId: payload.parentExecutionId,
              retryCount: payload.retryCount,
              nodeExecutions: (payload.nodeExecutions || []).map((ne: any) => ({
                id: ne.id,
                nodeId: ne.nodeId,
                nodeType: ne.nodeType,
                status: ne.status,
                duration: ne.duration,
                startedAt: ne.startedAt,
                completedAt: ne.completedAt,
                input: ne.input,
                output: ne.output,
                error: ne.error,
                attempt: ne.attempt,
              })),
            };

            setExecution(formatted);
            options.onUpdate?.(formatted);
          } catch (err) {
            console.warn("Failed to parse SSE execution_status:", err);
          }
        });

        es.addEventListener("node_started", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            setExecution((prev) => {
              if (!prev) return null;
              const existingIdx = prev.nodeExecutions.findIndex(
                (n) => n.nodeId === payload.nodeId,
              );
              let updatedNodes = [...prev.nodeExecutions];
              if (existingIdx >= 0) {
                updatedNodes[existingIdx] = {
                  ...updatedNodes[existingIdx],
                  status: "running",
                  startedAt: payload.startedAt,
                  attempt: payload.attempt,
                };
              } else {
                updatedNodes.push({
                  id: `ne-${payload.nodeId}`,
                  nodeId: payload.nodeId,
                  nodeType: payload.nodeType || "unknown",
                  status: "running",
                  startedAt: payload.startedAt,
                  attempt: payload.attempt,
                });
              }
              const updated = { ...prev, status: "running" as const, nodeExecutions: updatedNodes };
              options.onUpdate?.(updated);
              return updated;
            });
          } catch (err) {
            console.warn("Failed to parse SSE node_started:", err);
          }
        });

        es.addEventListener("node_completed", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            setExecution((prev) => {
              if (!prev) return null;
              const updatedNodes = prev.nodeExecutions.map((n) =>
                n.nodeId === payload.nodeId
                  ? {
                      ...n,
                      status: "success" as const,
                      completedAt: payload.completedAt,
                      duration: payload.durationMs,
                      output: payload.output,
                      attempt: payload.attempt,
                    }
                  : n,
              );
              const updated = { ...prev, nodeExecutions: updatedNodes };
              options.onUpdate?.(updated);
              return updated;
            });
          } catch (err) {
            console.warn("Failed to parse SSE node_completed:", err);
          }
        });

        es.addEventListener("node_failed", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            setExecution((prev) => {
              if (!prev) return null;
              const updatedNodes = prev.nodeExecutions.map((n) =>
                n.nodeId === payload.nodeId
                  ? {
                      ...n,
                      status: "failed" as const,
                      completedAt: payload.completedAt,
                      duration: payload.durationMs,
                      error: payload.error,
                      attempt: payload.attempt,
                    }
                  : n,
              );
              const updated = { ...prev, nodeExecutions: updatedNodes };
              options.onUpdate?.(updated);
              return updated;
            });
          } catch (err) {
            console.warn("Failed to parse SSE node_failed:", err);
          }
        });

        es.addEventListener("workflow_cancelled", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            setExecution((prev) => {
              if (!prev) return null;
              const updated: StreamExecutionData = {
                ...prev,
                status: "cancelled",
                completedAt: payload.cancelledAt,
                error: payload.reason,
                nodeExecutions: prev.nodeExecutions.map((n) =>
                  n.status === "running" || n.status === "pending"
                    ? { ...n, status: "cancelled" as const }
                    : n,
                ),
              };
              options.onUpdate?.(updated);
              options.onComplete?.(updated);
              return updated;
            });
            stopStream();
          } catch (err) {
            console.warn("Failed to parse SSE workflow_cancelled:", err);
          }
        });

        es.addEventListener("execution_complete", (event: MessageEvent) => {
          try {
            const payload = JSON.parse(event.data);
            setExecution((prev) => {
              if (!prev) return null;
              const updated: StreamExecutionData = {
                ...prev,
                status: payload.status,
                duration: payload.durationMs,
                completedAt: payload.completedAt,
                error: payload.error,
              };
              options.onUpdate?.(updated);
              options.onComplete?.(updated);
              return updated;
            });
            stopStream();
          } catch (err) {
            console.warn("Failed to parse SSE execution_complete:", err);
          }
        });

        es.onerror = () => {
          retryCountRef.current += 1;
          if (retryCountRef.current > 3) {
            console.warn("EventSource max retries exceeded, falling back to polling.");
            setStreamError("SSE connection lost. Switched to adaptive polling fallback.");
            startPollingFallback();
          }
        };
      } catch {
        startPollingFallback();
      }
    } else {
      startPollingFallback();
    }

    return () => {
      stopStream();
    };
  }, [executionId, stopStream]);

  return {
    execution,
    isStreaming,
    streamError,
    cancelExecution,
    retryExecution,
  };
}
