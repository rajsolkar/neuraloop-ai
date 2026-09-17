"use client";

import React, { useState } from "react";
import { Sparkles, CheckCircle2, ArrowRight, ShieldAlert, RotateCw, Table, MessageSquare, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Mascot } from "@/components/mascot/mascot";
import { WorkflowRefiner } from "@/lib/ai/workflow-refiner";
import type { GeneratedWorkflowData } from "@/lib/ai/schema";

interface NoriSuggestionsPanelProps {
  currentWorkflow: GeneratedWorkflowData;
  onApplyRefinement: (updatedWorkflow: GeneratedWorkflowData, summary: string) => void;
  className?: string;
}

export function NoriSuggestionsPanel({
  currentWorkflow,
  onApplyRefinement,
  className = "",
}: NoriSuggestionsPanelProps) {
  const [applyingIndex, setApplyingIndex] = useState<number | null>(null);

  const suggestions = [
    {
      id: "err-handling",
      prompt: "Add failure notification",
      label: "+ Add Error Handling",
      icon: ShieldAlert,
      impact: "High Reliability",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20",
    },
    {
      id: "retry-logic",
      prompt: "Add retry handling",
      label: "+ Add Retry Logic",
      icon: RotateCw,
      impact: "Resilience",
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20",
    },
    {
      id: "slack-logging",
      prompt: "Add Slack notification",
      label: "+ Add Slack Alert",
      icon: MessageSquare,
      impact: "Visibility",
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20",
    },
    {
      id: "sheets-logging",
      prompt: "Add Google Sheets logging",
      label: "+ Log to Sheets",
      icon: Table,
      impact: "Auditability",
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20",
    },
    {
      id: "delay-step",
      prompt: "Add delay wait step",
      label: "+ Add Delay Step",
      icon: Clock,
      impact: "Pacing",
      color: "bg-zinc-500/10 text-zinc-700 border-zinc-500/20 hover:bg-zinc-500/20",
    },
    {
      id: "reduce-cost",
      prompt: "Reduce AI costs by 40%",
      label: "+ Reduce AI Costs ~40%",
      icon: Zap,
      impact: "Cost Saving",
      color: "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20",
    },
  ];

  const handleApply = (index: number, prompt: string) => {
    setApplyingIndex(index);
    try {
      const res = WorkflowRefiner.refineWorkflow(currentWorkflow, prompt);
      if (res.modified) {
        onApplyRefinement(res.workflow, res.refinementSummary);
      }
    } finally {
      setTimeout(() => setApplyingIndex(null), 300);
    }
  };

  return (
    <div
      className={`bg-[#A7B3A1]/95 backdrop-blur border border-[#8e9a88] rounded-2xl p-4 shadow-xl text-slate-900 ${className}`}
    >
      <div className="flex items-center gap-2 mb-3">
        <Mascot mood="optimizing" size="xs" animate />
        <span className="font-bold text-sm flex items-center gap-1.5 text-slate-950">
          <Sparkles className="w-4 h-4 text-amber-800" />
          Nori One-Click Suggestions
        </span>
        <span className="ml-auto text-[11px] font-medium text-slate-800 bg-white/40 px-2 py-0.5 rounded-full border border-white/40">
          1-Click Graph Refinements
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {suggestions.map((s, idx) => {
          const Icon = s.icon;
          const isApplying = applyingIndex === idx;
          return (
            <button
              key={s.id}
              onClick={() => handleApply(idx, s.prompt)}
              disabled={isApplying}
              className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all font-medium ${s.color} ${
                isApplying ? "scale-95 opacity-50" : "hover:scale-[1.02]"
              }`}
            >
              <div className="flex items-center gap-1.5 w-full mb-1">
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="font-semibold text-xs leading-tight truncate">{s.label}</span>
              </div>
              <span className="text-[10px] text-slate-700 font-mono opacity-80">{s.impact}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
