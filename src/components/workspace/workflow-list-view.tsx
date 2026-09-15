"use client";

import { useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useWorkflowStore, useWorkflowHydration } from "@/store/workflow-store";
import { useUiStore } from "@/store/ui-store";
import { WorkflowSearch } from "@/components/workspace/workflow-search";
import { WorkflowGrid } from "@/components/workspace/workflow-grid";
import { EmptyState } from "@/components/workspace/empty-state";
import { WorkflowGridSkeleton } from "@/components/workspace/loading-state";
import { Button } from "@/components/ui/button";
import { AiGeneratorModal } from "@/components/workflow/ai/ai-generator-modal";

export function WorkflowsView({
  heading,
  description,
  limit,
}: {
  heading: string;
  description?: string;
  /** Cap the number of workflows shown (used on Home). */
  limit?: number;
}) {
  const workflows = useWorkflowStore((s) => s.workflows);
  const hydrated = useWorkflowHydration();
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);
  const [query, setQuery] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = limit ? workflows.slice(0, limit) : workflows;
    if (!q) return base;
    return base.filter(
      (workflow) =>
        workflow.name.toLowerCase().includes(q) ||
        workflow.description.toLowerCase().includes(q),
    );
  }, [workflows, query, limit]);

  if (!hydrated) {
    return (
      <div className="mt-6">
        <WorkflowGridSkeleton count={limit ?? 4} />
      </div>
    );
  }

  const emptyCollection = workflows.length === 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-16 md:px-8">
      <div className="flex flex-col gap-4 py-8 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {heading}
          </h1>
          {description ? (
            <p className="mt-1 text-sm text-ink-soft">{description}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Button
            variant="outline"
            onClick={() => setAiModalOpen(true)}
            className="gap-1.5"
          >
            <Sparkles className="h-4 w-4 text-accent-ink" />
            Generate with AI
          </Button>
          {!emptyCollection ? (
            <Button
              variant="primary"
              onClick={() => setCreateDialogOpen(true)}
            >
              <Plus />
              Create New Workflow
            </Button>
          ) : null}
        </div>
      </div>

      {emptyCollection ? (
        <EmptyState
          title="Start building your first workflow"
          description="Connect triggers, actions and logic on a visual canvas. Everything you build is saved in your browser for now."
        />
      ) : (
        <>
          <WorkflowSearch value={query} onChange={setQuery} className="mb-6" />
          {filtered.length === 0 ? (
            <EmptyState
              title={`No workflows match “${query}”`}
              description="Try a different search term or clear the search."
              actionLabel="Clear search"
              onAction={() => setQuery("")}
            />
          ) : (
            <WorkflowGrid workflows={filtered} />
          )}
        </>
      )}

      <AiGeneratorModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </div>
  );
}