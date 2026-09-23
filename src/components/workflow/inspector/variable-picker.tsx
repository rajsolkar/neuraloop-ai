"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Variable, Search, Sparkles, Check, Database, Zap, Layers, X, Code2, ArrowRight } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { getNodeDefinition } from "@/lib/workflow";
import { Button } from "@/components/ui/button";

export interface VariableItem {
  key: string;
  expression: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  category: "trigger" | "step" | "loop" | "workflow";
}

interface VariablePickerProps {
  onSelect: (expression: string) => void;
  currentNodeId?: string;
  align?: "left" | "right";
}

export function VariablePicker({ onSelect, currentNodeId, align = "left" }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedExpr, setCopiedExpr] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<"all" | "trigger" | "step" | "workflow">("all");
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const nodes = useEditorStore((s) => s.nodes);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate available variables grouped by source
  const availableVariables = useMemo(() => {
    const vars: VariableItem[] = [];

    // 1. Workflow & System Level Variables
    vars.push(
      {
        key: "name",
        expression: "{{name}}",
        label: "name",
        type: "string",
        description: "Primary lead / contact full name.",
        category: "trigger",
      },
      {
        key: "email",
        expression: "{{email}}",
        label: "email",
        type: "string",
        description: "Primary contact email address.",
        category: "trigger",
      },
      {
        key: "company",
        expression: "{{company}}",
        label: "company",
        type: "string",
        description: "Company or organization name.",
        category: "trigger",
      },
      {
        key: "leadScore",
        expression: "{{leadScore}}",
        label: "leadScore",
        type: "number",
        description: "Evaluated lead score number.",
        category: "trigger",
      },
      {
        key: "workflow.id",
        expression: "{{workflow.id}}",
        label: "workflow.id",
        type: "string",
        description: "Active workflow execution ID.",
        category: "workflow",
      },
      {
        key: "execution.id",
        expression: "{{execution.id}}",
        label: "execution.id",
        type: "string",
        description: "Current run instance execution ID.",
        category: "workflow",
      },
      {
        key: "loop.item",
        expression: "{{loop.item}}",
        label: "loop.item",
        type: "object",
        description: "Current element in active loop iteration.",
        category: "workflow",
      },
      {
        key: "loop.currentIndex",
        expression: "{{loop.currentIndex}}",
        label: "loop.currentIndex",
        type: "number",
        description: "Zero-based loop iteration index.",
        category: "workflow",
      }
    );

    // 2. Trigger Node Data
    const triggerNode = nodes.find((n) => {
      const def = getNodeDefinition(n.data.definitionId);
      return def?.isTrigger;
    });

    if (triggerNode) {
      const defId = triggerNode.data.definitionId;
      if (defId === "webhook") {
        vars.push(
          {
            key: "trigger.body",
            expression: "{{trigger.body}}",
            label: "trigger.body",
            type: "object",
            description: "Full JSON body payload from incoming webhook.",
            category: "trigger",
          },
          {
            key: "trigger.query",
            expression: "{{trigger.query}}",
            label: "trigger.query",
            type: "object",
            description: "URL query parameters passed to webhook.",
            category: "trigger",
          },
          {
            key: "trigger.headers",
            expression: "{{trigger.headers}}",
            label: "trigger.headers",
            type: "object",
            description: "HTTP headers attached to webhook.",
            category: "trigger",
          }
        );
      } else if (defId === "schedule") {
        vars.push({
          key: "trigger.scheduledFor",
          expression: "{{trigger.scheduledFor}}",
          label: "trigger.scheduledFor",
          type: "string",
          description: "ISO timestamp when schedule triggered.",
          category: "trigger",
        });
      } else {
        vars.push({
          key: "trigger.input",
          expression: "{{trigger.input}}",
          label: "trigger.input",
          type: "object",
          description: "Initial input payload passed to workflow execution.",
          category: "trigger",
        });
      }
    }

    // 3. Upstream Node Outputs
    nodes.forEach((n) => {
      if (n.id === currentNodeId) return;
      const def = getNodeDefinition(n.data.definitionId);
      if (!def) return;

      const nodeName = n.data.label || def.name;
      const defId = n.data.definitionId;

      if (defId === "openai" || defId === "ai") {
        vars.push(
          {
            key: `steps.${n.id}.output.text`,
            expression: `{{steps.${n.id}.output.text}}`,
            label: `steps.${n.id}.output.text`,
            type: "string",
            description: `Generated AI text output from ${nodeName}.`,
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          },
          {
            key: `steps.${n.id}.output.tokensUsed`,
            expression: `{{steps.${n.id}.output.tokensUsed}}`,
            label: `steps.${n.id}.output.tokensUsed`,
            type: "number",
            description: `Token consumption for ${nodeName}.`,
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          }
        );
      } else if (defId === "http-request") {
        vars.push(
          {
            key: `steps.${n.id}.output.data`,
            expression: `{{steps.${n.id}.output.data}}`,
            label: `steps.${n.id}.output.data`,
            type: "object",
            description: `Parsed response data from ${nodeName}.`,
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          },
          {
            key: `steps.${n.id}.output.status`,
            expression: `{{steps.${n.id}.output.status}}`,
            label: `steps.${n.id}.output.status`,
            type: "number",
            description: `HTTP status code from ${nodeName}.`,
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          }
        );
      } else if (defId === "transform") {
        vars.push({
          key: `steps.${n.id}.output.summary`,
          expression: `{{steps.${n.id}.output.summary}}`,
          label: `steps.${n.id}.output.summary`,
          type: "string",
          description: `Transformed output payload from ${nodeName}.`,
          sourceNodeId: n.id,
          sourceNodeName: nodeName,
          category: "step",
        });
      } else {
        vars.push({
          key: `steps.${n.id}.output`,
          expression: `{{steps.${n.id}.output}}`,
          label: `steps.${n.id}.output`,
          type: "object",
          description: `Full output payload object from ${nodeName}.`,
          sourceNodeId: n.id,
          sourceNodeName: nodeName,
          category: "step",
        });
      }
    });

    return vars;
  }, [nodes, currentNodeId]);

  // Filtered List based on category tab & search query
  const filteredVars = useMemo(() => {
    let list = availableVariables;
    if (activeCategory !== "all") {
      list = list.filter((v) => v.category === activeCategory);
    }
    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.expression.toLowerCase().includes(q) ||
        (v.description && v.description.toLowerCase().includes(q)) ||
        (v.sourceNodeName && v.sourceNodeName.toLowerCase().includes(q))
    );
  }, [availableVariables, searchQuery, activeCategory]);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const pickerWidth = 330;
    const pickerHeight = 360;

    let top = rect.bottom + 6;
    if (top + pickerHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - pickerHeight - 6);
    }

    let left = align === "right" ? rect.right - pickerWidth : rect.left;
    if (left + pickerWidth > window.innerWidth - 16) {
      left = window.innerWidth - pickerWidth - 16;
    }
    if (left < 16) left = 16;

    setCoords({ top, left });
  };

  const togglePicker = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Close on click outside or escape
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current &&
        triggerRef.current.contains(e.target as Node)
      ) {
        return;
      }
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (expression: string) => {
    onSelect(expression);
    setCopiedExpr(expression);
    setTimeout(() => setCopiedExpr(null), 1200);
    setIsOpen(false);
  };

  return (
    <div className="inline-block">
      <Button
        ref={triggerRef}
        type="button"
        variant="ghost"
        size="sm"
        onClick={togglePicker}
        className="h-7 px-2 text-[11px] gap-1 text-accent-ink hover:bg-accent-dim/60 border border-accent/30"
        title="Insert Variable Expression"
      >
        <Variable className="h-3.5 w-3.5 text-accent-ink" />
        <span>+ Variable</span>
      </Button>

      {isOpen &&
        mounted &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              zIndex: 9999,
              width: "330px",
            }}
            className="rounded-xl border border-border-strong bg-surface p-3 shadow-2xl ring-1 ring-black/10 animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Explorer Header */}
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
                <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
                <span>Variable Explorer</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-ink-faint hover:text-ink text-xs font-bold p-0.5 rounded hover:bg-canvas transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex items-center gap-1 mt-2.5 p-1 rounded-lg bg-canvas text-[11px] font-medium border border-border/60">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  activeCategory === "all"
                    ? "bg-surface font-bold text-ink shadow-xs"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("trigger")}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  activeCategory === "trigger"
                    ? "bg-surface font-bold text-ink shadow-xs"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                Trigger
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("step")}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  activeCategory === "step"
                    ? "bg-surface font-bold text-ink shadow-xs"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                Nodes
              </button>
              <button
                type="button"
                onClick={() => setActiveCategory("workflow")}
                className={`flex-1 py-1 rounded text-center transition-colors ${
                  activeCategory === "workflow"
                    ? "bg-surface font-bold text-ink shadow-xs"
                    : "text-ink-faint hover:text-ink"
                }`}
              >
                System
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mt-2">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" />
              <input
                type="text"
                placeholder="Search variables (e.g. name, email)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
            </div>

            {/* Grouped Variable List */}
            <div className="mt-2 max-h-56 overflow-y-auto space-y-1.5 pr-1 font-sans">
              {filteredVars.length === 0 ? (
                <div className="p-4 text-center text-xs text-ink-faint">
                  No matching variables found.
                </div>
              ) : (
                filteredVars.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => handleSelect(v.expression)}
                    className="w-full text-left rounded-lg p-2 transition-colors hover:bg-canvas border border-transparent hover:border-border flex items-start justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-ink truncate">
                          {v.expression}
                        </span>
                        {v.sourceNodeName && (
                          <span className="text-[9px] font-mono text-ink-faint rounded bg-border/40 px-1 py-0.2 shrink-0">
                            {v.sourceNodeName}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-ink-soft truncate mt-0.5">
                        {v.description || v.label}
                      </div>
                    </div>
                    <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-ink-soft group-hover:bg-accent group-hover:text-accent-ink transition-colors">
                      {copiedExpr === v.expression ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        "Insert"
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
