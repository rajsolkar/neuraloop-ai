"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TemplatePreview } from "@/components/templates/template-preview";
import type { StarterTemplateItem } from "@/lib/templates/starter-templates";
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Layers,
  Sparkles,
  Zap,
  RefreshCw,
  FileCode,
  CheckSquare,
} from "lucide-react";

interface StarterPreviewModalProps {
  starter: StarterTemplateItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (starter: StarterTemplateItem) => Promise<void>;
  cloning: boolean;
}

export function StarterPreviewModal({
  starter,
  open,
  onOpenChange,
  onUseTemplate,
  cloning,
}: StarterPreviewModalProps) {
  const [activeTab, setActiveTab] = useState<"checklist" | "io">("checklist");

  if (!starter) return null;

  const difficultyVariant =
    starter.difficulty === "Beginner"
      ? "text-emerald-700 bg-emerald-50 border-emerald-300"
      : starter.difficulty === "Intermediate"
      ? "text-amber-800 bg-amber-50 border-amber-300"
      : "text-purple-800 bg-purple-50 border-purple-300";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 gap-5 bg-surface border-border">
        {/* Header */}
        <DialogHeader className="gap-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-ink text-canvas">
              {starter.number}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${difficultyVariant}`}>
              {starter.difficulty}
            </span>
            <Badge variant="outline" className="text-[11px] font-mono capitalize">
              {starter.category}
            </Badge>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
            {starter.name}
          </DialogTitle>

          <DialogDescription className="text-xs sm:text-sm text-ink-soft leading-relaxed">
            {starter.description}
          </DialogDescription>
        </DialogHeader>

        {/* Pipeline Sequence */}
        <div className="flex items-center gap-1.5 flex-wrap rounded-lg bg-canvas border border-border/80 px-3 py-2 text-xs text-ink-soft">
          <span className="font-semibold text-ink flex items-center gap-1 mr-1">
            <Layers className="h-3.5 w-3.5 text-accent-ink" />
            Graph Flow:
          </span>
          {starter.flowSequence.map((step, idx) => (
            <span key={step} className="flex items-center gap-1">
              <span className="font-medium bg-surface border border-border px-2 py-0.5 rounded text-[11px] text-ink">
                {step}
              </span>
              {idx < starter.flowSequence.length - 1 && (
                <span className="text-ink-faint font-bold">→</span>
              )}
            </span>
          ))}
        </div>

        {/* Visual Graph Preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-ink-faint">
            <span className="font-semibold text-ink uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-accent-ink" />
              Interactive Canvas Topology
            </span>
            <span>Pan & zoom preview • Read-only</span>
          </div>

          <TemplatePreview
            nodes={starter.definition.nodes}
            edges={starter.definition.edges}
            height={320}
          />
        </div>

        {/* Tab switch between Checklist and Sample I/O */}
        <div className="flex flex-col gap-3">
          <div className="flex border-b border-border gap-2 text-xs font-semibold">
            <button
              onClick={() => setActiveTab("checklist")}
              className={`pb-2 px-1 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "checklist"
                  ? "border-accent-ink text-ink font-bold"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <CheckSquare className="h-3.5 w-3.5" />
              Credentials & Setup Checklist ({starter.checklist.length})
            </button>
            <button
              onClick={() => setActiveTab("io")}
              className={`pb-2 px-1 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
                activeTab === "io"
                  ? "border-accent-ink text-ink font-bold"
                  : "border-transparent text-ink-faint hover:text-ink"
              }`}
            >
              <FileCode className="h-3.5 w-3.5" />
              Sample Input & Output Payload
            </button>
          </div>

          {activeTab === "checklist" ? (
            <div className="flex flex-col gap-3.5 pt-1">
              {/* Credentials requirement box */}
              {starter.credentialRequirements.length === 0 ? (
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-300 p-3 text-xs text-emerald-900">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>Zero credentials required!</strong> This workflow uses genuinely public endpoints and can be executed immediately upon cloning.
                  </span>
                </div>
              ) : (
                <div className="rounded-lg bg-amber-500/10 border border-amber-300 p-3 text-xs text-amber-950 flex flex-col gap-2">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <KeyRound className="h-4 w-4 text-amber-700 shrink-0" />
                    Required Credentials Setup ({starter.credentialRequirements.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                    {starter.credentialRequirements.map((req) => (
                      <div
                        key={req.provider}
                        className="rounded-md bg-surface border border-border/80 p-2.5 flex flex-col gap-0.5"
                      >
                        <span className="font-semibold text-ink text-xs">{req.name}</span>
                        <span className="text-[11px] text-ink-soft leading-tight">
                          {req.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step-by-step checklist */}
              <div className="rounded-lg border border-border bg-canvas p-3.5 flex flex-col gap-2">
                <span className="font-bold text-xs text-ink uppercase tracking-wider text-ink-soft">
                  Step-by-Step Setup Guide
                </span>
                <ol className="flex flex-col gap-2 text-xs text-ink">
                  {starter.checklist.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-ink/10 text-ink text-[10px] font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-ink-soft leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-lg border border-border bg-canvas p-3 flex flex-col gap-2">
                <span className="font-bold text-xs text-ink uppercase tracking-wider text-ink-soft">
                  Sample Trigger Input
                </span>
                <pre className="font-mono text-[11px] bg-surface border border-border/60 p-2.5 rounded text-ink overflow-x-auto max-h-48">
                  {JSON.stringify(starter.exampleInput, null, 2)}
                </pre>
              </div>

              <div className="rounded-lg border border-border bg-canvas p-3 flex flex-col gap-2">
                <span className="font-bold text-xs text-ink uppercase tracking-wider text-ink-soft">
                  Expected Node Execution Output
                </span>
                <pre className="font-mono text-[11px] bg-surface border border-border/60 p-2.5 rounded text-ink overflow-x-auto max-h-48">
                  {JSON.stringify(starter.expectedOutput, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs text-ink-soft"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={() => onUseTemplate(starter)}
            disabled={cloning}
            className="text-xs font-bold gap-2 px-5 h-9"
          >
            {cloning ? (
              <span className="flex items-center gap-1.5">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                Cloning to Workspace...
              </span>
            ) : (
              <>
                <span>Use Template & Open Canvas</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
