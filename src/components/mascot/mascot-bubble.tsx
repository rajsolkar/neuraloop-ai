"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

export interface MascotBubbleProps {
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  className?: string;
  variant?: "default" | "subtle" | "emerald";
}

export function MascotBubble({
  children,
  position = "top",
  className = "",
  variant = "default",
}: MascotBubbleProps) {
  const positionClasses = {
    top: "bottom-full mb-3 left-1/2 -translate-x-1/2",
    bottom: "top-full mt-3 left-1/2 -translate-x-1/2",
    left: "right-full mr-3 top-1/2 -translate-y-1/2",
    right: "left-full ml-3 top-1/2 -translate-y-1/2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-[#A7B3A1] border-x-transparent border-b-transparent border-[6px]",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-[#A7B3A1] border-x-transparent border-t-transparent border-[6px]",
    left: "left-full top-1/2 -translate-y-1/2 border-l-[#A7B3A1] border-y-transparent border-r-transparent border-[6px]",
    right: "right-full top-1/2 -translate-y-1/2 border-r-[#A7B3A1] border-y-transparent border-l-transparent border-[6px]",
  };

  const variantStyles = {
    default: "bg-[#A7B3A1] border border-[#8A9884] text-zinc-950 shadow-xl font-semibold",
    subtle: "bg-[#A7B3A1]/95 border border-[#8A9884] text-zinc-950 shadow-lg backdrop-blur-sm font-semibold",
    emerald: "bg-[#A7B3A1] border border-[#8A9884] text-zinc-950 shadow-xl backdrop-blur-sm font-semibold",
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: position === "top" ? 4 : position === "bottom" ? -4 : 0 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`absolute z-20 whitespace-normal max-w-xs text-xs sm:text-sm font-medium px-3.5 py-2 rounded-xl pointer-events-auto ${positionClasses[position]} ${variantStyles[variant]} ${className}`}
    >
      <div className="relative z-10">{children}</div>
      <div className={`absolute w-0 h-0 pointer-events-none ${arrowClasses[position]}`} />
    </motion.div>
  );
}
