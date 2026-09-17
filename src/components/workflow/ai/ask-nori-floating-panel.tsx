"use client";

import React, { useState, useEffect } from "react";
import { Mascot } from "@/components/mascot/mascot";
import { Sparkles, Send, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { MascotMood } from "@/components/mascot/mascot-assets";
import type { GeneratedWorkflowData } from "@/lib/ai/schema";
import { WorkflowRefiner } from "@/lib/ai/workflow-refiner";

interface AskNoriFloatingPanelProps {
  currentWorkflow: GeneratedWorkflowData;
  onApplyRefinement: (updatedWorkflow: GeneratedWorkflowData, summary: string) => void;
  className?: string;
}

export function AskNoriFloatingPanel({
  currentWorkflow,
  onApplyRefinement,
  className = "",
}: AskNoriFloatingPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [mood, setMood] = useState<MascotMood>("default");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "nori"; text: string }>>([
    {
      sender: "nori",
      text: "How can I help you improve or build this workflow?",
    },
  ]);

  // Keyboard shortcut Ctrl+K or Cmd+K to toggle Ask Nori
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSendPrompt = async (userMsg: string) => {
    if (!userMsg.trim() || loading) return;

    setPrompt("");
    setMessages((prev) => [...prev, { sender: "user", text: userMsg }]);
    setLoading(true);
    setMood("working");

    try {
      const res = await fetch("/api/nori/refine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workflow: currentWorkflow,
          prompt: userMsg,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.modified && data.workflow) {
          onApplyRefinement(data.workflow, data.refinementSummary);
          setMessages((prev) => [
            ...prev,
            { sender: "nori", text: `✅ ${data.refinementSummary}` },
          ]);
          setMood("happy");
          setLoading(false);
          return;
        }
      }
    } catch {
      // Ignore API errors and fallback to local refiner
    }

    // Local fallback refiner
    const localRes = WorkflowRefiner.refineWorkflow(currentWorkflow, userMsg);
    if (localRes.modified) {
      onApplyRefinement(localRes.workflow, localRes.refinementSummary);
      setMessages((prev) => [
        ...prev,
        { sender: "nori", text: `✅ ${localRes.refinementSummary}` },
      ]);
      setMood("happy");
    } else {
      setMessages((prev) => [
        ...prev,
        { sender: "nori", text: `I understood '${userMsg}'. ${localRes.refinementSummary}` },
      ]);
      setMood("default");
    }

    setLoading(false);
  };

  const quickSuggestions = [
    { label: "• Optimize workflow", prompt: "Optimize workflow architecture" },
    { label: "• Explain workflow", prompt: "Explain how this workflow operates" },
    { label: "• Add error handling", prompt: "Add failure notification" },
    { label: "• Reduce AI costs", prompt: "Reduce AI costs by 40%" },
  ];

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-3.5 py-2 bg-surface hover:bg-canvas text-ink text-xs font-medium rounded-full shadow-md border border-border transition-all hover:scale-105 ${className}`}
      >
        <span className="flex items-center gap-1 font-mono text-[10px] px-1.5 py-0.5 rounded bg-canvas text-ink-soft border border-border">
          ⌘K
        </span>
        <span>Ask Nori</span>
        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-5 right-5 z-50 w-80 bg-surface border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden text-ink animate-in fade-in zoom-in-95 duration-150 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-canvas border-b border-border">
        <div className="flex items-center gap-2">
          <Mascot mood={mood} size="xs" animate={false} />
          <div>
            <div className="font-semibold text-xs flex items-center gap-1 text-ink">
              Nori Assistant <Sparkles className="w-3 h-3 text-emerald-600" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-ink-faint px-1.5 py-0.5 rounded bg-surface border border-border">
            ⌘K
          </span>
          <button
            onClick={() => setIsOpen(false)}
            className="text-ink-faint hover:text-ink p-1 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Quick Action Suggestions List */}
      <div className="p-3 border-b border-border bg-canvas/50 flex flex-col gap-1">
        <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-faint px-1">
          Suggested Actions
        </span>
        <div className="grid grid-cols-2 gap-1.5 mt-1">
          {quickSuggestions.map((s, idx) => (
            <button
              key={idx}
              onClick={() => handleSendPrompt(s.prompt)}
              disabled={loading}
              className="text-left text-xs px-2.5 py-1.5 rounded-lg border border-border bg-surface hover:bg-canvas text-ink-soft hover:text-ink transition-colors font-medium truncate"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="p-3 space-y-2 max-h-56 overflow-y-auto text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-1.5 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "nori" && <Bot className="w-3.5 h-3.5 text-ink-soft shrink-0 mt-1" />}
            <div
              className={`p-2 rounded-xl leading-relaxed max-w-[85%] text-xs ${
                m.sender === "user"
                  ? "bg-ink text-surface rounded-br-none"
                  : "bg-canvas text-ink border border-border rounded-bl-none font-medium"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Footer */}
      <div className="p-2.5 bg-canvas border-t border-border flex gap-2 items-center">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendPrompt(prompt)}
          placeholder="Ask anything about this workflow..."
          className="bg-surface border-border text-xs text-ink h-8"
        />
        <Button
          onClick={() => handleSendPrompt(prompt)}
          disabled={loading || !prompt.trim()}
          size="sm"
          className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
