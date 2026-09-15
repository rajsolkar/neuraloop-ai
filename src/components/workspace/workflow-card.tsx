"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  FolderKanban,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useToastStore } from "@/store/toast-store";
import type { Workflow, WorkflowStatus } from "@/types/workflow";
import { cn, formatRelativeDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const STATUS_LABEL: Record<WorkflowStatus, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

export function WorkflowCard({
  workflow,
  onDelete,
}: {
  workflow: Workflow;
  onDelete?: (id: string) => void;
}) {
  const duplicateWorkflow = useWorkflowStore((s) => s.duplicateWorkflow);
  const deleteWorkflow = useWorkflowStore((s) => s.deleteWorkflow);
  const toast = useToastStore((s) => s.toast);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const nodeCount = workflow.nodes.length;

  const handleDuplicate = () => {
    void duplicateWorkflow(workflow.id);
    toast("Workflow duplicated", {
      description: workflow.name,
    });
  };

  const handleDelete = () => {
    setConfirmOpen(false);
    deleteWorkflow(workflow.id);
    toast("Workflow deleted", {
      description: workflow.name,
      tone: "error",
    });
    onDelete?.(workflow.id);
  };

  return (
    <>
      <article
        className={cn(
          "group relative flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-all duration-300",
          "hover:-translate-y-0.5 hover:border-border-strong hover:shadow-lg",
          "focus-within:ring-2 focus-within:ring-accent/50",
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/workflows/${workflow.id}`}
            className="min-w-0 flex-1 focus-visible:outline-none"
          >
            <h3 className="truncate text-[15px] font-semibold leading-5 text-ink transition-colors group-hover:text-ink/80">
              {workflow.name}
            </h3>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="opacity-0 transition-opacity duration-300 focus-visible:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100"
                aria-label={`Actions for ${workflow.name}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDuplicate}>
                <Copy />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setConfirmOpen(true)}
                className="text-error-ink focus:text-error-ink"
              >
                <Trash2 />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Link
          href={`/workflows/${workflow.id}`}
          className="flex-1 focus-visible:outline-none"
        >
          <p className="line-clamp-2 min-h-[2.5rem] text-[13px] leading-5 text-ink-soft">
            {workflow.description || "No description yet."}
          </p>
        </Link>

        <div className="flex items-center justify-between gap-2 text-xs text-ink-faint">
          <div className="flex items-center gap-2">
            <Badge
              variant={
                workflow.status === "published"
                  ? "published"
                  : workflow.status === "archived"
                  ? "archived"
                  : "draft"
              }
            >
              {STATUS_LABEL[workflow.status]}
            </Badge>
            <span className="inline-flex items-center gap-1">
              <FolderKanban className="h-3 w-3" />
              {nodeCount} {nodeCount === 1 ? "node" : "nodes"}
            </span>
          </div>
          <span className="shrink-0 whitespace-nowrap">
            Edited {formatRelativeDate(workflow.updatedAt)}
          </span>
        </div>
      </article>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete workflow?</DialogTitle>
            <DialogDescription>
              “{workflow.name}” and its {nodeCount} node
              {nodeCount === 1 ? "" : "s"} will be removed from this browser.
              This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              <Trash2 />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}