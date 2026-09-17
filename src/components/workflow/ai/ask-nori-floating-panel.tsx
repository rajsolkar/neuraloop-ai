"use client";

import React, { useState } from "react";
import { Mascot } from "@/components/mascot/mascot";
import { Sparkles, Send, X, Bot, ArrowRight, Minimize2, Maximize2 } from "lucide-react";
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
  const [mood, setMood] = useState<MascotMood>("thinking");
  const [messages, setMessages] = useState<Array<{ sender: "user" | "nori"; text: string }>>([
    {
      sender: "nori",
      text: "Hi! I'm Nori. Tell me what to change in your workflow (e.g., 'Add Discord alerts', 'Replace Telegram with Slack', 'Add retry logic').",
    },
  ]);

  const handleSend = async () => {
    if (!prompt.trim() || loading) return;

    const userMsg = prompt.trim();
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

      if (!res.ok) {
        throw new Error("Refinement API failed");
      }

      const data = await res.json();
      if (data.modified && data.workflow) {
        onApplyRefinement(data.workflow, data.refinementSummary);
        setMessages((prev) => [
          ...prev,
          { sender: "nori", text: `✅ ${data.refinementSummary}` },
        ]);
        setMood("happy");
      } else {
        setMessages((prev) => [
          ...prev,
          { sender: "nori", text: `I understood '${userMsg}'. ${data.refinementSummary || "Graph updated."}` },
        ]);
        setMood("default");
      }
    } catch {
      // Local fallback refiner if backend route isn't hit
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
          { sender: "nori", text: `Processed: ${localRes.refinementSummary}` },
        ]);
        setMood("thinking");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 bg-[#A7B3A1] hover:bg-[#97a391] text-slate-950 font-bold rounded-full shadow-2xl border-2 border-slate-700/30 transition-all hover:scale-105 ${className}`}
      >
        <Mascot mood="happy" size="xs" animate />
        <span>Ask Nori</span>
        <Sparkles className="w-4 h-4 text-amber-800" />
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-80 md:w-96 bg-[#A7B3A1] border-2 border-slate-700/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900 animate-in fade-in zoom-in-95 duration-200 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Mascot mood={mood} size="xs" animate />
          <div>
            <div className="font-bold text-xs flex items-center gap-1">
              Ask Nori <Sparkles className="w-3 h-3 text-amber-400" />
            </div>
            <div className="text-[10px] text-slate-300">AI Workflow Copilot</div>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="p-3 space-y-2.5 max-h-64 overflow-y-auto text-xs">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2 ${m.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {m.sender === "nori" && <Bot className="w-4 h-4 text-slate-800 shrink-0 mt-0.5" />}
            <div
              className={`p-2.5 rounded-xl leading-relaxed max-w-[85%] ${
                m.sender === "user"
                  ? "bg-slate-900 text-white rounded-br-none"
                  : "bg-white/60 text-slate-900 border border-white/40 rounded-bl-none shadow-xs font-medium"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input Footer */}
      <div className="p-3 bg-slate-900/10 border-t border-slate-700/20 flex gap-2 items-center">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Ask Nori to refine workflow..."
          className="bg-white/80 border-slate-400 text-xs text-slate-900 focus:bg-white"
        />
        <Button
          onClick={handleSend}
          disabled={loading || !prompt.trim()}
          size="sm"
          className="bg-slate-900 hover:bg-slate-800 text-white px-3 shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
