import { memo, useCallback, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Copy, MoreHorizontal, Trash2 } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { getNodeDefinition } from "@/lib/workflow";
import { hexToRgba } from "@/lib/workflow/node-colors";
import { useEditorStore } from "@/store/editor-store";
import { NodeIcon } from "@/components/workflow/nodes/node-icon";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export const WorkflowNodeComponent = memo(
  ({ id, data, selected }: NodeProps<WorkflowNode>) => {
    const duplicateNode = useEditorStore((s) => s.duplicateNode);
    const removeNode = useEditorStore((s) => s.removeNode);
    const [menuOpen, setMenuOpen] = useState(false);

    const def = getNodeDefinition(data.definitionId);

    const onDuplicate = useCallback(() => {
      duplicateNode(id);
    }, [duplicateNode, id]);
    const onDelete = useCallback(() => removeNode(id), [removeNode, id]);

    const execStatus = data.lastExecutionStatus;

    let borderColor = selected ? "var(--color-accent)" : "var(--color-border)";
    let boxShadow = selected
      ? "0 0 0 1px var(--color-accent), 0 8px 24px rgba(44,44,44,0.10)"
      : undefined;

    if (execStatus === "running") {
      borderColor = "#3b82f6";
      boxShadow = "0 0 14px rgba(59, 130, 246, 0.55)";
    } else if (execStatus === "success") {
      borderColor = "#10b981";
      boxShadow = "0 0 12px rgba(16, 185, 129, 0.35)";
    } else if (execStatus === "failed") {
      borderColor = "#f43f5e";
      boxShadow = "0 0 14px rgba(244, 63, 94, 0.45)";
    } else if (execStatus === "cancelled") {
      borderColor = "#f59e0b";
      boxShadow = "0 0 10px rgba(245, 158, 11, 0.3)";
    }

    return (
      <div
        className={`rounded-xl border bg-surface px-3.5 py-3 shadow-sm transition-[border-color,box-shadow] duration-300 ${
          execStatus === "running" ? "animate-pulse" : ""
        }`}
        style={{
          width: 250,
          borderColor,
          boxShadow,
          outline: selected ? `3px solid ${hexToRgba("#39ff14", 0.18)}` : undefined,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          id="in"
          className="!top-[-5px]"
        />

        {data.definitionId === "if" ? (
          <>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              className="!bottom-[-5px] !left-[28%] !bg-success"
              title="True branch"
            />
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              className="!bottom-[-5px] !left-[72%] !bg-error"
              title="False branch"
            />
          </>
        ) : (
          <Handle
            type="source"
            position={Position.Bottom}
            id="out"
            className="!bottom-[-5px]"
          />
        )}

        <div className="relative flex items-start gap-2.5">
          <NodeIcon definitionId={data.definitionId} category={data.category} />
          <div className="min-w-0 flex-1 pr-5">
            <p
              className="truncate text-[13px] font-semibold leading-4 text-ink"
              title={data.label}
            >
              {data.label}
            </p>
            <p className="mt-0.5 text-[11px] leading-3.5 text-ink-soft">
              {data.description}
            </p>
          </div>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                tabIndex={-1}
                onPointerDown={(event) => {
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                className="nodrag absolute right-0 top-0 h-6 w-6 text-ink-faint hover:bg-ink/5 hover:text-ink"
                aria-label={`Actions for ${data.label}`}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={4}>
              <DropdownMenuItem onSelect={onDuplicate}>
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={onDelete}
                className="text-error-ink focus:text-error-ink"
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <span
            aria-hidden
            className="block text-[10px] font-medium uppercase tracking-wider text-ink-faint"
          >
            {def ? def.name : data.definitionId}
          </span>
          {execStatus ? (
            <span
              className={`text-[9px] font-mono uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${
                execStatus === "success"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : execStatus === "failed"
                  ? "bg-rose-500/15 text-rose-600"
                  : execStatus === "running"
                  ? "bg-blue-500/15 text-blue-600"
                  : execStatus === "cancelled"
                  ? "bg-amber-500/15 text-amber-600"
                  : "bg-canvas text-ink-faint"
              }`}
            >
              {execStatus}
            </span>
          ) : data.definitionId === "if" ? (
            <div className="flex items-center gap-3 text-[9px] font-bold uppercase tracking-wider">
              <span className="text-success-ink">True</span>
              <span className="text-error-ink">False</span>
            </div>
          ) : null}
        </div>
      </div>
    );
  },
);

WorkflowNodeComponent.displayName = "WorkflowNodeComponent";

export const NODE_TYPES = {
  "neuraloop-node": WorkflowNodeComponent,
} as const;