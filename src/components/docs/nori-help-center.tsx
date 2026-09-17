"use client";

import React, { useState } from "react";
import { Search, Sparkles, BookOpen, HelpCircle, ChevronRight, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Mascot } from "@/components/mascot/mascot";

const DOC_TOPICS = [
  {
    id: "getting-started",
    title: "Getting Started with Neuraloop",
    category: "Basics",
    content: "Neuraloop lets you visually design, trigger, and scale automation workflows using node blocks (Triggers, Actions, Logic). Connect Webhooks or Schedules to start workflows.",
  },
  {
    id: "ai-nodes",
    title: "AI Nodes & BYOK Model Setup",
    category: "AI",
    content: "Run prompts using OpenAI (gpt-4o, gpt-4o-mini), Anthropic Claude, or Google Gemini. Configure prompts, temperature, Planner mode, and JSON structured outputs.",
  },
  {
    id: "handlebars-variables",
    title: "Variables & Handlebars Expressions",
    category: "Data",
    content: "Reference outputs from previous steps using double curly braces: {{input.body}}, {{steps.ai.output.text}}, or {{steps.http.output.body}}.",
  },
  {
    id: "oauth-connections",
    title: "OAuth 2.0 & Vault Connections",
    category: "Security",
    content: "Connect Google, GitHub, and Slack with 1-click OAuth. Credentials are stored with AES-256 encryption in the Vault.",
  },
  {
    id: "troubleshooting",
    title: "Troubleshooting Execution Failures",
    category: "Observability",
    content: "Inspect failed runs in Execution History. Use Nori Debug Assistant for plain-language error diagnosis and 1-click auto-fixes.",
  },
];

export function NoriHelpCenter() {
  const [search, setSearch] = useState("");
  const [selectedTopic, setSelectedTopic] = useState(DOC_TOPICS[0]);

  const filtered = DOC_TOPICS.filter(
    (t) =>
      !search.trim() ||
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.content.toLowerCase().includes(search.toLowerCase()) ||
      t.category.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex flex-col md:flex-row gap-6 text-ink">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-72 shrink-0 flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documentation..."
            className="pl-9 text-xs bg-canvas"
          />
        </div>

        <div className="flex flex-col gap-1">
          {filtered.map((topic) => (
            <button
              key={topic.id}
              onClick={() => setSelectedTopic(topic)}
              className={`p-3 rounded-xl border text-left text-xs transition-all flex items-center justify-between ${
                selectedTopic.id === topic.id
                  ? "bg-accent/15 border-accent text-accent-ink font-bold"
                  : "bg-surface border-border hover:bg-canvas text-ink-soft"
              }`}
            >
              <div>
                <div className="font-semibold">{topic.title}</div>
                <div className="text-[10px] opacity-70 font-mono mt-0.5">{topic.category}</div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 shrink-0 opacity-60" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Viewer with Nori Companion */}
      <div className="flex-1 rounded-2xl border border-border bg-surface p-6 shadow-xs flex flex-col gap-4">
        <div className="flex items-center gap-3 p-3 bg-[#A7B3A1]/30 border border-[#8e9a88]/40 rounded-xl">
          <Mascot mood="teaching" size="xs" animate />
          <div>
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
              Nori Documentation Assistant <Sparkles className="w-3 h-3 text-amber-700" />
            </div>
            <div className="text-[11px] text-slate-800">Reading topic: {selectedTopic.title}</div>
          </div>
        </div>

        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-accent-ink font-bold">
            {selectedTopic.category}
          </span>
          <h2 className="text-lg font-bold text-ink mt-0.5">{selectedTopic.title}</h2>
        </div>

        <div className="text-xs text-ink-soft leading-relaxed border-t border-border pt-4">
          <p className="text-sm font-normal text-ink">{selectedTopic.content}</p>
        </div>
      </div>
    </div>
  );
}
