"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  ArrowRight,
  Layers,
  GitBranch,
  Lightbulb,
  AlertCircle,
  ShieldCheck,
  Zap,
  DollarSign,
  Key,
  Wand2,
  BookOpen,
  FileText,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/store/editor-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { useToastStore } from "@/store/toast-store";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import type {
  WorkflowPlanData,
  WorkflowExplanationData,
  WorkflowValidationResultData,
} from "@/lib/ai/schema";
import type { WorkflowOptimizationResult } from "@/lib/ai/workflow-optimizer";
import type { ArchitectureScoreResult } from "@/lib/ai/architecture-scorer";

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
    title: "Lead Qualification & Alert",
    prompt: "When a webhook receives a lead, check if score is above 80, send an email if true, post to Slack if false.",
  },
  {
    title: "Daily Weather & Slack Update",
    prompt: "Every morning at 8 AM, fetch weather data via HTTP request and post a summary to Slack.",
  },
  {
    title: "GitHub PR Code Reviewer",
    prompt: "Monitor GitHub pull requests, fetch diff via GitHub OAuth, analyze code using AI, and post summary to Slack.",
  },
  {
    title: "Competitor Market Monitor",
    prompt: "Inspect competitor page daily with HTTP GET, extract insights with AI, and post Discord embed report.",
  },
];

export function AiGeneratorModal({ open, onOpenChange, targetWorkflowId }: AiGeneratorModalProps) {
  const router = useRouter();
  const toast = useToastStore((s) => s.toast);

  const activeWorkflowId = useEditorStore((s) => s.workflowId);
  const loadWorkflow = useEditorStore((s) => s.loadWorkflow);
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const updateWorkflowContent = useWorkflowStore((s) => s.updateWorkflowContent);
  const saveWorkflowToServer = useWorkflowStore((s) => s.saveWorkflowToServer);

  const [prompt, setPrompt] = useState("");
  const [refinementPrompt, setRefinementPrompt] = useState("");
  const [refining, setRefining] = useState(false);
  const [step, setStep] = useState<"input" | "generating" | "preview">("input");
  const [activeTab, setActiveTab] = useState<"graph" | "plan" | "explanation" | "optimizations">("graph");

  const [previewData, setPreviewData] = useState<GeneratedWorkflowPreview | null>(null);
  const [planData, setPlanData] = useState<WorkflowPlanData | null>(null);
  const [explanationData, setExplanationData] = useState<WorkflowExplanationData | null>(null);
  const [validationData, setValidationData] = useState<WorkflowValidationResultData | null>(null);
  const [optimizationData, setOptimizationData] = useState<WorkflowOptimizationResult | null>(null);
  const [scoreData, setScoreData] = useState<ArchitectureScoreResult | null>(null);
  const [generationMode, setGenerationMode] = useState<string>("offline-generator");

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
      setPlanData(data.plan || null);
      setExplanationData(data.explanation || null);
      setValidationData(data.validation || null);
      setOptimizationData(data.optimizations || null);
      setScoreData(data.architectureScore || null);
      setGenerationMode(data.mode || "offline-generator");

      setStep("preview");
      toast("AI Architect designed your workflow graph!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setErrorMsg(msg);
      setStep("input");
      toast("Workflow generation failed", { tone: "error" });
    }
  };

  const handleRefine = async () => {
    if (!refinementPrompt.trim() || !previewData) return;
    setRefining(true);

    try {
      const res = await fetch("/api/workflows/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          refinementPrompt,
          currentWorkflow: previewData,
        }),
      });

      const data = await res.json();
      if (res.ok && data.workflow) {
        setPreviewData(data.workflow);
        setRefinementPrompt("");
        toast(data.message || "Workflow refined by Nori!");
      }
    } catch {
      toast("Failed to refine workflow", { tone: "error" });
    } finally {
      setRefining(false);
    }
  };

  const handleAcceptImport = async () => {
    if (!previewData) return;

    try {
      const targetId = targetWorkflowId || activeWorkflowId;

      if (targetId) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/50 backdrop-blur-xs p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        {/* Modal Header */}
        <div className="flex h-13 items-center justify-between border-b border-border px-4 sm:px-6 bg-canvas/60">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent/20 text-accent-ink">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ink">Nori AI Workflow Architect v2</h2>
              <p className="text-[11px] text-ink-faint">
                Multi-stage planning, template adaptation, graph validation & architecture scoring
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              setStep("input");
              setErrorMsg(null);
            }}
            className="text-ink-faint hover:text-ink text-xs font-medium p-1 rounded-md"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {step === "input" && (
            <div className="flex flex-col gap-4">
              {/* Nori Prompt Header Banner (User Rule: Dialog box bg #A7B3A1) */}
              <div
                className="rounded-2xl p-4 shadow-2xs flex items-start gap-3.5 border border-black/10"
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
                <div className="flex flex-col text-slate-950 text-xs">
                  <span className="font-bold flex items-center gap-1">
                    Meet Nori, your AI Architect! 🚀
                  </span>
                  <p className="mt-0.5 leading-relaxed text-slate-900 font-medium">
                    Describe any automation goal. I&apos;ll search official templates, select optimal node specifications, configure OAuth bridges, validate expressions, compute an architecture score, and build a production-ready graph for you!
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-ink flex items-center justify-between">
                  <span>Describe your workflow in natural language</span>
                  <span className="text-[11px] text-ink-faint">{prompt.length}/500</span>
                </label>
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="font-sans text-xs h-28 bg-canvas"
                  placeholder="e.g. Monitor GitHub pull requests, fetch diff via GitHub OAuth, analyze code quality with AI, and send a summary to Slack."
                  maxLength={500}
                />
              </div>

              {/* Try Example Prompts */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-ink flex items-center gap-1.5">
                  <Lightbulb className="h-3.5 w-3.5 text-accent-ink" />
                  Try an Architect Example Prompt:
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
                      className="flex flex-col items-start p-2.5 rounded-xl border border-border bg-canvas/60 hover:bg-canvas hover:border-accent/40 text-left transition-colors group"
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
                <div className="rounded-xl border border-error/30 bg-error/10 p-3 text-xs text-error flex items-start gap-2">
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
                  className="text-xs h-9 gap-1.5 bg-accent text-accent-ink font-semibold"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Design Workflow Graph
                </Button>
              </div>
            </div>
          )}

          {step === "generating" && (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
              <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-accent p-1 bg-surface shadow-md">
                <Image
                  src="/mascot/working.png"
                  alt="Nori Working"
                  fill
                  className="object-contain p-1"
                />
              </div>

              <div className="flex flex-col items-center gap-1">
                <h3 className="text-base font-bold text-ink flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 text-accent-ink animate-spin" />
                  Nori is designing your workflow...
                </h3>
                <p className="text-xs text-ink-faint max-w-sm leading-relaxed">
                  Searching official marketplace templates, checking credential requirements, computing architecture score, and generating graph layout...
                </p>
              </div>
            </div>
          )}

          {step === "preview" && previewData && (
            <div className="flex flex-col gap-4">
              {/* Nori Architecture Score Header Card (User Rule: Mascot Dialog box bg #A7B3A1) */}
              <div
                className="rounded-2xl p-4 shadow-2xs flex items-center justify-between border border-black/10"
                style={{ backgroundColor: "#A7B3A1" }}
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-black/10 bg-white/40">
                    <Image
                      src="/mascot/happy.png"
                      alt="Nori"
                      fill
                      className="object-contain p-0.5"
                    />
                  </div>
                  <div className="flex flex-col text-slate-950 text-xs">
                    <h3 className="text-sm font-bold text-slate-950">{previewData.name}</h3>
                    <p className="text-slate-900 font-medium text-[11px] line-clamp-1">{previewData.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {scoreData && (
                    <Badge variant="outline" className="text-xs font-bold font-mono bg-white/90 text-slate-950 border-black/20 px-2.5 py-1">
                      Architecture Score: {scoreData.score}/100
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-[10px] capitalize font-mono bg-white/60 text-slate-900 border-black/20">
                    {generationMode}
                  </Badge>
                </div>
              </div>

              {/* Tab Navigation */}
              <div className="flex items-center gap-1 border-b border-border pb-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("graph")}
                  className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "graph"
                      ? "bg-accent text-accent-ink shadow-2xs"
                      : "text-ink-faint hover:text-ink"
                  }`}
                >
                  <Layers className="h-3.5 w-3.5" />
                  Graph Preview ({previewData.nodes.length})
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("plan")}
                  className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "plan"
                      ? "bg-accent text-accent-ink shadow-2xs"
                      : "text-ink-faint hover:text-ink"
                  }`}
                >
                  <BookOpen className="h-3.5 w-3.5" />
                  Architect Plan
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("explanation")}
                  className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                    activeTab === "explanation"
                      ? "bg-accent text-accent-ink shadow-2xs"
                      : "text-ink-faint hover:text-ink"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Step Breakdown & Cost
                </button>

                {optimizationData?.suggestions?.length ? (
                  <button
                    type="button"
                    onClick={() => setActiveTab("optimizations")}
                    className={`px-3 py-1.5 text-xs rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                      activeTab === "optimizations"
                        ? "bg-accent text-accent-ink shadow-2xs"
                        : "text-amber-600 hover:text-amber-700"
                    }`}
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    Suggestions ({optimizationData.suggestions.length})
                  </button>
                ) : null}
              </div>

              {/* Tab 1: Graph Preview */}
              {activeTab === "graph" && (
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto pr-1">
                  {previewData.nodes.map((n, idx) => (
                    <div
                      key={n.id}
                      className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-surface text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="font-mono text-ink-faint font-bold text-[11px]">
                          #{idx + 1}
                        </span>
                        <span className="font-semibold text-ink truncate">{n.data.label}</span>
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
              )}

              {/* Tab 2: Architect Plan */}
              {activeTab === "plan" && planData && (
                <div className="rounded-xl border border-border bg-canvas/40 p-4 flex flex-col gap-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-ink-faint text-[11px] block font-medium">Trigger Type</span>
                      <span className="font-bold text-ink font-mono capitalize">{planData.triggerType}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint text-[11px] block font-medium">Pattern</span>
                      <span className="font-bold text-accent-ink">{planData.recommendedPattern} Pattern</span>
                    </div>
                    <div>
                      <span className="text-ink-faint text-[11px] block font-medium">Complexity</span>
                      <span className="font-bold text-ink capitalize font-mono">{planData.estimatedComplexity}</span>
                    </div>
                    <div>
                      <span className="text-ink-faint text-[11px] block font-medium">Integrations</span>
                      <span className="font-bold text-ink">{planData.integrations.join(", ") || "Standard API"}</span>
                    </div>
                  </div>

                  <div className="border-t border-border pt-2 flex flex-col gap-1">
                    <span className="text-ink-faint text-[11px] font-medium flex items-center gap-1">
                      <Key className="h-3.5 w-3.5 text-amber-600" /> Required Credentials
                    </span>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {planData.credentialsNeeded.map((cred) => (
                        <Badge key={cred} variant="outline" className="text-[10px] font-mono bg-surface">
                          {cred}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Step Breakdown & Cost */}
              {activeTab === "explanation" && explanationData && (
                <div className="flex flex-col gap-3 text-xs max-h-52 overflow-y-auto">
                  <div className="p-3 rounded-lg bg-canvas border border-border font-mono text-[11px] flex items-center justify-between">
                    <span>Estimated Cost per Run: <strong>${explanationData.estimatedCost.toFixed(4)}</strong></span>
                    <Badge variant="outline" className="text-[10px] font-mono">Complexity: {explanationData.complexity}</Badge>
                  </div>

                  <div className="flex flex-col gap-2">
                    {explanationData.steps.map((stepItem, idx) => (
                      <div key={stepItem.nodeId} className="p-2.5 rounded-lg border border-border bg-surface flex flex-col gap-0.5">
                        <span className="font-bold text-ink flex items-center gap-1.5">
                          <span className="text-accent-ink font-mono text-[11px]">#{idx + 1}</span>
                          {stepItem.nodeLabel} ({stepItem.definitionId})
                        </span>
                        <span className="text-ink-faint text-[11px]">{stepItem.purpose}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Non-Destructive Optimization Suggestions */}
              {activeTab === "optimizations" && optimizationData && (
                <div className="flex flex-col gap-2 max-h-52 overflow-y-auto text-xs">
                  {optimizationData.suggestions.map((sug, i) => (
                    <div key={i} className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-900 flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold capitalize flex items-center gap-1.5">
                          <Wand2 className="h-3.5 w-3.5 text-amber-700" />
                          {sug.type.replace(/_/g, " ")}
                        </span>
                        <Badge variant="outline" className="text-[10px] font-mono bg-amber-200/60 border-amber-400">
                          Impact: {sug.impact}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-amber-950 leading-relaxed mt-0.5">{sug.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Conversational "Ask Nori" Refinement Bar */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <input
                  type="text"
                  value={refinementPrompt}
                  onChange={(e) => setRefinementPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleRefine();
                  }}
                  placeholder="Ask Nori to refine graph (e.g. 'Add Google Sheets logging', 'Replace Telegram with Discord')..."
                  className="flex-1 font-sans text-xs bg-canvas px-3 py-1.5 rounded-lg border border-border focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefine}
                  disabled={refining || !refinementPrompt.trim()}
                  className="h-8 text-xs gap-1 font-semibold text-accent-ink"
                >
                  <Send className="h-3 w-3" />
                  {refining ? "Refining..." : "Refine"}
                </Button>
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-border">
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
                    className="text-xs gap-1.5 bg-accent text-accent-ink font-semibold"
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
