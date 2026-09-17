"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

interface ResizablePanelProps {
  side: "left" | "right";
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  storageKey?: string;
  isCollapsed?: boolean;
  collapsedWidth?: number;
  onCollapseToggle?: () => void;
  children: React.ReactNode;
  className?: string;
}

export function ResizablePanel({
  side,
  defaultWidth = 280,
  minWidth = 220,
  maxWidth = 380,
  storageKey,
  isCollapsed = false,
  collapsedWidth = 64,
  children,
  className = "",
}: ResizablePanelProps) {
  const [width, setWidth] = useState<number>(defaultWidth);
  const [isResizing, setIsResizing] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Restore width from localStorage on mount
  useEffect(() => {
    if (!storageKey || typeof window === "undefined") return;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        setWidth(parsed);
      }
    }
  }, [storageKey, minWidth, maxWidth]);

  const startResizing = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      if (storageKey && typeof window !== "undefined") {
        localStorage.setItem(storageKey, width.toString());
      }
    }
  }, [isResizing, storageKey, width]);

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !panelRef.current) return;
      const rect = panelRef.current.getBoundingClientRect();
      let newWidth = width;

      if (side === "left") {
        newWidth = e.clientX - rect.left;
      } else {
        newWidth = rect.right - e.clientX;
      }

      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setWidth(newWidth);
      }
    },
    [isResizing, side, minWidth, maxWidth, width]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    } else {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  const currentWidth = isCollapsed ? collapsedWidth : width;

  return (
    <div
      ref={panelRef}
      style={{ width: `${currentWidth}px` }}
      className={cn(
        "relative flex flex-col shrink-0 transition-all duration-150 ease-out select-none",
        isResizing && "transition-none",
        className
      )}
    >
      {children}

      {/* Resize Handle Handlebar */}
      {!isCollapsed && (
        <div
          onMouseDown={startResizing}
          className={cn(
            "absolute top-0 bottom-0 z-30 w-1.5 cursor-col-resize hover:bg-accent/50 active:bg-accent transition-colors group",
            side === "left" ? "-right-1" : "-left-1"
          )}
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-border group-hover:bg-accent transition-colors" />
        </div>
      )}
    </div>
  );
}
