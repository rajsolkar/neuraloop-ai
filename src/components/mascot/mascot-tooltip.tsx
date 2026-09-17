"use client";

import React, { useState } from "react";
import { Mascot } from "./mascot";
import type { MascotMood } from "./mascot-assets";

interface MascotTooltipProps {
  mood?: MascotMood;
  message: string;
  children?: React.ReactNode;
  size?: "xs" | "sm" | "md";
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
}

export function MascotTooltip({
  mood = "teaching",
  message,
  children,
  size = "xs",
  position = "top",
  className = "",
}: MascotTooltipProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {children || <Mascot mood={mood} size={size} animate={isHovered} />}
      {isHovered && (
        <div
          className={`absolute z-50 min-w-[200px] max-w-[280px] p-3 text-xs font-medium text-slate-800 bg-[#A7B3A1] rounded-xl shadow-lg border border-[#8e9a88] animate-in fade-in zoom-in-95 duration-150 ${
            position === "top"
              ? "bottom-full mb-2 left-1/2 -translate-x-1/2"
              : position === "bottom"
              ? "top-full mt-2 left-1/2 -translate-x-1/2"
              : position === "left"
              ? "right-full mr-2 top-1/2 -translate-y-1/2"
              : "left-full ml-2 top-1/2 -translate-y-1/2"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Mascot mood={mood} size="xs" animate={false} />
            <span className="font-bold text-slate-900">Ask Nori</span>
          </div>
          <p className="leading-snug">{message}</p>
        </div>
      )}
    </div>
  );
}
