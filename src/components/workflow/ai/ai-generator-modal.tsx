"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, RefreshCw, Check, X, ArrowRight, Layers, GitBranch, Lightbulb, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/store/editor-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { useToastStore } from "@/store/toast-store";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

interface GeneratedWorkflowPreview {
  name: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

interface AiGeneratorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetWorkflowId?: string | null;
}

const EXAMPLE_PROMPTS = [
  {
    title: "Lead Qualification",
    prompt: "When a webhook receives a lead, check if score is above 80, send email if true, post to Slack if false.",
  },
  {
    title: "Daily Weather Report",
    prompt: "Every morning at 8 AM, fetch weather data via HTTP request and post a summary to Slack.",
  },
  {
    title: "Customer Onboarding",
    prompt: "When a new customer signs up, wait 1 hour then send a welcome email.",
  },
  {
    title: "Daily Summary Report",
    prompt: "Schedule a daily trigger at 9 AM to collect metrics and send an email summary.",
  },
];

export function AiGeneratorModal({ open, onOpenChange, targetWorkflowId }: AiGeneratorModalProps) {
  const router = useRouter();
  const toast = useToastStore((s) => s.toast);

  // Store hooks for importing into active editor canvas
  const activeWorkflowId = useEditorStore((s) => s.workflowId);
  const loadWorkflow = useEditorStore((s) => s.loadWorkflow);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const updateWorkflowContent = useWorkflowStore((s) => s.updateWorkflowContent);
  const saveWorkflowToServer = useWorkflowStore((s) => s.saveWorkflowToServer);

  const [prompt, setPrompt] = useState("");
  const [step, setStep] = useState<"input" | "generating" | "preview">("input");
  const [previewData, setPreviewData] = useState<GeneratedWorkflowPreview | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open) return null;

  const handleGenerate = async (customPrompt?: string) => {
    const textToUse = customPrompt || prompt;
    if (!textToUse || !textToUse.trim()) {
      setErrorMsg("Please enter a description for your workflow.");
      return;
    }

    setStep("generating");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: textToUse }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate workflow");
      }

      setPreviewData(data.workflow);
      setStep("preview");
      toast("Workflow graph generated successfully!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setErrorMsg(msg);
      setStep("input");
      toast("Workflow generation failed", { tone: "error" });
    }
  };

  const handleAcceptImport = async () => {
    if (!previewData) return;

    try {
      const targetId = targetWorkflowId || activeWorkflowId;

      if (targetId) {
        // Populate active editor workflow
        updateWorkflowContent(targetId, {
          name: previewData.name,
          description: previewData.description,
          nodes: previewData.nodes,
          edges: previewData.edges,
        });
        loadWorkflow(targetId);
        saveWorkflowToServer(targetId);
        toast(`Imported "${previewData.name}" into editor!`);
      } else {
        // Create new workflow in collection and navigate
        const newId = createWorkflow({
          name: previewData.name,
          description: previewData.description,
        });
        updateWorkflowContent(newId, {
          name: previewData.name,
          description: previewData.description,
          nodes: previewData.nodes,
          edges: previewData.edges,
        });
        saveWorkflowToServer(newId);
        toast(`Created workflow "${previewData.name}"!`);
        router.push(`/workflows/${newId}`);
      }

      onOpenChange(false);
      setStep("input");
      setPrompt("");
      setPreviewData(null);
    } catch {
      toast("Failed to import generated workflow", { tone: "error" });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent-ink" />
            <h2 className="text-sm font-semibold text-ink">Generate Workflow with AI</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              setStep("input");
              setErrorMsg(null);
            }}
            className="text-ink-faint hover:text-ink text-xs font-medium"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {step === "input" && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink flex items-center justify-between">
                  <span>Describe your workflow in natural language</span>
                  <span className="text-[11px] text-ink-faint">{prompt.length}/500</span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="font-sans text-xs h-28 bg-canvas"
                  placeholder="e.g. When a webhook receives a lead, check if score is above 80, send an email if true, post to Slack if false."
                  maxLength={500}
                />
              </div>

              {/* Example Prompts */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-accent-ink" />
                  Try an Example Prompt:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {EXAMPLE_PROMPTS.map((ex) => (
                    <button
                      key={ex.title}
                      type="button"
                      onClick={() => {
                        setPrompt(ex.prompt);
                        handleGenerate(ex.prompt);
                      }}
                      className="flex flex-col items-start p-2.5 rounded-lg border border-border bg-canvas/60 hover:bg-canvas hover:border-accent/40 text-left transition-colors group"
                    >
                      <span className="text-xs font-semibold text-ink group-hover:text-accent-ink transition-colors flex items-center justify-between w-full">
                        {ex.title}
                        <ArrowRight className="h-3 w-3 text-ink-faint group-hover:text-accent-ink" />
                      </span>
                      <span className="text-[11px] text-ink-faint line-clamp-2 mt-0.5">
                        {ex.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-error/30 bg-error/10 p-3 text-xs text-error flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => handleGenerate()}
                  disabled={!prompt.trim()}
                  className="text-xs h-9 gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Generate Workflow Graph
                </Button>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-3">
              <RefreshCw className="h-8 w-8 text-accent-ink animate-spin" />
              <h3 className="text-sm font-semibold text-ink">Neuraloop AI is planning your workflow...</h3>
              <p className="text-xs text-ink-faint max-w-sm">
                Parsing prompt intent, mapping definition IDs, calculating IF branch paths, and applying auto-layout coordinates.
              </p>
            </div>
          )}

          {step === "preview" && previewData && (
            <div className="flex flex-col gap-4">
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{previewData.name}</h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="active" className="text-[10px]">
                      {previewData.nodes.length} Nodes
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      {previewData.edges.length} Connections
                    </Badge>
                  </div>
                </div>
                <p className="text-xs text-ink-soft">{previewData.description}</p>
              </div>

              {/* Visual Node Breakdown */}
              <div className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5" />
                  Generated Graph Preview Timeline ({previewData.nodes.length} steps)
                </h4>
                <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                  {previewData.nodes.map((n, idx) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-surface text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-ink-faint font-bold text-[11px]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-ink truncate">
                          {n.data.label}
                        </span>
                        <span className="text-[11px] text-ink-faint font-mono truncate">
                          ({n.data.definitionId})
                        </span>
                      </div>

                      {n.data.definitionId === "if" && (
                        <Badge variant="outline" className="gap-1 text-[10px]">
                          <GitBranch className="h-3 w-3 text-accent-ink" />
                          Branching Node
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions Footer */}
              <div className="flex items-center justify-between gap-2 pt-3 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("input")}
                  className="text-xs gap-1"
                >
                  ← Edit Prompt
                </Button>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate()}
                    className="text-xs gap-1"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleAcceptImport}
                    className="text-xs gap-1.5"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Accept & Import Workflow
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
