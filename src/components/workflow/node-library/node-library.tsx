"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { XYPosition } from "@xyflow/react";
import type { WorkflowNode } from "@/types/workflow";
import {
  NODE_CATEGORY_ORDER,
  NODE_DEFINITION_CATEGORY_LABELS,
  NODE_DEFINITIONS_BY_CATEGORY,
  type NodeDefinition,
} from "@/lib/workflow";
import { useToastStore } from "@/store/toast-store";
import { NodeIcon } from "@/components/workflow/nodes/node-icon";
import { cn } from "@/lib/utils";

interface NodeLibraryProps {
  /** Handle a click-to-add request at a canvas position. */
  onAddFromLibrary: (
    definitionId: string,
    position: XYPosition,
  ) => WorkflowNode | null;
  /** Compute a good spawn position (e.g. canvas center). */
  getSpawnPosition: () => XYPosition;
}

function LibraryItem({
  definition,
  onDragStart,
  onClick,
}: {
  definition: NodeDefinition;
  onDragStart: (event: React.DragEvent, defId: string) => void;
  onClick: (defId: string) => void;
}) {
  return (
    <button
      type="button"
      draggable
      onDragStart={(event) => onDragStart(event, definition.id)}
      onClick={() => onClick(definition.id)}
      className={cn(
        "group flex w-full cursor-grab items-start gap-2.5 rounded-lg border border-transparent bg-surface px-2.5 py-2 text-left transition-all duration-300",
        "hover:border-border-strong hover:shadow-md active:cursor-grabbing",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
      )}
    >
      <NodeIcon definitionId={definition.id} category={definition.category} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium leading-4 text-ink">
          {definition.name}
        </span>
        <span className="mt-0.5 block text-[11px] leading-4 text-ink-soft">
          {definition.description}
        </span>
      </span>
    </button>
  );
}

export function NodeLibrary({
  onAddFromLibrary,
  getSpawnPosition,
}: NodeLibraryProps) {
  const [query, setQuery] = useState("");
  const toast = useToastStore((s) => s.toast);

  const categories = useMemo(() => {
    const q = query.trim().toLowerCase();
    return NODE_CATEGORY_ORDER.map((category) => ({
      category,
      label: NODE_DEFINITION_CATEGORY_LABELS[category],
      items: NODE_DEFINITIONS_BY_CATEGORY[category].filter(
        (definition) =>
          !q ||
          definition.name.toLowerCase().includes(q) ||
          definition.description.toLowerCase().includes(q),
      ),
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const handleDragStart = (
    event: React.DragEvent,
    definitionId: string,
  ) => {
    event.dataTransfer.setData("application/neuraloop-node", definitionId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleClick = (definitionId: string) => {
    const node = onAddFromLibrary(definitionId, getSpawnPosition());
    if (node?.data?.label) {
      toast("Node added", {
        description: `${node.data.label} — drag it anywhere on the canvas.`,
      });
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 px-3 pb-2 pt-3">
        <div className="relative">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search nodes..."
            aria-label="Search nodes"
            className="h-8 w-full rounded-md border border-border bg-canvas pl-8 pr-2 text-[13px] text-ink transition-colors duration-300 placeholder:text-ink-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:border-accent/60"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {categories.length === 0 ? (
          <p className="px-2 py-6 text-center text-xs leading-5 text-ink-faint">
            No nodes match “{query}”.
          </p>
        ) : (
          categories.map((group) => (
            <section key={group.category} className="mb-4">
              <h3 className="mb-1.5 px-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
                {group.label}
              </h3>
              <div className="flex flex-col gap-1">
                {group.items.map((definition) => (
                  <LibraryItem
                    key={definition.id}
                    definition={definition}
                    onDragStart={handleDragStart}
                    onClick={handleClick}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}