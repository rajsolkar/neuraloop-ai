"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Sparkles, ArrowRight, Zap, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingPricingCalculator() {
  const [isAnnual, setIsAnnual] = useState(false);
  const [runsPerMonth, setRunsPerMonth] = useState(50000);

  // Recommended plan based on slider
  const getRecommendedPlan = (runs: number) => {
    if (runs <= 10000) return "Developer";
    if (runs <= 100000) return "Pro";
    if (runs <= 500000) return "Team";
    return "Enterprise";
  };

  const recommendedPlan = getRecommendedPlan(runsPerMonth);

  return (
    <section id="pricing" className="py-16 md:py-24 bg-canvas border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-dim/80 px-2.5 py-1 text-xs font-semibold text-accent-ink border border-accent/40 mb-3">
            <span>Simple, Transparent Pricing</span>
          </div>
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl tracking-tight">
            Pay as You Scale
          </h2>
          <p className="mt-3 text-base md:text-lg text-ink-soft">
            Start for free during public beta. Upgrade as your team and workflow execution volume grows.
          </p>

          {/* Billing Toggle */}
          <div className="mt-6 flex items-center justify-center gap-3">
            <span className={`text-sm font-medium ${!isAnnual ? "text-ink font-bold" : "text-ink-soft"}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setIsAnnual(!isAnnual)}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-ink transition-colors duration-200 ease-in-out focus:outline-none"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-accent shadow transition duration-200 ease-in-out ${
                  isAnnual ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${isAnnual ? "text-ink font-bold" : "text-ink-soft"}`}>
              Annual <span className="text-xs text-accent-ink font-bold bg-accent-dim px-2 py-0.5 rounded-full">Save 20%</span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {/* Developer Free */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="text-sm font-bold text-ink-soft uppercase tracking-wider">
                Developer
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono text-ink">$0</span>
                <span className="text-xs text-ink-faint">/ forever</span>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                Ideal for solo builders and side projects experimenting with AI workflows.
              </p>
              <div className="mt-6 pt-6 border-t border-border space-y-2.5 text-xs text-ink">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>Up to 10,000 runs/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>5 Active Workflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>1 Workspace Member</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>AES-256 Encrypted Vault</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Link href="/workflows">
                <Button variant="outline" className="w-full bg-canvas border-border-strong">
                  Start Free
                </Button>
              </Link>
            </div>
          </div>

          {/* Pro (Highlighted) */}
          <div className="rounded-2xl border-2 border-accent-ink bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-xl relative ring-2 ring-accent/60">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-[11px] font-extrabold text-accent-ink uppercase tracking-wider border border-accent-ink/20 shadow-xs">
              Most Popular
            </div>
            <div>
              <div className="text-sm font-bold text-accent-ink uppercase tracking-wider">
                Pro
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono text-ink">
                  ${isAnnual ? "24" : "29"}
                </span>
                <span className="text-xs text-ink-faint">/ month</span>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                For engineers and startups running automated AI digests, webhooks, and production cron tasks.
              </p>
              <div className="mt-6 pt-6 border-t border-border space-y-2.5 text-xs text-ink font-medium">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent-ink shrink-0" />
                  <span>100,000 runs/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent-ink shrink-0" />
                  <span>Unlimited Workflows</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent-ink shrink-0" />
                  <span>5 Team Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent-ink shrink-0" />
                  <span>Priority BullMQ Queue Worker</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-accent-ink shrink-0" />
                  <span>Sub-second SSE Execution Stream</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Link href="/workflows">
                <Button variant="primary" className="w-full gap-2 shadow-sm">
                  <Sparkles className="h-4 w-4 text-accent-ink" />
                  Get Pro
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>

          {/* Team / Enterprise */}
          <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 flex flex-col justify-between shadow-2xs">
            <div>
              <div className="text-sm font-bold text-ink-soft uppercase tracking-wider">
                Team
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold font-mono text-ink">
                  ${isAnnual ? "79" : "99"}
                </span>
                <span className="text-xs text-ink-faint">/ month</span>
              </div>
              <p className="mt-3 text-xs text-ink-soft">
                For scaling teams requiring dedicated queue isolation, SLA guarantees, and multi-tenant org roles.
              </p>
              <div className="mt-6 pt-6 border-t border-border space-y-2.5 text-xs text-ink">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>500,000 runs/mo</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>Unlimited Team Members</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>Dedicated Redis Instance</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success shrink-0" />
                  <span>Custom Webhook Domains</span>
                </div>
              </div>
            </div>
            <div className="mt-8">
              <Link href="/workflows">
                <Button variant="outline" className="w-full bg-canvas border-border-strong">
                  Contact Sales
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Interactive Execution Volume Calculator */}
        <div className="mt-14 max-w-3xl mx-auto rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-md">
          <div className="flex items-center gap-2 font-bold text-sm text-ink mb-2">
            <Calculator className="h-4 w-4 text-accent-ink" />
            <span>Interactive Execution Calculator</span>
          </div>
          <p className="text-xs text-ink-soft mb-6">
            Drag the slider to estimate your monthly workflow execution volume and find your optimal plan.
          </p>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs font-mono font-bold">
              <span className="text-ink-soft">Monthly Executions:</span>
              <span className="text-base text-ink bg-accent-dim px-3 py-1 rounded-md border border-accent/40">
                {runsPerMonth.toLocaleString()} runs/mo
              </span>
            </div>

            <input
              type="range"
              min="10000"
              max="1000000"
              step="10000"
              value={runsPerMonth}
              onChange={(e) => setRunsPerMonth(Number(e.target.value))}
              className="w-full accent-accent bg-border h-2 rounded-lg cursor-pointer"
            />

            <div className="flex items-center justify-between text-[11px] text-ink-faint font-mono">
              <span>10k</span>
              <span>250k</span>
              <span>500k</span>
              <span>1M+</span>
            </div>

            {/* Recommendation Result Box */}
            <div className="mt-4 rounded-xl bg-canvas p-4 border border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-ink-faint uppercase font-semibold">Recommended Tier:</span>
                <div className="text-sm font-bold text-ink">{recommendedPlan} Plan</div>
              </div>
              <Link href="/workflows">
                <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                  <Zap className="h-3.5 w-3.5 text-accent-ink" />
                  Select {recommendedPlan}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
