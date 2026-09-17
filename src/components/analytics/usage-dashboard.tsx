"use client";

import React from "react";
import { DollarSign, Cpu, Activity, TrendingUp, CheckCircle2, AlertCircle, Zap, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WorkflowCostMetrics } from "@/lib/analytics/workflow-cost-analytics";

interface UsageDashboardProps {
  metrics: WorkflowCostMetrics;
}

export function UsageDashboard({ metrics }: UsageDashboardProps) {
  return (
    <div className="flex flex-col gap-6 text-ink">
      {/* Overview Stat Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Spend */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Total AI Spend</span>
            <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-ink">${metrics.totalAiCostUsd.toFixed(4)}</div>
            <div className="text-[11px] text-ink-soft mt-1">Avg ${metrics.averageCostPerRun} / run</div>
          </div>
        </div>

        {/* Card 2: Total Executions */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Total Executions</span>
            <span className="p-2 rounded-xl bg-accent/10 text-accent-ink">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-ink">{metrics.totalExecutions}</div>
            <div className="flex items-center gap-2 text-[11px] text-ink-soft mt-1">
              <span className="text-emerald-600 font-semibold">{metrics.successfulExecutions} success</span>
              <span>•</span>
              <span className="text-rose-600 font-semibold">{metrics.failedExecutions} failed</span>
            </div>
          </div>
        </div>

        {/* Card 3: AI Tokens Consumed */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">AI Tokens In/Out</span>
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
              <Cpu className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-ink">
              {(metrics.totalTokensIn + metrics.totalTokensOut).toLocaleString()}
            </div>
            <div className="text-[11px] text-ink-soft mt-1">
              In: {metrics.totalTokensIn.toLocaleString()} | Out: {metrics.totalTokensOut.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 4: Efficiency Rating */}
        <div className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Cost Efficiency</span>
            <span className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
              <Zap className="w-5 h-5" />
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-extrabold text-emerald-600">Optimal</div>
            <div className="text-[11px] text-ink-soft mt-1">gpt-4o-mini & Claude routing active</div>
          </div>
        </div>
      </div>

      {/* Top Workflows Breakdown */}
      <div className="rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-ink">Most Expensive Workflows</h3>
            <p className="text-xs text-ink-soft">Workflows consuming the highest LLM & API token budget</p>
          </div>
          <Badge variant="outline" className="text-xs font-mono">Top 5 Spend</Badge>
        </div>

        {metrics.topWorkflowsByCost.length === 0 ? (
          <div className="text-center py-8 text-xs text-ink-faint">No workflow cost data recorded yet.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {metrics.topWorkflowsByCost.map((wf, idx) => (
              <div key={wf.id} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-canvas text-ink-soft font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <div className="font-semibold text-ink">{wf.name}</div>
                    <div className="text-[11px] text-ink-faint font-mono">{wf.executionCount} total runs</div>
                  </div>
                </div>
                <div className="text-right font-mono font-bold text-emerald-600 text-sm">
                  ${wf.totalCost.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
