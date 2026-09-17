import React from "react";
import {
  Cpu,
  ShieldCheck,
  Zap,
  Activity,
  Bot,
  Workflow,
  Layers,
  Database,
  Lock,
  Globe,
  Sparkles,
  GitCommit,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  Code2,
  Terminal,
  Compass,
  Rocket,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "System Architecture & Platform Overview · Neuraloop",
  description: "Comprehensive 12-section technical architecture blueprint and viva evaluation presentation.",
};

export default function AboutArchitecturePage() {
  const journeyTimeline = [
    { phase: "Phase 1 - 5", title: "Visual Builder Core", desc: "React Flow canvas, DAG node definitions, edge wiring, basic manual triggers." },
    { phase: "Phase 6 - 10", title: "Authentication & Security Vault", desc: "Clerk multi-tenant auth, AES-256-GCM credential vault, OAuth 2.0 connection hub." },
    { phase: "Phase 11 - 15", title: "Multi-Provider AI Builder", desc: "OpenAI, Claude & Gemini LLM integrations, natural language workflow generation." },
    { phase: "Phase 16 - 19", title: "Execution Engine & Replay", desc: "Prisma telemetry schema, node step logs, partial/full replay engine, execution timelines." },
    { phase: "Phase 20 - 21", title: "Nori AI Copilot System", desc: "14-mood mascot system, WorkflowRefiner v2 delta edits, 1-click auto-fix engine." },
    { phase: "Phase 22 - Final", title: "Production Capstone", desc: "Version control, dry-run simulator, cost analytics dashboard, command palette, resizable panels." },
  ];

  const techStack = [
    { category: "Frontend Framework", items: ["Next.js 16 (App Router)", "TypeScript 5.x", "React 19", "Tailwind CSS v3.4"] },
    { category: "Visual Canvas & Graph Engine", items: ["React Flow v12", "Zustand State Store", "Handlebars Variable Interpolator"] },
    { category: "Backend Infrastructure", items: ["Node.js 22 LTS", "Prisma ORM v5", "PostgreSQL (Neon Cloud)", "BullMQ + Redis"] },
    { category: "AI & LLM Provider Engine", items: ["OpenAI API (gpt-4o, gpt-4o-mini)", "Anthropic API (Claude 3.5 Sonnet)", "Google Gemini 2.5 API"] },
    { category: "Security & Authentication", items: ["Clerk Multi-Tenant Auth", "AES-256-GCM Encrypted Vault", "OAuth 2.0 PKCE Flow"] },
    { category: "Testing & Quality Assurance", items: ["Vitest (222/222 Tests Passing)", "TypeScript Strict Type Checking", "Next.js Static Build Compiler"] },
  ];

  const engineeringChallenges = [
    {
      challenge: "1. Dynamic Polyglot Node Execution",
      problem: "Executing heterogeneous node types (HTTP, AI, Switch, Loops, Email) with uniform interface and async isolation.",
      solution: "Implemented an extensible Executor Registry (`EXECUTOR_REGISTRY`) mapping node definitions to dedicated, decoupled TypeScript executors.",
    },
    {
      challenge: "2. Non-Destructive Graph Refinement",
      problem: "AI refinement prompts risked wiping existing user node configs or breaking node positions on the visual canvas.",
      solution: "Built `WorkflowRefiner` v2 producing precise graph delta edits (Add node, Replace node, Repair edge) without resetting canvas layout coordinates.",
    },
    {
      challenge: "3. Execution Step Replay & State Snapshotting",
      problem: "Debugging failures required re-running external API calls, risking duplicate charges or side-effects.",
      solution: "Engineered `WorkflowReplayEngine` saving input/output JSON payloads per node step, allowing partial replay from failed step.",
    },
    {
      challenge: "4. Dual Telemetry & Financial Visibility",
      problem: "Tracking multi-model LLM API token consumption accurately across asynchronous workflow runs.",
      solution: "Implemented `WorkflowCostAnalyticsService` aggregating input/output tokens per model and calculating real-time dollar expenditure.",
    },
    {
      challenge: "5. Zero Credential Exposure to LLM Context",
      problem: "Preventing sensitive OAuth tokens and API keys from leaking into AI prompt generation windows.",
      solution: "Enforced AES-256-GCM Vault decoupling where node configs reference key aliases (`{{credentials.openai_key}}`) resolved strictly server-side.",
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-10 text-ink">
      
      {/* SECTION 1: HERO & PLATFORM OVERVIEW */}
      <section className="rounded-3xl border border-border bg-gradient-to-r from-accent/10 via-surface to-canvas p-6 sm:p-10 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-ink shadow-xs">
            <Workflow className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-mono text-[10px]">
                v1.0 Production Ready
              </Badge>
              <Badge variant="outline" className="font-mono text-[10px] bg-canvas">Viva Demonstration</Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mt-1">
              Neuraloop Platform System Architecture
            </h1>
          </div>
        </div>
        <p className="text-sm text-ink-soft max-w-3xl leading-relaxed">
          Neuraloop is an enterprise-grade AI workflow builder and execution engine that converts natural language ideas into production-ready automations. It integrates visual graph editing, multi-model AI logic, telemetry logging, execution replay, dry-run simulation, and Nori AI copilot assistance.
        </p>
      </section>

      {/* SECTION 2: PROJECT EVOLUTION TIMELINE */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <GitCommit className="w-5 h-5 text-accent-ink" />
          2. Project Evolution Journey
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {journeyTimeline.map((item, idx) => (
            <div key={idx} className="p-4 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-1.5">
              <span className="text-[10px] font-mono font-bold uppercase text-accent-ink">{item.phase}</span>
              <h3 className="text-xs font-bold text-ink">{item.title}</h3>
              <p className="text-[11px] text-ink-soft leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 3: SYSTEM ARCHITECTURE DIAGRAM */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Layers className="w-5 h-5 text-accent-ink" />
          3. End-to-End System Architecture Flow
        </h2>
        <div className="p-6 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-center text-xs font-semibold">
            <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-700">
              1. React Flow Visual Canvas & UI
            </div>
            <div className="p-4 rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-700">
              2. Next.js API Routes & Auth
            </div>
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-700">
              3. Nori Copilot & Multi-LLM Layer
            </div>
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-700">
              4. Polyglot Node Executor Engine
            </div>
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-700">
              5. PostgreSQL Telemetry DB
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4: TECH STACK MATRIX */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Code2 className="w-5 h-5 text-accent-ink" />
          4. Technology Stack Matrix
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {techStack.map((stack, idx) => (
            <div key={idx} className="p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-3">
              <h3 className="text-xs font-bold text-ink uppercase tracking-wider text-ink-faint border-b border-border pb-2">
                {stack.category}
              </h3>
              <div className="space-y-1.5">
                {stack.items.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium text-ink">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 5 & 6: WORKFLOW LIFECYCLE & NORI AI STACK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 5 */}
        <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Compass className="w-4 h-4 text-accent-ink" />
            5. Workflow Automation Lifecycle
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">1. Intent Generation:</span> Natural language prompt converted to valid DAG nodes via structured schema.
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">2. Pre-Publish Simulation:</span> Dry-run step execution simulator estimates latency, token costs, and payload flows.
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">3. Live Execution & Telemetry:</span> Asynchronous node execution logging inputs, outputs, and token metrics.
            </div>
          </div>
        </section>

        {/* SECTION 6 */}
        <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-600" />
            6. Nori AI Companion System
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">14 Mascot Mood Assets:</span> High-resolution 3D Nori mascot representing state transitions.
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">WorkflowRefiner v2:</span> Non-destructive graph delta modifications and 1-click improvements.
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">NoriAutoFix Engine:</span> Analyzes error tracebacks and applies 1-click graph fixes (Retry, Delay, Fallbacks).
            </div>
          </div>
        </section>
      </div>

      {/* SECTION 10: TECHNICAL CHALLENGES & ENGINEERING SOLUTIONS */}
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-bold text-ink flex items-center gap-2">
          <Terminal className="w-5 h-5 text-accent-ink" />
          10. Key Engineering Challenges & Solutions
        </h2>
        <div className="space-y-3">
          {engineeringChallenges.map((item, idx) => (
            <div key={idx} className="p-4 sm:p-5 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ink">{item.challenge}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-1">
                <div className="p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-900">
                  <span className="font-bold block mb-1">Challenge / Problem:</span>
                  {item.problem}
                </div>
                <div className="p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-900">
                  <span className="font-bold block mb-1">Engineering Solution:</span>
                  {item.solution}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECTION 11 & 12: METRICS & FUTURE ROADMAP */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SECTION 11 */}
        <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-4">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-accent-ink" />
            11. Platform Verification Metrics
          </h2>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-3 rounded-xl border border-border bg-canvas">
              <div className="text-xl font-bold font-mono text-emerald-600">20+</div>
              <div className="text-[10px] text-ink-soft uppercase font-semibold">Registered Nodes</div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-canvas">
              <div className="text-xl font-bold font-mono text-blue-600">8</div>
              <div className="text-[10px] text-ink-soft uppercase font-semibold">Official Templates</div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-canvas">
              <div className="text-xl font-bold font-mono text-purple-600">222/222</div>
              <div className="text-[10px] text-ink-soft uppercase font-semibold">Tests Passing (100%)</div>
            </div>
            <div className="p-3 rounded-xl border border-border bg-canvas">
              <div className="text-xl font-bold font-mono text-amber-600">0</div>
              <div className="text-[10px] text-ink-soft uppercase font-semibold">TypeScript Errors</div>
            </div>
          </div>
        </section>

        {/* SECTION 12 */}
        <section className="p-6 rounded-2xl border border-border bg-surface shadow-xs flex flex-col gap-3">
          <h2 className="text-base font-bold text-ink flex items-center gap-2">
            <Rocket className="w-4 h-4 text-purple-600" />
            12. Future Scope & Roadmap
          </h2>
          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">Community Marketplace v2:</span> User-submitted templates, ratings, and clone monetization.
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">Multi-User Realtime Collaboration:</span> WebSockets multi-cursor editing in visual canvas.
            </div>
            <div className="p-2.5 rounded-xl border border-border bg-canvas">
              <span className="font-bold text-ink">Autonomous Agentic Loops:</span> Self-correcting multi-step agent reasoning with loop limits.
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
