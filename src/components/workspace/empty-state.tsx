"use client";

import { Plus, RotateCw } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";
import { MascotEmptyState } from "@/components/mascot/mascot-empty-state";

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
    <MascotEmptyState
      title={title}
      description={description}
      mood="thinking"
      action={{
        label: actionLabel,
        onClick: onAction ?? (() => setCreateDialogOpen(true)),
        icon: <Plus className="w-4 h-4" />,
      }}
    />
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