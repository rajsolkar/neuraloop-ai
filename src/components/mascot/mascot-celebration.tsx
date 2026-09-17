"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mascot } from "./mascot";
import { Button } from "@/components/ui/button";
import { Sparkles, X } from "lucide-react";

export interface MascotCelebrationProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  metrics?: { label: string; value: string | number }[];
  primaryAction?: { label: string; onClick: () => void };
}

export function MascotCelebration({
  isOpen,
  onClose,
  title = "Workflow Executed Successfully!",
  subtitle = "Nori ran all nodes without errors and delivered the result.",
  metrics,
  primaryAction,
}: MascotCelebrationProps) {
  useEffect(() => {
    if (isOpen) {
      // celebration trigger hook
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md bg-zinc-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl shadow-emerald-950/40 text-center overflow-hidden"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Mascot in Celebrating Mood */}
            <div className="my-2 flex justify-center">
              <Mascot
                mood="celebrating"
                size="lg"
                message="Woohoo! Flawless execution!"
                bubblePosition="top"
              />
            </div>

            <div className="mt-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                Success
              </div>
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-zinc-400 mb-6">{subtitle}</p>

              {metrics && metrics.length > 0 && (
                <div className="grid grid-cols-2 gap-3 mb-6 bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80">
                  {metrics.map((m, idx) => (
                    <div key={idx} className="text-center">
                      <span className="block text-xs text-zinc-500">{m.label}</span>
                      <span className="block text-sm font-semibold text-emerald-400">{m.value}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-center gap-3">
                {primaryAction ? (
                  <Button
                    onClick={primaryAction.onClick}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  >
                    {primaryAction.label}
                  </Button>
                ) : (
                  <Button
                    onClick={onClose}
                    className="w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium border border-zinc-700"
                  >
                    Awesome!
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
