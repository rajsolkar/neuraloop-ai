"use client";

import { useState } from "react";
import {
  Workflow,
  Cpu,
  Lock,
  Clock,
  Activity,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

interface FeatureItem {
  id: string;
  title: string;
  badge: string;
  icon: typeof Workflow;
  description: string;
  bullets: string[];
  codeSnippet: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: "canvas",
    title: "Visual Drag & Drop Canvas",
    badge: "React Flow v12",
    icon: Workflow,
    description:
      "Design complex logic visually without writing glue code. Connect webhooks, AI models, custom JS scripts, and databases seamlessly.",
    bullets: [
      "Strict handle-to-handle type checking",
      "Interactive node config drawer",
      "One-click version publishing and diffing",
    ],
    codeSnippet: `// Node Definition Schema
const WebhookNode = defineNode({
  type: "webhook",
  inputs: [],
  outputs: [{ id: "body", type: "json" }],
});`,
  },
  {
    id: "bullmq",
    title: "High-Throughput BullMQ Engine",
    badge: "Redis Queues",
    icon: Cpu,
    description:
      "Engineered for sub-50ms execution latency. Handles spike traffic effortlessly with distributed worker concurrency and automatic retry backoffs.",
    bullets: [
      "Zero-blocking worker queue processing",
      "Exponential backoff retry policy",
      "Isolated execution step runtimes",
    ],
    codeSnippet: `// BullMQ Distributed Queue Dispatcher
await executionQueue.add("run-step", {
  executionId: "exec_84912",
  nodeId: "n-3",
}, { attempts: 3, backoff: { type: "exponential" } });`,
  },
  {
    id: "vault",
    title: "AES-256 Encrypted Credential Vault",
    badge: "Multi-Tenant Isolation",
    icon: Lock,
    description:
      "Store API keys, OAuth tokens, and database credentials safely. Credentials are encrypted at rest and scoped strictly to organization workspaces.",
    bullets: [
      "AES-256-GCM authenticated encryption",
      "Clerk organization RBAC protection",
      "Masked parameter previewing",
    ],
    codeSnippet: `// AES-256 Decryption inside Isolated Execution Context
const decryptedKey = decryptCredential(
  credential.encryptedPayload,
  process.env.ENCRYPTION_SECRET
);`,
  },
  {
    id: "scheduler",
    title: "Timezone-Aware Cron Scheduler",
    badge: "Production Daemon",
    icon: Clock,
    description:
      "Automate periodic workflows with precision. Supports standard cron syntax, UTC storage, and timezone conversions.",
    bullets: [
      "No duplicate trigger guarantees",
      "Survives process and server restarts",
      "Flexible schedule intervals (minute, hour, cron)",
    ],
    codeSnippet: `// Scheduler Daemon Tick Guard
const dueSchedules = await prisma.schedule.findMany({
  where: { nextRunAt: { lte: new Date() }, enabled: true }
});`,
  },
  {
    id: "sse",
    title: "Real-Time SSE Execution Stream",
    badge: "Server-Sent Events",
    icon: Activity,
    description:
      "Watch your workflows execute live. Stream node completion status, execution duration, and failure diagnostics instantly to the UI.",
    bullets: [
      "Sub-second event bus streaming",
      "Node duration metrics & slow node detection",
      "Heartbeat auto-reconnection handling",
    ],
    codeSnippet: `// Real-Time Event Bus Subscription
eventBus.on("node_completed", (data) => {
  controller.enqueue(\`data: \${JSON.stringify(data)}\\n\\n\`);
});`,
  },
];

export function LandingFeaturesShowcase() {
  const [activeFeatureId, setActiveFeatureId] = useState<string>("canvas");
  const activeFeature = FEATURES.find((f) => f.id === activeFeatureId) || FEATURES[0];

  return (
    <section id="features" className="py-16 md:py-24 bg-canvas">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-dim/80 px-2.5 py-1 text-xs font-semibold text-accent-ink border border-accent/40 mb-3">
            <span>Architecture & Infrastructure</span>
          </div>
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl tracking-tight">
            Built for Scale, Security & Speed
          </h2>
          <p className="mt-3 text-base md:text-lg text-ink-soft">
            Explore the production-grade building blocks powering Neuraloop workflows.
          </p>
        </div>

        {/* Feature Selector Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Tab List */}
          <div className="lg:col-span-5 space-y-3">
            {FEATURES.map((feat) => {
              const Icon = feat.icon;
              const isActive = feat.id === activeFeatureId;

              return (
                <button
                  key={feat.id}
                  onClick={() => setActiveFeatureId(feat.id)}
                  className={`w-full text-left rounded-xl p-4 transition-all flex items-start gap-4 border ${
                    isActive
                      ? "bg-surface border-accent-ink ring-2 ring-accent/50 shadow-md"
                      : "bg-surface/50 border-border hover:bg-surface hover:border-border-strong"
                  }`}
                >
                  <div
                    className={`rounded-lg p-2.5 shrink-0 ${
                      isActive
                        ? "bg-ink text-accent"
                        : "bg-canvas text-ink-soft"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-ink">
                        {feat.title}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft mt-1 line-clamp-2">
                      {feat.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Active Feature Detail Box */}
          <div className="lg:col-span-7 rounded-2xl border border-border-strong bg-surface p-6 sm:p-8 shadow-xl">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-ink p-2 text-accent">
                  <activeFeature.icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink">
                    {activeFeature.title}
                  </h3>
                  <span className="text-xs font-mono text-accent-ink font-semibold">
                    {activeFeature.badge}
                  </span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="mt-5 text-sm md:text-base text-ink-soft leading-relaxed">
              {activeFeature.description}
            </p>

            {/* Bullets */}
            <div className="mt-5 space-y-2">
              {activeFeature.bullets.map((b, i) => (
                <div key={i} className="flex items-center gap-2 text-xs md:text-sm text-ink font-medium">
                  <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {/* Code snippet preview */}
            <div className="mt-6 pt-4 border-t border-border">
              <div className="text-[11px] font-mono font-semibold text-ink-faint uppercase tracking-wider mb-2">
                Implementation Spec
              </div>
              <div className="rounded-xl bg-ink p-4 text-xs font-mono text-accent-dim overflow-x-auto shadow-inner border border-ink/40">
                <pre>{activeFeature.codeSnippet}</pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
