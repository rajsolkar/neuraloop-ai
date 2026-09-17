import React from "react";
import { Cpu, ShieldCheck, Zap, Activity, Bot, Workflow, Layers, Database, Lock, Globe, Sparkles, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "System Architecture & Platform Overview · Neuraloop",
  description: "Complete technical architecture overview of the Neuraloop AI workflow engine.",
};

export default function AboutArchitecturePage() {
  const subsystems = [
    {
      id: "engine",
      title: "1. Visual Canvas & Workflow Engine",
      icon: Workflow,
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      description: "React Flow v12 visual builder with strict handle-to-handle type enforcement, Zustand state snapshot history, and non-destructive graph diffing.",
      highlights: ["React Flow v12 UI Canvas", "Handlebars Variable Reference Engine ({{steps.node.output}})", "Auto-Layout DAG Topology Spacing"],
    },
    {
      id: "bullmq",
      title: "2. BullMQ High-Throughput Queue & Workers",
      icon: Cpu,
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      description: "Distributed Redis-backed worker queues powering sub-50ms execution step dispatches, concurrency isolation, and exponential backoff retries.",
      highlights: ["Redis BullMQ Job Dispatcher", "Exponential Backoff Policy", "Step Execution Isolation"],
    },
    {
      id: "vault",
      title: "3. Credential Vault & Security Sandbox",
      icon: ShieldCheck,
      color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      description: "AES-256-GCM authenticated encryption for API keys and OAuth tokens. Never exposes raw credentials to LLM prompt context or browser state.",
      highlights: ["AES-256-GCM Encrypted Vault", "Zero API Key Fallback Policy", "Clerk Multi-Tenant Workspace Security"],
    },
    {
      id: "oauth",
      title: "4. OAuth 2.0 Integration Hub",
      icon: Globe,
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
      description: "Automated OAuth authorization flows and background token refreshes for Google Workspace, GitHub, and Slack APIs.",
      highlights: ["1-Click OAuth Grant Flows", "Automatic Refresh Token Handler", "Provider Scope Management"],
    },
    {
      id: "ai-layer",
      title: "5. Multi-Provider BYOK AI LLM Layer",
      icon: Sparkles,
      color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
      description: "Unified LLM executor supporting OpenAI (gpt-4o, gpt-4o-mini), Anthropic Claude 3.5, and Google Gemini 2.5 with JSON Schema validation and Planner mode.",
      highlights: ["OpenAI, Claude & Gemini Executors", "Structured JSON Schema Validation", "Planner Mode Step Decomposition"],
    },
    {
      id: "nori",
      title: "6. Nori Copilot, Refiner & Auto-Fix Engine",
      icon: Bot,
      color: "bg-green-500/10 text-green-600 border-green-500/20",
      description: "AI companion providing 14 mood states, 1-click graph refinements, non-destructive auto-optimizations, and execution failure 1-click auto-fixes.",
      highlights: ["14 Mood Mascot System (#A7B3A1 Styling)", "WorkflowRefiner v2 Delta Edits", "NoriAutoFix 1-Click Repair Engine"],
    },
    {
      id: "observability",
      title: "7. Observability, Replay & Telemetry",
      icon: Activity,
      color: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20",
      description: "Complete execution history logging, node timeline step inspection, partial/full workflow replay engine, and Architecture + Health dual scoring.",
      highlights: ["Execution Step Timeline Viewer", "Partial Node Step Replay", "Dual Rating Score (Architecture + Health)"],
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8 text-ink">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-accent/10 via-surface to-canvas p-6 sm:p-8 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-ink">
            <Layers className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Neuraloop Platform System Architecture
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft">
              Comprehensive architectural blueprint for evaluation, viva demonstrations, and production platform validation.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-xs font-mono bg-canvas">Next.js 16 App Router</Badge>
          <Badge variant="outline" className="text-xs font-mono bg-canvas">Prisma ORM + PostgreSQL</Badge>
          <Badge variant="outline" className="text-xs font-mono bg-canvas">BullMQ + Redis</Badge>
          <Badge variant="outline" className="text-xs font-mono bg-canvas">React Flow v12</Badge>
          <Badge variant="outline" className="text-xs font-mono bg-canvas">AES-256 Vault</Badge>
          <Badge variant="outline" className="text-xs font-mono bg-canvas">Clerk Multi-Tenant Auth</Badge>
        </div>
      </div>

      {/* Subsystems Stack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {subsystems.map((sub) => {
          const Icon = sub.icon;
          return (
            <div
              key={sub.id}
              className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col justify-between gap-4 transition-all hover:border-accent/40"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={`p-2 rounded-xl border font-bold text-xs ${sub.color}`}>
                    <Icon className="w-4 h-4 inline mr-1.5" />
                    {sub.title}
                  </span>
                </div>
                <p className="text-xs text-ink-soft leading-relaxed mt-2">{sub.description}</p>
              </div>

              <div className="space-y-1.5 border-t border-border/60 pt-3">
                {sub.highlights.map((h, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] text-ink font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
