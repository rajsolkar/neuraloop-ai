"use client";

import React, { useState } from "react";
import { FlaskConical, Play, CheckCircle2, Clock, DollarSign, X, ChevronRight, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WorkflowSimulator, type WorkflowSimulationReport } from "@/lib/workflow/workflow-simulator";
import type { GeneratedWorkflowData } from "@/lib/ai/schema";

interface SimulationPanelProps {
  workflow: GeneratedWorkflowData;
  onClose: () => void;
}

export function SimulationPanel({ workflow, onClose }: SimulationPanelProps) {
  const [report, setReport] = useState<WorkflowSimulationReport | null>(null);
  const [simulating, setSimulating] = useState(false);

  const handleRunSimulation = () => {
    setSimulating(true);
    setTimeout(() => {
      const result = WorkflowSimulator.simulateWorkflow(workflow);
      setReport(result);
      setSimulating(false);
    }, 400);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-surface border-l border-border shadow-2xl flex flex-col text-ink animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-canvas">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent-ink">
            <FlaskConical className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-ink">Pre-Publish Workflow Simulator</h2>
            <p className="text-xs text-ink-soft">Dry-run step outputs without executing live APIs or sending emails</p>
          </div>
        </div>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!report ? (
          <div className="flex flex-col items-center justify-center text-center py-16 px-4 gap-4">
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-accent-ink">
              <FlaskConical className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-ink">Ready for Simulation</h3>
              <p className="text-xs text-ink-soft max-w-xs mt-1">
                Run a safe offline dry-run to verify variable flow, node sequence, and estimated execution costs before publishing.
              </p>
            </div>
            <Button
              variant="primary"
              onClick={handleRunSimulation}
              disabled={simulating}
              className="gap-2 px-6 py-5 text-sm font-bold"
            >
              <Play className={`w-4 h-4 ${simulating ? "animate-spin" : ""}`} />
              {simulating ? "Simulating Graph..." : "Run Dry-Run Simulation"}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Telemetry Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-canvas border border-border rounded-xl">
                <div className="text-[11px] text-ink-faint font-medium">Total Steps</div>
                <div className="text-lg font-bold text-ink mt-0.5">{report.totalSteps}</div>
              </div>
              <div className="p-3 bg-canvas border border-border rounded-xl">
                <div className="text-[11px] text-ink-faint font-medium">Est. Duration</div>
                <div className="text-lg font-bold text-accent-ink mt-0.5">{report.estimatedTotalDurationMs} ms</div>
              </div>
              <div className="p-3 bg-canvas border border-border rounded-xl">
                <div className="text-[11px] text-ink-faint font-medium">Est. Cost</div>
                <div className="text-lg font-bold text-emerald-600 mt-0.5">${report.estimatedTotalCostUsd}</div>
              </div>
            </div>

            {/* Step-by-Step Flow List */}
            <div className="space-y-3">
              <div className="text-xs font-semibold text-ink uppercase tracking-wider flex items-center justify-between">
                <span>Simulated Execution Sequence</span>
                <Button variant="ghost" size="sm" onClick={handleRunSimulation} className="h-6 text-[11px] gap-1">
                  <Play className="w-3 h-3" /> Re-Simulate
                </Button>
              </div>

              {report.steps.map((step) => (
                <div
                  key={step.stepIndex}
                  className="p-3.5 bg-canvas border border-border rounded-xl flex flex-col gap-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-ink">
                      <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] flex items-center justify-center">
                        {step.stepIndex}
                      </span>
                      <span>{step.nodeLabel}</span>
                      <span className="text-[10px] font-mono text-ink-faint uppercase">({step.definitionId})</span>
                    </div>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded">
                      PASSED
                    </span>
                  </div>

                  <div className="bg-surface/80 p-2.5 rounded-lg border border-border/60 font-mono text-[11px] text-ink-soft overflow-x-auto">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(step.simulatedOutput, null, 2)}</pre>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-ink-faint pt-1">
                    <span>Est. Latency: {step.estimatedDurationMs}ms</span>
                    <span>Est. Cost: ${step.estimatedCostUsd}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
