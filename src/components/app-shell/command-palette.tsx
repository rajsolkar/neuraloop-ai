"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  LayoutTemplate,
  Play,
  BarChart3,
  BookOpen,
  Layers,
  Settings,
  Plus,
  Sparkles,
  Search,
  Command,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useUiStore } from "@/store/ui-store";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ElementType;
  category: "Navigation" | "Actions" | "AI";
  action: () => void;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const commands: CommandItem[] = [
    {
      id: "create-workflow",
      label: "Create New Workflow",
      icon: Plus,
      category: "Actions",
      action: () => {
        setOpen(false);
        setCreateDialogOpen(true);
      },
    },
    {
      id: "ask-nori",
      label: "Ask Nori Copilot",
      icon: Sparkles,
      category: "AI",
      action: () => {
        setOpen(false);
        router.push("/docs");
      },
    },
    {
      id: "dashboard",
      label: "Open Dashboard",
      icon: FolderKanban,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/workflows");
      },
    },
    {
      id: "templates",
      label: "Open Templates Marketplace",
      icon: LayoutTemplate,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/templates");
      },
    },
    {
      id: "executions",
      label: "Open Execution Logs",
      icon: Play,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/executions");
      },
    },
    {
      id: "analytics",
      label: "Open Analytics Dashboard",
      icon: BarChart3,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/analytics");
      },
    },
    {
      id: "docs",
      label: "Open Documentation Center",
      icon: BookOpen,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/docs");
      },
    },
    {
      id: "architecture",
      label: "Open Architecture Showcase",
      icon: Layers,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/about-architecture");
      },
    },
    {
      id: "settings",
      label: "Open Workspace Settings",
      icon: Settings,
      category: "Navigation",
      action: () => {
        setOpen(false);
        router.push("/settings");
      },
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border bg-canvas">
          <Search className="w-4 h-4 text-ink-faint shrink-0" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search workspace..."
            className="border-none bg-transparent shadow-none focus-visible:ring-0 text-sm h-8"
            autoFocus
          />
          <span className="text-[10px] font-mono text-ink-faint px-1.5 py-0.5 rounded bg-surface border border-border">
            ESC
          </span>
        </div>

        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-4 text-center text-xs text-ink-faint">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd) => {
              const Icon = cmd.icon;
              return (
                <button
                  key={cmd.id}
                  onClick={cmd.action}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-xs font-medium text-ink hover:bg-accent-dim/60 transition-colors group"
                >
                  <span className="p-1.5 rounded-lg border border-border bg-surface group-hover:bg-canvas text-ink-soft">
                    <Icon className="w-3.5 h-3.5" />
                  </span>
                  <span className="flex-1">{cmd.label}</span>
                  <span className="text-[10px] text-ink-faint font-mono uppercase">
                    {cmd.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-4 py-2 bg-canvas border-t border-border flex items-center justify-between text-[11px] text-ink-faint">
          <div className="flex items-center gap-1.5">
            <Command className="w-3 h-3" />
            <span>Neuraloop Command Menu</span>
          </div>
          <span>Navigation & Shortcuts</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
