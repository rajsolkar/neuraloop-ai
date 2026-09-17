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
    id: "ai-digest",
    name: "AI Email Digest Generator",
    description: "Triggers on daily schedule, fetches news feed via HTTP Request, runs AI summarizer, and emails executive digest.",
    nodes: [
      {
        id: "n-1",
        type: "schedule",
        title: "Daily Cron Trigger",
        category: "trigger",
        icon: Clock,
        configSummary: "Cron: 0 8 * * * (Every morning 8am UTC)",
        outputPreview: '{ "triggeredAt": "2026-09-17T08:00:00Z", "source": "cron" }',
      },
      {
        id: "n-2",
        type: "http-request",
        title: "Fetch Content Feed",
        category: "action",
        icon: Globe,
        configSummary: "GET https://api.github.com/zen",
        outputPreview: '{ "status": 200, "body": "Design for resilience." }',
      },
      {
        id: "n-3",
        type: "ai",
        title: "AI Agent / LLM",
        category: "action",
        icon: Sparkles,
        configSummary: 'Prompt: "Synthesize content feed into executive briefing"',
        outputPreview: '{ "text": "Executive Briefing: Design for resilience...", "provider": "openai" }',
      },
      {
        id: "n-4",
        type: "email",
        title: "Email Subscribers",
        category: "action",
        icon: Terminal,
        configSummary: "To: subscribers@company.com • Subject: Executive Briefing",
        outputPreview: '{ "delivered": true, "recipientCount": 1500 }',
      },
    ],
  },
  {
    id: "lead-qualifier",
    name: "AI Lead Qualification Bot",
    description: "Receives inbound lead webhooks, scores lead intent with AI, routes high priority leads to Telegram, and logs standard leads.",
    nodes: [
      {
        id: "n-1",
        type: "webhook",
        title: "Inbound Lead Webhook",
        category: "trigger",
        icon: Zap,
        configSummary: "Method: POST • Path: /api/webhooks/leads",
        outputPreview: '{ "name": "Alex", "company": "Acme Corp", "budget": "$50,000" }',
      },
      {
        id: "n-2",
        type: "ai",
        title: "AI Intent Scorer",
        category: "action",
        icon: Sparkles,
        configSummary: "Prompt: Classify lead tier HIGH or LOW",
        outputPreview: '{ "text": "HIGH TIER LEAD - Enterprise budget detected", "provider": "openai" }',
      },
      {
        id: "n-3",
        type: "switch",
        title: "Route Priority Tier",
        category: "logic",
        icon: Settings2,
        configSummary: 'Case 1: text contains "HIGH" → Telegram',
        outputPreview: '{ "matchedBranch": "case_1", "matchedLabel": "High Priority" }',
      },
    ],
  },
];

export function LandingInteractiveCanvasDemo() {
  const [activeBlueprintId, setActiveBlueprintId] = useState<string>("ai-digest");
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
            <div className="lg:col-span-8 p-4 sm:p-6 md:p-8 flex flex-col justify-between relative overflow-x-auto bg-[radial-gradient(#d3cdbc_1px,transparent_1px)] [background-size:16px_16px] scrollbar-thin">
              {/* Nodes Sequence Container */}
              <div className="flex flex-col md:flex-row items-center justify-start xl:justify-center gap-2 md:gap-2 my-auto py-6 min-w-max">
                {currentBlueprint.nodes.map((node, idx) => {
                  const Icon = node.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isActiveStep = activeStepIndex === idx;
                  const isCompleted = completedSteps.includes(idx);

                  return (
                    <div key={node.id} className="flex flex-col md:flex-row items-center gap-2 shrink-0">
                      {/* Node Card */}
                      <button
                        onClick={() => setSelectedNodeId(node.id)}
                        className={`w-60 md:w-40 lg:w-40 xl:w-44 rounded-xl border p-3 text-left transition-all relative shrink-0 ${
                          isSelected
                            ? "border-accent-ink bg-surface ring-2 ring-accent/60 shadow-md scale-[1.02]"
                            : "border-border bg-surface/90 hover:border-border-strong hover:bg-surface hover:scale-[1.01]"
                        } ${
                          isActiveStep ? "animate-bounce ring-2 ring-accent" : ""
                        }`}
                      >
                        {/* Status Indicator */}
                        <div className="flex items-center justify-between mb-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
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
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                          ) : isActiveStep ? (
                            <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-border-strong" />
                          )}
                        </div>

                        {/* Title & Icon */}
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-canvas p-1.5 border border-border shrink-0">
                            <Icon className="h-3.5 w-3.5 text-ink" />
                          </div>
                          <div className="font-bold text-xs text-ink truncate leading-tight">
                            {node.title}
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="mt-2 pt-1.5 border-t border-border/60 text-[10px] text-ink-soft truncate font-mono">
                          {node.type}
                        </div>
                      </button>

                      {/* Arrow Connecting Line */}
                      {idx < currentBlueprint.nodes.length - 1 && (
                        <div className="flex items-center justify-center py-1 md:py-0 shrink-0">
                          <div
                            className={`h-4 w-0.5 md:h-0.5 md:w-4 transition-colors ${
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
