"use client";

import React, { useState, useEffect } from "react";
import { Mascot } from "./mascot";
import { X, CheckCircle2, Sparkles } from "lucide-react";

const COACH_DISMISSED_KEY = "neuraloop_nori_coach_dismissed";

export function MascotCoach({ className = "" }: { className?: string }) {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const isDismissed = localStorage.getItem(COACH_DISMISSED_KEY);
    if (!isDismissed) {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(COACH_DISMISSED_KEY, "true");
  };

  if (dismissed) return null;

  const steps = [
    { num: 1, title: "Add Trigger", desc: "Start with a Webhook or Schedule" },
    { num: 2, title: "Add Action", desc: "Process data with AI, Slack, or HTTP" },
    { num: 3, title: "Test Workflow", desc: "Run execution to verify output" },
    { num: 4, title: "Publish", desc: "Activate live execution schedule" },
  ];

  return (
    <div
      className={`bg-[#A7B3A1]/90 backdrop-blur border border-[#8e9a88] text-slate-900 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-start md:items-center gap-4 relative transition-all animate-in fade-in duration-300 ${className}`}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 text-slate-700 hover:text-slate-950 p-1 rounded-lg hover:bg-black/10 transition-colors"
        title="Dismiss guide"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-3 shrink-0">
        <Mascot mood="teaching" size="sm" animate />
        <div>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <Sparkles className="w-4 h-4 text-amber-700" />
            Nori's First Workflow Guide
          </div>
          <p className="text-xs text-slate-800">Follow these 4 simple steps to automate anything.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full pt-2 md:pt-0 border-t md:border-t-0 md:border-l border-slate-700/20 md:pl-4">
        {steps.map((step) => (
          <div
            key={step.num}
            className="flex items-start gap-2 p-2 bg-white/40 rounded-xl border border-white/30"
          >
            <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
              {step.num}
            </div>
            <div>
              <div className="font-semibold text-xs text-slate-900">{step.title}</div>
              <div className="text-[10px] text-slate-700 leading-tight">{step.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
