"use client";

import { FolderKanban, Plus, RotateCw } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionLabel = "Create New Workflow",
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);

  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border-strong bg-surface/60 px-6 py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-ink-soft">
        <FolderKanban className="h-6 w-6" />
      </span>
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-5 text-ink-soft">
          {description}
        </p>
      </div>
      <Button
        variant="primary"
        className="mt-1"
        onClick={onAction ?? (() => setCreateDialogOpen(true))}
      >
        <Plus />
        {actionLabel}
      </Button>
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-error/30 bg-error-dim/40 px-6 py-16 text-center">
      <h3 className="text-base font-semibold text-error-ink">
        Something went wrong
      </h3>
      <p className="max-w-sm text-sm leading-5 text-ink-soft">{message}</p>
      {onRetry ? (
        <Button variant="outline" className="mt-1" onClick={onRetry}>
          <RotateCw />
          Try again
        </Button>
      ) : null}
    </div>
  );
}