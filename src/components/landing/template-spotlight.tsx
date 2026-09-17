"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight, LayoutTemplate, Zap, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TemplateBlueprint {
  id: string;
  title: string;
  category: string;
  description: string;
  nodeCount: number;
  tags: string[];
  complexity: "Beginner" | "Intermediate" | "Advanced";
}

const FEATURED_TEMPLATES: TemplateBlueprint[] = [
  {
    id: "tpl-1",
    title: "AI Lead Qualification Bot",
    category: "Sales Automation",
    description: "Ingests leads via Webhook, scores intent with AI, routes high-tier leads to Telegram, and logs others in Google Sheets.",
    nodeCount: 5,
    tags: ["Webhook", "AI Agent", "Switch", "Telegram"],
    complexity: "Intermediate",
  },
  {
    id: "tpl-2",
    title: "AI Email Digest Generator",
    category: "AI & Content",
    description: "Fetches daily feeds via HTTP Request, generates an executive summary using AI, and emails the briefing to subscribers.",
    nodeCount: 4,
    tags: ["Schedule", "HTTP Request", "AI Agent", "Email"],
    complexity: "Beginner",
  },
  {
    id: "tpl-3",
    title: "Competitor Monitoring Agent",
    category: "Operations & Intel",
    description: "Inspects competitor updates via HTTP GET, analyzes pricing & feature changes with AI, and posts intelligence reports on Discord.",
    nodeCount: 4,
    tags: ["Schedule", "HTTP Request", "AI Agent", "Discord"],
    complexity: "Intermediate",
  },
];

export function LandingTemplateSpotlight() {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateBlueprint | null>(null);

  return (
    <section id="templates" className="py-16 md:py-24 bg-surface border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-dim/80 px-2.5 py-1 text-xs font-semibold text-accent-ink border border-accent/40 mb-3">
              <LayoutTemplate className="h-3.5 w-3.5" />
              <span>One-Click Workflow Blueprints</span>
            </div>
            <h2 className="text-3xl font-extrabold text-ink sm:text-4xl tracking-tight">
              Start in Seconds with Pre-Built Templates
            </h2>
            <p className="mt-2 text-base text-ink-soft max-w-2xl">
              Don't build from scratch. Clone battle-tested workflows designed for AI operations, SaaS webhooks, and dev tooling.
            </p>
          </div>

          <Link href="/templates">
            <Button variant="outline" className="gap-2 bg-canvas border-border-strong shrink-0">
              Browse All Templates
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        {/* Template Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {FEATURED_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              className="rounded-2xl border border-border bg-canvas p-6 flex flex-col justify-between transition-all hover:border-border-strong hover:shadow-md group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span className="rounded-full bg-accent-dim px-2.5 py-0.5 text-[11px] font-semibold text-accent-ink">
                    {tpl.category}
                  </span>
                  <span className="text-[11px] font-mono text-ink-faint">
                    {tpl.complexity}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-ink group-hover:text-accent-ink transition-colors">
                  {tpl.title}
                </h3>

                <p className="mt-2 text-xs md:text-sm text-ink-soft leading-relaxed">
                  {tpl.description}
                </p>

                {/* Tags */}
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {tpl.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-surface px-2 py-1 text-[10px] font-mono font-medium text-ink-soft border border-border"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action footer */}
              <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
                <span className="text-xs text-ink-faint font-mono">
                  {tpl.nodeCount} Nodes
                </span>

                <Link href="/templates">
                  <Button variant="primary" size="sm" className="gap-1.5 text-xs">
                    <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
                    Use Blueprint
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
