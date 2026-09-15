"use client";

import { useState } from "react";
import { Rocket, Check, X, AlertTriangle, RefreshCw, ShieldCheck, Zap, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import { validateWorkflowForPublish } from "@/lib/workflow/publish-validation";

interface PublishModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPublishedSuccess?: () => void;
}

export function PublishModal({ open, onOpenChange, onPublishedSuccess }: PublishModalProps) {
  const workflowId = useEditorStore((s) => s.workflowId);
  const name = useEditorStore((s) => s.name);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const saveWorkflowAsync = useEditorStore((s) => s.saveWorkflowAsync);
  const loadWorkflow = useEditorStore((s) => s.loadWorkflow);
  const toast = useToastStore((s) => s.toast);

  const [publishing, setPublishing] = useState(false);
  const [activateImmediately, setActivateImmediately] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  // Run graph publish validation
  const validation = validateWorkflowForPublish({ nodes, edges });

  const handlePublish = async () => {
    if (!workflowId || publishing) return;

    if (!validation.valid) {
      setErrorMsg("Please fix validation errors before publishing.");
      return;
    }

    setPublishing(true);
    setErrorMsg(null);

    try {
      // Await saving latest canvas state to server
      await saveWorkflowAsync();

      const res = await fetch(`/api/workflows/${workflowId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activateImmediately, nodes, edges }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to publish workflow");
      }

      toast(
        activateImmediately
          ? `Workflow "${name}" published and activated (v${data.workflow.publishedVersionNumber})!`
          : `Published new version snapshot (v${data.workflow.publishedVersionNumber})!`,
      );
      loadWorkflow(workflowId);

      onOpenChange(false);
      if (onPublishedSuccess) onPublishedSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Publishing failed";
      setErrorMsg(msg);
      toast("Publishing failed", { tone: "error" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-4 w-4 text-success" />
            <h2 className="text-sm font-semibold text-ink">Publish Workflow Version</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-ink-faint hover:text-ink text-xs font-medium"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          <div className="rounded-lg border border-success/30 bg-success/5 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">{name}</h3>
              <Badge variant="published">
                Ready to Publish
              </Badge>
            </div>
            <p className="text-xs text-ink-soft">
              Publishing generates an immutable version snapshot and enables production webhook URL endpoints.
            </p>
          </div>

          {/* Activation Strategy Options */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-ink">Activation Strategy</h4>
            <div className="flex flex-col gap-2">
              <label
                onClick={() => setActivateImmediately(true)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  activateImmediately
                    ? "border-success/50 bg-success/10 text-ink"
                    : "border-border bg-canvas/40 hover:bg-canvas text-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="activateStrategy"
                  checked={activateImmediately}
                  onChange={() => setActivateImmediately(true)}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-ink">
                    <Zap className="h-3.5 w-3.5 text-success" />
                    Publish & Activate Immediately (Live for Production)
                  </span>
                  <span className="text-[11px] text-ink-faint mt-0.5">
                    Creates new version snapshot and immediately routes all production webhook traffic to this definition.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setActivateImmediately(false)}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  !activateImmediately
                    ? "border-accent/50 bg-accent/10 text-ink"
                    : "border-border bg-canvas/40 hover:bg-canvas text-ink-soft"
                }`}
              >
                <input
                  type="radio"
                  name="activateStrategy"
                  checked={!activateImmediately}
                  onChange={() => setActivateImmediately(false)}
                  className="mt-0.5"
                />
                <div className="flex flex-col">
                  <span className="text-xs font-bold flex items-center gap-1.5 text-ink">
                    <History className="h-3.5 w-3.5 text-accent-ink" />
                    Publish Snapshot Only (Keep Current Live Version Active)
                  </span>
                  <span className="text-[11px] text-ink-faint mt-0.5">
                    Stores immutable version snapshot without interrupting current live execution version.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Validation Checklist */}
          <div className="flex flex-col gap-2">
            <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-accent-ink" />
              Publish Readiness Checklist
            </h4>

            {validation.valid ? (
              <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-xs text-success flex items-center gap-2">
                <Check className="h-4 w-4 shrink-0" />
                <span>All node configurations and connections passed validation cleanly.</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>Publish Validation Failed ({validation.errors.length} issues)</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-[11px] font-sans">
                  {validation.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handlePublish}
              disabled={!validation.valid || publishing}
              className="text-xs h-9 gap-1.5 bg-success text-white hover:bg-success/90"
            >
              {publishing ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  Publishing Version...
                </>
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" />
                  Publish Workflow Now
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
