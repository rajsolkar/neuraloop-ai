"use client";

import React from "react";
import { Mascot } from "./mascot";
import { type MascotMood } from "./mascot-assets";
import { Button } from "@/components/ui/button";

export interface MascotEmptyStateProps {
  title: string;
  description: string;
  mood?: MascotMood;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function MascotEmptyState({
  title,
  description,
  mood = "thinking",
  action,
  secondaryAction,
  className = "",
}: MascotEmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 backdrop-blur-xs ${className}`}
    >
      <div className="mb-4 relative">
        <Mascot mood={mood} size="lg" animate={true} />
      </div>

      <h3 className="text-lg sm:text-xl font-semibold text-zinc-100 mb-2">
        {title}
      </h3>

      <p className="text-sm text-zinc-400 max-w-md mb-6 leading-relaxed">
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {action && (
            <Button
              onClick={action.onClick}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2 shadow-lg shadow-emerald-950/40 transition-all duration-200"
            >
              {action.icon && <span className="mr-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}

          {secondaryAction && (
            <Button
              variant="outline"
              onClick={secondaryAction.onClick}
              className="border-zinc-700 text-zinc-300 hover:text-white hover:bg-zinc-800 font-medium px-4 py-2"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
