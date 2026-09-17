"use client";

import { useState, useMemo } from "react";
import { Variable, Search, Sparkles, ChevronRight, Check, Database, Zap, Layers, RefreshCw, X } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { getNodeDefinition } from "@/lib/workflow";
import { Button } from "@/components/ui/button";

interface VariableItem {
  key: string;
  expression: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  sourceNodeId?: string;
  sourceNodeName?: string;
  category: "trigger" | "step" | "loop" | "variable";
}

interface VariablePickerProps {
  onSelect: (expression: string) => void;
  currentNodeId?: string;
}

export function VariablePicker({ onSelect, currentNodeId }: VariablePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedExpr, setCopiedExpr] = useState<string | null>(null);

  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);

  // Calculate available variables from upstream nodes and workflow context
  const availableVariables = useMemo(() => {
    const vars: VariableItem[] = [];

    // 1. Loop variables
    vars.push(
      {
        key: "loop.item",
        expression: "{{loop.item}}",
        label: "Current Loop Item",
        type: "object",
        description: "The current element payload in an active loop iteration.",
        category: "loop",
      },
      {
        key: "loop.currentIndex",
        expression: "{{loop.currentIndex}}",
        label: "Current Loop Index",
        type: "number",
        description: "Zero-based index of the current loop item (0, 1, 2...).",
        category: "loop",
      },
      {
        key: "loop.totalItems",
        expression: "{{loop.totalItems}}",
        label: "Total Loop Items",
        type: "number",
        description: "Total count of elements in the loop array.",
        category: "loop",
      },
    );

    // 2. Trigger data variables
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
            label: "Webhook Body",
            type: "object",
            description: "Full JSON body of incoming HTTP webhook payload.",
            category: "trigger",
          },
          {
            key: "trigger.query",
            expression: "{{trigger.query}}",
            label: "Query Parameters",
            type: "object",
            description: "URL search parameters passed to webhook.",
            category: "trigger",
          },
          {
            key: "trigger.headers",
            expression: "{{trigger.headers}}",
            label: "HTTP Headers",
            type: "object",
            description: "Request headers attached to incoming webhook.",
            category: "trigger",
          },
        );
      } else if (defId === "schedule") {
        vars.push(
          {
            key: "trigger.scheduledFor",
            expression: "{{trigger.scheduledFor}}",
            label: "Scheduled Time",
            type: "string",
            description: "ISO timestamp when schedule run was queued.",
            category: "trigger",
          },
          {
            key: "trigger.cronExpression",
            expression: "{{trigger.cronExpression}}",
            label: "Cron Expression",
            type: "string",
            description: "Active cron expression string.",
            category: "trigger",
          },
        );
      } else {
        vars.push({
          key: "trigger.input",
          expression: "{{trigger.input}}",
          label: "Trigger Input Payload",
          type: "object",
          description: "Initial input payload passed to workflow execution.",
          category: "trigger",
        });
      }
    }

    // 3. Upstream node outputs
    nodes.forEach((n) => {
      if (n.id === currentNodeId) return;
      const def = getNodeDefinition(n.data.definitionId);
      if (!def) return;

      const nodeName = n.data.label || def.name;
      const defId = n.data.definitionId;

      if (defId === "openai") {
        vars.push(
          {
            key: `steps.${n.id}.output.text`,
            expression: `{{steps.${n.id}.output.text}}`,
            label: "AI Output Text",
            type: "string",
            description: "Generated response text from OpenAI model.",
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          },
          {
            key: `steps.${n.id}.output.tokensUsed`,
            expression: `{{steps.${n.id}.output.tokensUsed}}`,
            label: "Tokens Used",
            type: "number",
            description: "Total token usage for prompt & completion.",
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          },
        );
      } else if (defId === "http-request") {
        vars.push(
          {
            key: `steps.${n.id}.output.data`,
            expression: `{{steps.${n.id}.output.data}}`,
            label: "HTTP Response Body",
            type: "object",
            description: "Parsed JSON response payload from HTTP endpoint.",
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          },
          {
            key: `steps.${n.id}.output.status`,
            expression: `{{steps.${n.id}.output.status}}`,
            label: "HTTP Status Code",
            type: "number",
            description: "HTTP status code (e.g. 200, 201, 404).",
            sourceNodeId: n.id,
            sourceNodeName: nodeName,
            category: "step",
          },
        );
      } else if (defId === "code") {
        vars.push({
          key: `steps.${n.id}.output.result`,
          expression: `{{steps.${n.id}.output.result}}`,
          label: "Code Execution Result",
          type: "object",
          description: "Return value from custom JavaScript code snippet.",
          sourceNodeId: n.id,
          sourceNodeName: nodeName,
          category: "step",
        });
      } else if (defId === "set-variable") {
        vars.push({
          key: `steps.${n.id}.output.variables`,
          expression: `{{steps.${n.id}.output.variables}}`,
          label: "Set Variables",
          type: "object",
          description: "Map of variables configured in Set Variable node.",
          sourceNodeId: n.id,
          sourceNodeName: nodeName,
          category: "step",
        });
      } else {
        vars.push({
          key: `steps.${n.id}.output`,
          expression: `{{steps.${n.id}.output}}`,
          label: `${nodeName} Output`,
          type: "object",
          description: `Full output object from ${nodeName}.`,
          sourceNodeId: n.id,
          sourceNodeName: nodeName,
          category: "step",
        });
      }
    });

    return vars;
  }, [nodes, currentNodeId]);

  // Filtered list
  const filteredVars = useMemo(() => {
    if (!searchQuery.trim()) return availableVariables;
    const q = searchQuery.toLowerCase().trim();
    return availableVariables.filter(
      (v) =>
        v.label.toLowerCase().includes(q) ||
        v.expression.toLowerCase().includes(q) ||
        (v.sourceNodeName && v.sourceNodeName.toLowerCase().includes(q))
    );
  }, [availableVariables, searchQuery]);

  const handleSelect = (expression: string) => {
    onSelect(expression);
    setCopiedExpr(expression);
    setTimeout(() => setCopiedExpr(null), 1200);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-2 text-[11px] gap-1 text-accent-ink hover:bg-accent-dim/60 border border-accent/30"
        title="Insert Variable Expression"
      >
        <Variable className="h-3.5 w-3.5" />
        <span>+ Variable</span>
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-8 z-50 w-80 rounded-xl border border-border-strong bg-surface p-3 shadow-xl ring-1 ring-black/5">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-1.5 font-bold text-xs text-ink">
              <Sparkles className="h-3.5 w-3.5 text-accent-ink" />
              <span>Variable Explorer</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-ink-faint hover:text-ink text-xs font-bold px-1"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative mt-2">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-ink-faint" />
            <input
              type="text"
              placeholder="Search variables (e.g. text, body)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-md border border-border bg-canvas pl-8 pr-2.5 py-1.5 text-xs text-ink placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-accent"
              autoFocus
            />
          </div>

          {/* List */}
          <div className="mt-2 max-h-60 overflow-y-auto space-y-1.5 pr-1">
            {filteredVars.length === 0 ? (
              <div className="p-3 text-center text-xs text-ink-faint">
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
                      <span className="font-bold text-xs text-ink truncate">
                        {v.label}
                      </span>
                      {v.sourceNodeName && (
                        <span className="text-[10px] font-mono text-ink-faint rounded bg-border/40 px-1 py-0.2">
                          {v.sourceNodeName}
                        </span>
                      )}
                    </div>
                    <div className="font-mono text-[11px] text-accent-ink mt-0.5 truncate">
                      {v.expression}
                    </div>
                    {v.description && (
                      <div className="text-[10px] text-ink-soft truncate mt-0.5">
                        {v.description}
                      </div>
                    )}
                  </div>
                  <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-mono text-ink-soft group-hover:bg-accent group-hover:text-accent-ink">
                    {copiedExpr === v.expression ? (
                      <Check className="h-3 w-3 text-success" />
                    ) : (
                      "Insert"
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
