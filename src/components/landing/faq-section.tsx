"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Sparkles, ArrowRight, ShieldCheck, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: "How does Neuraloop execute backend workflows?",
    answer:
      "Neuraloop uses a distributed BullMQ engine powered by Redis queues. When a webhook, schedule, or manual trigger fires, execution steps are placed in priority queues and processed asynchronously by decoupled worker daemons with sub-50ms latency.",
  },
  {
    question: "How are my API credentials and secrets protected?",
    answer:
      "All credentials stored in the Neuraloop Vault are encrypted using AES-256-GCM before being saved in Neon PostgreSQL database. Credentials are strictly isolated per Clerk organization workspace and never exposed in client bundles.",
  },
  {
    question: "Can I trigger workflows via Webhooks and Cron schedules?",
    answer:
      "Yes! Every published workflow can have zero-latency Webhook endpoints (POST/GET) and timezone-aware Cron schedule triggers (minute, hour, daily, or custom cron expressions).",
  },
  {
    question: "How does multi-tenant organization sharing work?",
    answer:
      "Neuraloop is deeply integrated with Clerk Organizations. Workspaces allow team members to collaborate on workflows, share credential vaults, inspect shared execution histories, and clone team templates.",
  },
  {
    question: "Can I write custom JavaScript/TypeScript code inside nodes?",
    answer:
      "Yes, Neuraloop includes a custom Code Node executor allowing you to manipulate payloads, filter JSON arrays, format outputs, or compute dynamic values directly inside the visual canvas.",
  },
];

export function LandingFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-16 md:py-24 bg-surface border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-dim/80 px-2.5 py-1 text-xs font-semibold text-accent-ink border border-accent/40 mb-3">
            <span>Got Questions?</span>
          </div>
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-3 text-base text-ink-soft">
            Everything you need to know about Neuraloop's engine, security, and multi-tenant capabilities.
          </p>
        </div>

        {/* Accordion List */}
        <div className="max-w-3xl mx-auto space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-xl border border-border bg-canvas overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(idx)}
                  className="w-full text-left p-5 flex items-center justify-between font-bold text-sm md:text-base text-ink hover:bg-surface/60 transition-colors"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-ink-soft shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180 text-accent-ink" : ""
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="p-5 pt-0 text-xs md:text-sm text-ink-soft leading-relaxed border-t border-border/40 bg-surface/30">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom High-Converting CTA Banner */}
        <div className="mt-20 rounded-3xl bg-ink p-8 sm:p-12 text-surface text-center relative overflow-hidden shadow-2xl border border-ink/80">
          <div
            className="absolute inset-0 -z-0 bg-[radial-gradient(#39ff14_1px,transparent_1px)] [background-size:24px_24px] opacity-10"
            aria-hidden
          />
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-surface">
              Ready to Automate Your Engineering Workflows?
            </h2>
            <p className="mt-4 text-sm sm:text-base text-surface/80 leading-relaxed">
              Join thousands of developers building, triggering, and scaling visual workflows in public beta. No credit card required.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/workflows" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto gap-2 text-base px-8 py-6 shadow-md">
                  <Sparkles className="h-5 w-5 text-accent-ink" />
                  Launch Workspace Free
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-ink-soft">
          <div className="flex items-center gap-2">
            <span className="font-bold text-ink">Neuraloop © 2026</span>
            <span className="text-ink-faint">•</span>
            <span className="flex items-center gap-1.5 text-accent-ink font-semibold">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              All Systems Operational
            </span>
          </div>

          <div className="flex items-center gap-6">
            <a href="#features" className="hover:text-ink">Features</a>
            <a href="#demo" className="hover:text-ink">Simulator</a>
            <a href="#templates" className="hover:text-ink">Templates</a>
            <a href="#pricing" className="hover:text-ink">Pricing</a>
            <Link href="/workflows" className="hover:text-ink font-semibold text-accent-ink">Dashboard</Link>
          </div>
        </footer>
      </div>
    </section>
  );
}
