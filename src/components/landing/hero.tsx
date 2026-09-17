"use client";

import Link from "next/link";
import { ArrowRight, Zap, ShieldCheck, Cpu, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24">
      {/* Subtle background glow grid */}
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#e4dfd3_1px,transparent_1px),linear-gradient(to_bottom,#e4dfd3_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-40"
        aria-hidden
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          {/* Release Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-xs font-semibold text-ink shadow-xs transition-transform hover:scale-[1.02]">
            <span className="flex h-2 w-2 rounded-full bg-accent animate-ping" />
            <span className="font-mono text-ink-soft">v2.0 Beta Engine</span>
            <span className="text-ink-faint">•</span>
            <span className="text-accent-ink font-semibold">Visual Drag & Drop + BullMQ</span>
          </div>

          {/* Main Title */}
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-5xl md:text-6xl leading-[1.12]">
            Visual Automation for Modern Teams
          </h1>

          {/* Subtitle */}
          <p className="mt-6 text-lg md:text-xl text-ink-soft leading-relaxed max-w-2xl mx-auto">
            Design, trigger, and scale complex backend workflows visually. 
            Powered by high-throughput Redis queues, AES-256 credential vaults, and multi-tenant organization security.
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/workflows" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto gap-2 text-base px-6 py-6 shadow-md hover:shadow-lg transition-all"
              >
                <Zap className="h-5 w-5 fill-current text-accent-ink" />
                Build Workflow Now
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
            <a href="#demo" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto gap-2 text-base px-6 py-6 bg-surface hover:bg-canvas border-border-strong"
              >
                <Play className="h-4 w-4 text-ink-soft" />
                Interactive Live Demo
              </Button>
            </a>
          </div>

          {/* Micro trust features */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-ink-soft font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Clerk Multi-Tenant Auth</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="h-4 w-4 text-success" />
              <span>Real-time Execution SSE</span>
            </div>
          </div>
        </div>

        {/* Feature Stat Grid Cards */}
        <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-bold font-mono text-ink">&lt; 50ms</div>
            <div className="text-xs text-ink-soft mt-1">Queue Trigger Latency</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-bold font-mono text-accent-ink">99.99%</div>
            <div className="text-xs text-ink-soft mt-1">BullMQ Worker Uptime</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-bold font-mono text-ink">AES-256</div>
            <div className="text-xs text-ink-soft mt-1">Encrypted Vault Storage</div>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4 text-center shadow-2xs">
            <div className="text-2xl md:text-3xl font-bold font-mono text-ink">Cron & Webhook</div>
            <div className="text-xs text-ink-soft mt-1">Flexible Triggers</div>
          </div>
        </div>
      </div>
    </section>
  );
}
