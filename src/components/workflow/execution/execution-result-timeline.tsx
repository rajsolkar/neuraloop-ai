"use client";

import { useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Ban,
  GitBranch,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  AlertTriangle,
  MinusCircle,
  Globe,
  Mail,
  MessageSquare,
  Bot,
  Filter,
  Zap,
  Code,
  Clock3,
  FileText,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TimelineNodeExecution {
  id: string;
  nodeId: string;
  nodeLabel?: string;
  nodeType: string;
  nodeTypeTitle?: string;
  status: "pending" | "running" | "success" | "failed" | "skipped" | "cancelled";
  duration?: number | null;
  startedAt?: string;
  completedAt?: string | null;
  input?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
  error?: string | null;
  attempt?: number;
}

export interface TimelineExecutionProps {
  executionId?: string;
  status: "queued" | "running" | "success" | "failed" | "cancelled";
  source?: string;
  versionNumber?: number;
  duration?: number | null;
  startedAt?: string;
  completedAt?: string | null;
  error?: string | null;
  parentExecutionId?: string | null;
  retryCount?: number;
  nodeExecutions?: TimelineNodeExecution[];
  onCancel?: () => void;
  onRetry?: () => void;
  isRetrying?: boolean;
  isCancelling?: boolean;
}

const NODE_TYPE_TITLES: Record<string, string> = {
  "manual-trigger": "Manual Trigger",
  webhook: "Webhook Trigger",
  schedule: "Schedule Trigger",
  "http-request": "HTTP Request",
  openai: "OpenAI LLM",
  slack: "Slack Notification",
  email: "Email Notification",
  code: "Code Executor",
  "webhook-response": "Webhook Response",
  if: "IF Condition",
  filter: "Filter Data",
  "set-variable": "Set Variable",
  delay: "Delay Execution",
};

export function ExecutionResultTimeline({
  executionId,
  status,
  source = "manual",
  versionNumber,
  duration,
  startedAt,
  error,
  parentExecutionId,
  retryCount,
  nodeExecutions = [],
  onCancel,
  onRetry,
  isRetrying = false,
  isCancelling = false,
}: TimelineExecutionProps) {
  const [openRawJson, setOpenRawJson] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const toggleRawJson = (id: string) => {
    setOpenRawJson((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Metrics summary calculations
  const totalExecuted = nodeExecutions.length;
  const totalSuccess = nodeExecutions.filter((n) => n.status === "success").length;
  const totalFailed = nodeExecutions.filter((n) => n.status === "failed").length;
  const totalSkipped = nodeExecutions.filter((n) => n.status === "skipped").length;

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Redesigned Execution Summary Header Card */}
      <div className="rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-xs flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-2.5">
            {status === "success" && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-4 w-4" />
              </span>
            )}
            {status === "failed" && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-error/15 text-error">
                <XCircle className="h-4 w-4" />
              </span>
            )}
            {status === "queued" && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
                <Clock className="h-4 w-4 animate-pulse" />
              </span>
            )}
            {status === "running" && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/15 text-blue-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
              </span>
            )}
            {status === "cancelled" && (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink/15 text-ink">
                <Ban className="h-4 w-4" />
              </span>
            )}

            <div className="flex flex-col">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-ink">
                  {status === "success" && "Execution Successful"}
                  {status === "failed" && "Execution Failed"}
                  {status === "queued" && "Execution Queued in BullMQ"}
                  {status === "running" && "Execution Running Worker..."}
                  {status === "cancelled" && "Execution Cancelled"}
                </h3>
                {versionNumber && (
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Executed Version: v{versionNumber}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-mono capitalize bg-canvas gap-1">
                  {source === "webhook" && <Globe className="h-3 w-3 text-accent-ink" />}
                  {source === "manual" && <Zap className="h-3 w-3 text-amber-600" />}
                  {source === "api" && <Code className="h-3 w-3 text-blue-600" />}
                  {source === "schedule" && <Clock3 className="h-3 w-3 text-purple-600" />}
                  {source === "template" && <FileText className="h-3 w-3 text-emerald-600" />}
                  Source: {source}
                </Badge>
                {parentExecutionId && (
                  <Badge variant="outline" className="text-[10px] font-mono bg-purple-500/10 text-purple-600 border-purple-300">
                    Replayed from: {parentExecutionId.slice(0, 12)}
                  </Badge>
                )}
                {retryCount && retryCount > 0 ? (
                  <Badge variant="outline" className="text-[10px] font-mono bg-amber-500/10 text-amber-600 border-amber-300">
                    Retry #{retryCount}
                  </Badge>
                ) : null}
              </div>
              <span className="text-[11px] text-ink-faint mt-0.5">
                {startedAt ? `Started ${new Date(startedAt).toLocaleString()}` : "Pending execution"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant={
                status === "success"
                  ? "active"
                  : status === "failed"
                  ? "draft"
                  : "outline"
              }
              className={`text-xs capitalize ${
                status === "failed" ? "bg-error/15 text-error border-error/30" : ""
              }`}
            >
              {status}
            </Badge>

            {(status === "running" || status === "queued") && onCancel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                disabled={isCancelling}
                className="h-7 text-xs border-error/30 text-error hover:bg-error/10"
              >
                <Ban className="h-3 w-3 mr-1" />
                {isCancelling ? "Cancelling..." : "Cancel"}
              </Button>
            )}

            {(status === "failed" || status === "success" || status === "cancelled") && onRetry && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRetry}
                disabled={isRetrying}
                className="h-7 text-xs border-accent/40 text-accent-ink hover:bg-accent/10"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${isRetrying ? "animate-spin" : ""}`} />
                {isRetrying ? "Replaying..." : "Replay / Retry"}
              </Button>
            )}
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="flex flex-col rounded-lg bg-canvas p-2.5 border border-border/70">
            <span className="text-[11px] text-ink-faint font-medium">Total Duration</span>
            <span className="font-bold text-ink font-mono text-sm mt-0.5">
              {duration !== null && duration !== undefined ? `${duration}ms` : "In progress"}
            </span>
          </div>

          <div className="flex flex-col rounded-lg bg-canvas p-2.5 border border-border/70">
            <span className="text-[11px] text-ink-faint font-medium">Nodes Executed</span>
            <span className="font-bold text-ink font-mono text-sm mt-0.5">{totalExecuted} nodes</span>
          </div>

          <div className="flex flex-col rounded-lg bg-canvas p-2.5 border border-border/70">
            <span className="text-[11px] text-ink-faint font-medium">Successful / Skipped</span>
            <span className="font-bold text-success font-mono text-sm mt-0.5">
              {totalSuccess} <span className="text-ink-faint font-normal text-xs">/ {totalSkipped} skipped</span>
            </span>
          </div>

          <div className="flex flex-col rounded-lg bg-canvas p-2.5 border border-border/70">
            <span className="text-[11px] text-ink-faint font-medium">Failed Steps</span>
            <span className={`font-bold font-mono text-sm mt-0.5 ${totalFailed > 0 ? "text-error" : "text-ink"}`}>
              {totalFailed} failed
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error font-mono flex items-start gap-2.5 mt-1">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Workflow Error Reason:</strong>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Vertical Timeline Execution Report */}
      <div className="flex flex-col gap-3">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wider text-ink-faint">
          Execution Timeline Report
        </h3>

        {nodeExecutions.length === 0 ? (
          <div className="p-6 text-center text-xs text-ink-faint border border-dashed border-border rounded-xl">
            Waiting for worker to process workflow steps...
          </div>
        ) : (
          <div className="flex flex-col">
            {nodeExecutions.map((ne, idx) => {
              const isLast = idx === nodeExecutions.length - 1;
              const displayLabel = ne.nodeLabel || NODE_TYPE_TITLES[ne.nodeType] || ne.nodeId;
              const typeTitle = ne.nodeTypeTitle || NODE_TYPE_TITLES[ne.nodeType] || ne.nodeType;
              const showRawJson = Boolean(openRawJson[ne.id]);

              return (
                <div key={ne.id} className="relative flex gap-3 pb-6 last:pb-0">
                  {/* Vertical Connector Line */}
                  {!isLast && (
                    <span
                      className="absolute left-3.5 top-8 -bottom-2 w-0.5 bg-border/80"
                      aria-hidden="true"
                    />
                  )}

                  {/* Icon Node Step Indicator */}
                  <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface border border-border shadow-2xs">
                    {ne.status === "success" && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {ne.status === "failed" && <XCircle className="h-4 w-4 text-error" />}
                    {ne.status === "skipped" && <MinusCircle className="h-4 w-4 text-ink-faint" />}
                    {ne.status === "running" && <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />}
                    {ne.status === "pending" && <Clock className="h-4 w-4 text-amber-500" />}
                  </div>

                  {/* Node Report Card */}
                  <div className="flex flex-1 flex-col rounded-xl border border-border bg-surface shadow-2xs overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between p-3.5 bg-canvas/40 border-b border-border/80">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-ink">{displayLabel}</span>
                        <span className="text-[11px] font-mono text-ink-faint">({typeTitle})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {ne.status === "skipped" ? (
                          <Badge variant="draft" className="text-[10px] bg-ink/10 text-ink-faint border-border">
                            ⊝ Skipped
                          </Badge>
                        ) : (
                          <Badge
                            variant={ne.status === "success" ? "active" : "draft"}
                            className={`text-[10px] ${ne.status === "failed" ? "bg-error/15 text-error border-error/30" : ""}`}
                          >
                            {ne.status}
                          </Badge>
                        )}

                        {ne.duration !== null && ne.duration !== undefined && (
                          <span className="text-xs text-ink-faint font-mono flex items-center gap-1">
                            <Clock className="h-3 w-3 text-ink-faint" />
                            {ne.duration}ms
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Human-Readable Summary Section */}
                    <div className="p-3.5 flex flex-col gap-3">
                      <HumanReadableNodeSummary nodeExec={ne} />

                      {/* Expandable Raw JSON Section (Collapsed by Default) */}
                      <div className="border-t border-border/70 pt-2.5 mt-1">
                        <button
                          type="button"
                          onClick={() => toggleRawJson(ne.id)}
                          className="text-[11px] font-semibold text-ink-faint hover:text-ink flex items-center gap-1 transition-colors"
                        >
                          {showRawJson ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                          {showRawJson ? "Hide Raw Input & Output JSON" : "View Raw Output (JSON)"}
                        </button>

                        {showRawJson && (
                          <div className="mt-2.5 flex flex-col gap-3 bg-canvas p-3 rounded-lg border border-border">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-ink">
                                <span>Raw Input JSON</span>
                                {ne.input && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(JSON.stringify(ne.input, null, 2), `in-${ne.id}`)}
                                    className="text-[10px] text-ink-faint hover:text-ink flex items-center gap-1"
                                  >
                                    {copiedKey === `in-${ne.id}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                                    Copy
                                  </button>
                                )}
                              </div>
                              <pre className="max-h-36 overflow-y-auto rounded bg-surface p-2 font-mono text-[10px] text-ink-soft border border-border">
                                {JSON.stringify(ne.input || {}, null, 2)}
                              </pre>
                            </div>

                            <div className="flex flex-col gap-1">
                              <div className="flex items-center justify-between text-[11px] font-semibold text-ink">
                                <span>Raw Output JSON</span>
                                {ne.output && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopy(JSON.stringify(ne.output, null, 2), `out-${ne.id}`)}
                                    className="text-[10px] text-ink-faint hover:text-ink flex items-center gap-1"
                                  >
                                    {copiedKey === `out-${ne.id}` ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                                    Copy
                                  </button>
                                )}
                              </div>
                              <pre className="max-h-36 overflow-y-auto rounded bg-surface p-2 font-mono text-[10px] text-ink-soft border border-border">
                                {JSON.stringify(ne.output || {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
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

/**
 * Renders human-readable non-technical step summary cards for each node definition type
 */
function HumanReadableNodeSummary({ nodeExec }: { nodeExec: TimelineNodeExecution }) {
  const { nodeType, status, output, error, input } = nodeExec;

  if (status === "skipped") {
    return (
      <div className="rounded-lg border border-border/80 bg-canvas/40 p-3 text-xs text-ink-faint flex items-center gap-2">
        <MinusCircle className="h-4 w-4 text-ink-faint shrink-0" />
        <span>This node was skipped because the condition branch was not taken.</span>
      </div>
    );
  }

  // 1. IF CONDITION NODE
  if (nodeType === "if" && output) {
    const isResultTrue = Boolean(output.result);
    const branch = String(output.selectedBranch || (isResultTrue ? "true" : "false"));

    return (
      <div className="rounded-lg border border-accent/30 bg-accent/5 p-3.5 flex flex-col gap-3">
        <div className="flex items-center justify-between border-b border-accent/20 pb-2">
          <span className="text-xs font-bold text-ink flex items-center gap-1.5">
            <GitBranch className="h-4 w-4 text-accent-ink" />
            Condition Evaluation
          </span>
          <div className="flex items-center gap-2">
            <Badge
              variant={isResultTrue ? "active" : "draft"}
              className={isResultTrue ? "bg-success/20 text-success border-success/40" : "bg-error/20 text-error border-error/40"}
            >
              Result: {isResultTrue ? "TRUE" : "FALSE"}
            </Badge>
            <Badge variant="outline" className="font-mono text-[10px]">
              Selected Path: {branch === "true" ? "TRUE PATH" : "FALSE PATH"}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono bg-surface p-2.5 rounded border border-border">
          <div>
            <span className="text-ink-faint block text-[10px]">Condition</span>
            <span className="font-bold text-ink">
              {String(output.fieldPath || "score")} {String(output.operator || ">")} {String(output.targetValue || "80")}
            </span>
          </div>
          <div>
            <span className="text-ink-faint block text-[10px]">Actual Value</span>
            <span className="font-bold text-accent-ink">{String(output.actualValue ?? "N/A")}</span>
          </div>
          <div>
            <span className="text-ink-faint block text-[10px]">Expected / Target</span>
            <span className="font-bold text-ink">{String(output.targetValue ?? "N/A")}</span>
          </div>
          <div>
            <span className="text-ink-faint block text-[10px]">Branch Taken</span>
            <span className="font-bold text-success">{branch === "true" ? "TRUE Branch" : "FALSE Branch"}</span>
          </div>
        </div>
      </div>
    );
  }

  // 2. HTTP REQUEST NODE
  if (nodeType === "http-request") {
    const url = String(input?.url || output?.url || "https://api.example.com");
    const method = String(input?.method || output?.method || "GET");
    const statusCode = String(output?.status || output?.statusCode || "200");

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <div className="flex items-center justify-between font-mono">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Globe className="h-4 w-4 text-accent-ink" />
            {method} {url}
          </span>
          <Badge variant={status === "success" ? "active" : "draft"}>
            Status: {statusCode} OK
          </Badge>
        </div>

        {error && (
          <div className="text-error font-mono text-[11px] mt-1">
            <strong>HTTP Failure Reason:</strong> {error}
          </div>
        )}
      </div>
    );
  }

  // 3. SLACK NOTIFICATION NODE
  if (nodeType === "slack") {
    const channel = String(input?.channel || "#general");
    const message = String(input?.text || input?.message || "Lead notification message");

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-accent-ink" />
            Channel: {channel}
          </span>
          <Badge variant={status === "success" ? "active" : "draft"} className={status === "failed" ? "bg-error/15 text-error border-error/30" : ""}>
            {status === "success" ? "Sent" : "Failed"}
          </Badge>
        </div>

        <div className="text-ink-soft bg-surface p-2 rounded border border-border font-sans text-xs">
          <strong>Message Preview:</strong> {message}
        </div>

        {error && (
          <div className="text-error font-mono text-[11px] mt-1">
            <strong>Reason:</strong> {error}
          </div>
        )}
      </div>
    );
  }

  // 4. EMAIL NOTIFICATION NODE
  if (nodeType === "email") {
    const recipient = String(input?.to || "sales@example.com");
    const subject = String(input?.subject || "Workflow Notification");

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Mail className="h-4 w-4 text-accent-ink" />
            To: {recipient}
          </span>
          <Badge variant={status === "success" ? "active" : "draft"} className={status === "failed" ? "bg-error/15 text-error border-error/30" : ""}>
            {status === "success" ? "Sent" : "Failed"}
          </Badge>
        </div>

        <div className="text-ink-soft bg-surface p-2 rounded border border-border text-xs">
          <strong>Subject:</strong> {subject}
        </div>

        {error && (
          <div className="text-error font-mono text-[11px] mt-1">
            <strong>Reason:</strong> {error}
          </div>
        )}
      </div>
    );
  }

  // 5. DELAY NODE
  if (nodeType === "delay") {
    const duration = String(input?.duration || 5);
    const unit = String(input?.unit || "seconds");

    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <span className="font-bold text-ink flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-accent-ink" />
          Wait Time: {duration} {unit}
        </span>
        <Badge variant="active">Completed Successfully</Badge>
      </div>
    );
  }

  // 6. OPENAI LLM NODE
  if (nodeType === "openai") {
    const model = String(input?.model || "gpt-4o-mini");
    const promptStr = String(input?.prompt || "Summarize data");

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Bot className="h-4 w-4 text-accent-ink" />
            Model: {model}
          </span>
          <Badge variant={status === "success" ? "active" : "draft"}>
            {status === "success" ? "Generated" : "Failed"}
          </Badge>
        </div>
        <div className="text-ink-soft bg-surface p-2 rounded border border-border text-xs">
          <strong>Prompt:</strong> {promptStr}
        </div>
      </div>
    );
  }

  // 7. FILTER NODE
  if (nodeType === "filter") {
    const fieldPath = String(input?.fieldPath || output?.fieldPath || "data");

    return (
      <div className="flex items-center justify-between rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <span className="font-bold text-ink flex items-center gap-1.5">
          <Filter className="h-4 w-4 text-accent-ink" />
          Filter Condition: {fieldPath}
        </span>
        <Badge variant="active">Passed</Badge>
      </div>
    );
  }

  // 8. WEBHOOK & TRIGGER NODES
  if (nodeType === "webhook" || nodeType === "manual-trigger" || nodeType === "schedule") {
    const leadData = (input?.lead as Record<string, unknown>) || input || {};
    const hasDataKeys = Object.keys(leadData).length > 0;

    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/60 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-bold text-ink flex items-center gap-1.5">
            <Zap className="h-4 w-4 text-accent-ink" />
            Trigger Received Payload
          </span>
          <Badge variant="active">Received</Badge>
        </div>

        {hasDataKeys ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 bg-surface p-2.5 rounded border border-border font-mono text-xs">
            {Object.entries(leadData).slice(0, 6).map(([k, v]) => (
              <div key={k}>
                <span className="text-ink-faint text-[10px] block">{k}</span>
                <span className="font-semibold text-ink">{typeof v === "object" ? JSON.stringify(v) : String(v)}</span>
              </div>
            ))}
          </div>
        ) : (
          <span className="text-ink-faint text-xs">No input payload provided</span>
        )}
      </div>
    );
  }

  // Default Fallback
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-ink">Execution Completed</span>
      {error && <span className="text-error font-mono text-[11px]">{error}</span>}
    </div>
  );
}
