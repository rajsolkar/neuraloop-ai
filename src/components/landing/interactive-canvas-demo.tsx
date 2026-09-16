"use client";

import { useState, useEffect } from "react";
import {
  Play,
  RotateCcw,
  CheckCircle2,
  Clock,
  Sparkles,
  Zap,
  Code,
  Globe,
  Settings2,
  Terminal,
  ArrowRight,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DemoNode {
  id: string;
  type: string;
  title: string;
  category: "trigger" | "action" | "logic";
  icon: typeof Zap;
  configSummary: string;
  outputPreview: string;
}

interface WorkflowBlueprint {
  id: string;
  name: string;
  description: string;
  nodes: DemoNode[];
}

const BLUEPRINTS: WorkflowBlueprint[] = [
  {
    id: "ai-news",
    name: "AI News Summarizer",
    description: "Triggers on daily schedule, extracts top AI feeds, runs OpenAI summary, and responds via Webhook.",
    nodes: [
      {
        id: "n-1",
        type: "schedule",
        title: "Daily Cron Trigger",
        category: "trigger",
        icon: Clock,
        configSummary: "Cron: 0 9 * * * (Every morning 9am UTC)",
        outputPreview: '{ "triggeredAt": "2026-09-16T09:00:00Z", "source": "cron" }',
      },
      {
        id: "n-2",
        type: "set-variable",
        title: "Extract Topic Tags",
        category: "logic",
        icon: Settings2,
        configSummary: 'Var: topic = "LLMs & Agentic AI"',
        outputPreview: '{ "topic": "LLMs & Agentic AI", "count": 10 }',
      },
      {
        id: "n-3",
        type: "openai",
        title: "OpenAI GPT-4o Summarizer",
        category: "action",
        icon: Sparkles,
        configSummary: 'Prompt: "Summarize top 5 AI papers on {{topic}}"',
        outputPreview: '{ "summary": "1. Neuraloop v2 released...", "tokens": 342 }',
      },
      {
        id: "n-4",
        type: "webhook-response",
        title: "Dispatch Summary Webhook",
        category: "action",
        icon: Globe,
        configSummary: "Status: 200 OK • Content: application/json",
        outputPreview: '{ "success": true, "delivered": true, "latency": "142ms" }',
      },
    ],
  },
  {
    id: "stripe-router",
    name: "Stripe Payment Router",
    description: "Receives invoice payment webhooks, filters high-value events in JS Code, and syncs database.",
    nodes: [
      {
        id: "n-1",
        type: "webhook",
        title: "Stripe Webhook Listener",
        category: "trigger",
        icon: Zap,
        configSummary: "Method: POST • Path: /api/webhooks/stripe",
        outputPreview: '{ "event": "invoice.payment_succeeded", "amount": 29900 }',
      },
      {
        id: "n-2",
        type: "code",
        title: "Code Transform (JS)",
        category: "action",
        icon: Code,
        configSummary: "Script: calculateMRR(event.amount)",
        outputPreview: '{ "isVIP": true, "mrrContribution": 299 }',
      },
      {
        id: "n-3",
        type: "database",
        title: "Database Sync",
        category: "action",
        icon: Database,
        configSummary: "Table: subscriptions • Action: UPSERT",
        outputPreview: '{ "recordId": "sub_98412", "status": "active" }',
      },
    ],
  },
];

export function LandingInteractiveCanvasDemo() {
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>("ai-news");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("n-1");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [logMessages, setLogMessages] = useState<Array<{ text: string; time: string; type: "info" | "success" }>>([]);

  const currentBlueprint = BLUEPRINTS.find((b) => b.id === activeBlueprintId) || BLUEPRINTS[0];
  const selectedNode = currentBlueprint.nodes.find((n) => n.id === selectedNodeId) || currentBlueprint.nodes[0];

  // Handle blueprint change
  const handleSelectBlueprint = (id: string) => {
    setActiveBlueprintId(id);
    const bp = BLUEPRINTS.find((b) => b.id === id) || BLUEPRINTS[0];
    setSelectedNodeId(bp.nodes[0].id);
    setIsRunning(false);
    setActiveStepIndex(-1);
    setCompletedSteps([]);
    setLogMessages([
      {
        text: `Loaded blueprint "${bp.name}" with ${bp.nodes.length} nodes. Ready to simulate.`,
        time: new Date().toLocaleTimeString(),
        type: "info",
      },
    ]);
  };

  // Simulate workflow run
  const runSimulator = () => {
    if (isRunning) return;
    setIsRunning(true);
    setCompletedSteps([]);
    setActiveStepIndex(0);
    setLogMessages([
      {
        text: `🚀 Triggering workflow "${currentBlueprint.name}"...`,
        time: new Date().toLocaleTimeString(),
        type: "info",
      },
    ]);

    currentBlueprint.nodes.forEach((node, index) => {
      setTimeout(() => {
        setActiveStepIndex(index);
        setLogMessages((prev) => [
          ...prev,
          {
            text: `[Node ${index + 1}] Executing "${node.title}"...`,
            time: new Date().toLocaleTimeString(),
            type: "info",
          },
        ]);

        setTimeout(() => {
          setCompletedSteps((prev) => [...prev, index]);
          setLogMessages((prev) => [
            ...prev,
            {
              text: `✓ "${node.title}" completed in ${(Math.random() * 150 + 20).toFixed(0)}ms`,
              time: new Date().toLocaleTimeString(),
              type: "success",
            },
          ]);

          if (index === currentBlueprint.nodes.length - 1) {
            setIsRunning(false);
            setActiveStepIndex(-1);
            setLogMessages((prev) => [
              ...prev,
              {
                text: `🎉 Workflow execution finished successfully!`,
                time: new Date().toLocaleTimeString(),
                type: "success",
              },
            ]);
          }
        }, 600);
      }, index * 900);
    });
  };

  useEffect(() => {
    // Initial log message
    setLogMessages([
      {
        text: `Loaded blueprint "${currentBlueprint.name}". Click "Run Simulator" to test execution!`,
        time: new Date().toLocaleTimeString(),
        type: "info",
      },
    ]);
  }, []);

  return (
    <section id="demo" className="py-16 md:py-24 bg-surface border-y border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-accent-dim/80 px-2.5 py-1 text-xs font-semibold text-accent-ink border border-accent/40 mb-3">
            <Layers className="h-3.5 w-3.5" />
            <span>Interactive Simulator</span>
          </div>
          <h2 className="text-3xl font-extrabold text-ink sm:text-4xl tracking-tight">
            Experience the Canvas in Action
          </h2>
          <p className="mt-3 text-base md:text-lg text-ink-soft">
            Click nodes to view real-time configurations, or trigger an interactive execution sequence to see BullMQ step updates live.
          </p>
        </div>

        {/* Simulator Wrapper Box */}
        <div className="rounded-2xl border border-border-strong bg-canvas shadow-xl overflow-hidden">
          {/* Top Control Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border bg-surface px-6 py-4">
            {/* Blueprint selector pills */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-faint mr-1">
                Blueprint:
              </span>
              {BLUEPRINTS.map((bp) => (
                <button
                  key={bp.id}
                  onClick={() => handleSelectBlueprint(bp.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                    activeBlueprintId === bp.id
                      ? "bg-ink text-surface shadow-xs"
                      : "bg-canvas text-ink-soft hover:bg-border/60 hover:text-ink"
                  }`}
                >
                  {bp.name}
                </button>
              ))}
            </div>

            {/* Run button */}
            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={runSimulator}
                disabled={isRunning}
                className="gap-2 shadow-xs"
              >
                {isRunning ? (
                  <RotateCcw className="h-4 w-4 animate-spin text-accent-ink" />
                ) : (
                  <Play className="h-4 w-4 fill-current text-accent-ink" />
                )}
                {isRunning ? "Running Execution..." : "Run Simulator"}
              </Button>
            </div>
          </div>

          {/* Canvas & Inspector Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[420px]">
            {/* Interactive Visual Canvas Area */}
            <div className="lg:col-span-8 p-6 md:p-8 flex flex-col justify-between relative bg-[radial-gradient(#d3cdbc_1px,transparent_1px)] [background-size:16px_16px]">
              {/* Nodes Sequence Container */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-3 my-auto py-6">
                {currentBlueprint.nodes.map((node, idx) => {
                  const Icon = node.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isActiveStep = activeStepIndex === idx;
                  const isCompleted = completedSteps.includes(idx);

                  return (
                    <div key={node.id} className="flex flex-col md:flex-row items-center gap-3">
                      {/* Node Card */}
                      <button
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`w-64 md:w-52 rounded-xl border p-4 text-left transition-all relative ${
                          isSelected
                            ? "border-accent-ink bg-surface ring-2 ring-accent/60 shadow-md"
                            : "border-border bg-surface/90 hover:border-border-strong hover:bg-surface"
                        } ${
                          isActiveStep ? "animate-bounce ring-2 ring-accent" : ""
                        }`}
                      >
                        {/* Status Indicator */}
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              node.category === "trigger"
                                ? "bg-amber/15 text-amber"
                                : node.category === "logic"
                                ? "bg-violet/15 text-violet"
                                : "bg-blue/15 text-blue"
                            }`}
                          >
                            {node.category}
                          </span>
                          {isCompleted ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : isActiveStep ? (
                            <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-border-strong" />
                          )}
                        </div>

                        {/* Title & Icon */}
                        <div className="flex items-center gap-2.5">
                          <div className="rounded-lg bg-canvas p-2 border border-border">
                            <Icon className="h-4 w-4 text-ink" />
                          </div>
                          <div className="font-bold text-xs text-ink truncate">
                            {node.title}
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="mt-3 pt-2 border-t border-border/60 text-[11px] text-ink-soft truncate font-mono">
                          {node.type}
                        </div>
                      </button>

                      {/* Arrow Connecting Line */}
                      {idx < currentBlueprint.nodes.length - 1 && (
                        <div className="flex items-center justify-center py-1 md:py-0">
                          <div
                            className={`h-6 w-0.5 md:h-0.5 md:w-6 transition-colors ${
                              completedSteps.includes(idx)
                                ? "bg-accent shadow-xs"
                                : "bg-border-strong"
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Bottom Instructions / Active status bar */}
              <div className="flex items-center justify-between text-xs text-ink-soft pt-4 border-t border-border/60">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-accent" />
                  Click any node to inspect parameters & outputs
                </span>
                <span className="font-mono text-[11px] hidden sm:inline">
                  {currentBlueprint.nodes.length} Nodes Configured
                </span>
              </div>
            </div>

            {/* Inspector & Live Output Side Panel */}
            <div className="lg:col-span-4 border-t lg:border-t-0 lg:border-l border-border bg-surface p-6 flex flex-col justify-between">
              <div>
                {/* Node Inspector Header */}
                <div className="flex items-center justify-between pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <Settings2 className="h-4 w-4 text-accent-ink" />
                    <h3 className="font-bold text-sm text-ink">Node Inspector</h3>
                  </div>
                  <span className="font-mono text-xs text-ink-faint">
                    {selectedNode.id}
                  </span>
                </div>

                {/* Node details */}
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
                      Node Title
                    </label>
                    <div className="text-sm font-bold text-ink mt-0.5">
                      {selectedNode.title}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
                      Parameters & Config
                    </label>
                    <div className="mt-1 rounded-lg bg-canvas p-3 text-xs font-mono text-ink-soft border border-border">
                      {selectedNode.configSummary}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-ink-faint uppercase tracking-wider">
                      Simulated Output Payload
                    </label>
                    <div className="mt-1 rounded-lg bg-ink p-3 text-xs font-mono text-accent-dim overflow-x-auto shadow-inner">
                      <pre>{selectedNode.outputPreview}</pre>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Log Stream Console */}
              <div className="mt-6 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-ink mb-2">
                  <Terminal className="h-3.5 w-3.5 text-ink-soft" />
                  <span>Execution Event Stream</span>
                </div>
                <div className="h-28 rounded-lg bg-ink/95 p-2.5 text-[11px] font-mono text-surface overflow-y-auto space-y-1">
                  {logMessages.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.type === "success"
                          ? "text-accent"
                          : "text-surface/80"
                      }
                    >
                      <span className="text-ink-faint text-[10px] mr-2">
                        {log.time}
                      </span>
                      {log.text}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
