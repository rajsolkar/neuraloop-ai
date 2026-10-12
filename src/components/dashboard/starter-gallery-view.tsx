"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Sparkles,
  Plus,
  Search,
  LayoutTemplate,
  FolderKanban,
  Zap,
  Filter,
  CheckCircle2,
  KeyRound,
  ArrowRight,
  RefreshCw,
  Layers,
  AlertCircle,
  Database,
} from "lucide-react";
import { useWorkflowStore, useWorkflowHydration } from "@/store/workflow-store";
import { useUiStore } from "@/store/ui-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { WorkflowSearch } from "@/components/workspace/workflow-search";
import { WorkflowGrid } from "@/components/workspace/workflow-grid";
import { EmptyState } from "@/components/workspace/empty-state";
import { WorkflowGridSkeleton } from "@/components/workspace/loading-state";
import { AiGeneratorModal } from "@/components/workflow/ai/ai-generator-modal";
import { STARTER_TEMPLATES, type StarterTemplateItem } from "@/lib/templates/starter-templates";
import { StarterCard } from "@/components/dashboard/starter-card";
import { StarterPreviewModal } from "@/components/dashboard/starter-preview-modal";

const DIFFICULTY_FILTERS = ["All", "Beginner", "Intermediate", "Advanced"] as const;
type DifficultyFilter = (typeof DIFFICULTY_FILTERS)[number];

export function StarterGalleryView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "my-workflows" ? "my-workflows" : "starters";

  const [activeTab, setActiveTab] = useState<"starters" | "my-workflows">(initialTab);
  const [starterSearch, setStarterSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyFilter>("All");
  const [previewStarter, setPreviewStarter] = useState<StarterTemplateItem | null>(null);
  const [cloningId, setCloningId] = useState<string | null>(null);

  // Starters loading & error states
  const [starterList, setStarterList] = useState<StarterTemplateItem[]>([]);
  const [loadingStarters, setLoadingStarters] = useState(true);
  const [starterError, setStarterError] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);
  const [sourceInfo, setSourceInfo] = useState<"database" | "fallback" | null>(null);

  // My Workflows state
  const workflows = useWorkflowStore((s) => s.workflows);
  const hydrated = useWorkflowHydration();
  const fetchWorkflows = useWorkflowStore((s) => s.fetchWorkflows);
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);
  const toast = useToastStore((s) => s.toast);

  const [myWorkflowsQuery, setMyWorkflowsQuery] = useState("");
  const [aiModalOpen, setAiModalOpen] = useState(false);

  // Fetch starters from server
  const fetchStarters = useCallback(async () => {
    setLoadingStarters(true);
    setStarterError(null);
    setDiagnosticInfo(null);
    try {
      const res = await fetch("/api/templates/starters");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || `Failed to fetch starters (HTTP ${res.status})`);
      }
      if (Array.isArray(data.templates) && data.templates.length > 0) {
        setStarterList(data.templates);
        setSourceInfo(data.source || "database");
      } else {
        throw new Error("No starter templates returned from server.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("Error fetching starter templates from server:", msg);
      setStarterError(msg);
      // Controlled fallback: if API fails, render canonical definitions while reporting error
      setStarterList(STARTER_TEMPLATES);
      setSourceInfo("fallback");
      setDiagnosticInfo(`Controlled fallback active. Error details: ${msg}`);
    } finally {
      setLoadingStarters(false);
    }
  }, []);

  useEffect(() => {
    void fetchStarters();
    void fetchWorkflows();
  }, [fetchStarters, fetchWorkflows]);

  // Filter Starter Workflows
  const filteredStarters = useMemo(() => {
    const list = starterList.length > 0 ? starterList : STARTER_TEMPLATES;
    return list.filter((tpl) => {
      const matchDifficulty =
        selectedDifficulty === "All" || tpl.difficulty === selectedDifficulty;

      const q = starterSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.category.toLowerCase().includes(q) ||
        tpl.flowSequence.some((s) => s.toLowerCase().includes(q)) ||
        tpl.tags.some((t) => t.toLowerCase().includes(q));

      return matchDifficulty && matchSearch;
    });
  }, [starterList, starterSearch, selectedDifficulty]);

  // Filter User Workflows
  const filteredUserWorkflows = useMemo(() => {
    const q = myWorkflowsQuery.trim().toLowerCase();
    if (!q) return workflows;
    return workflows.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        (w.description && w.description.toLowerCase().includes(q)),
    );
  }, [workflows, myWorkflowsQuery]);

  // Clone Template Action
  const handleUseTemplate = async (starter: StarterTemplateItem) => {
    setCloningId(starter.id);
    try {
      const res = await fetch(`/api/templates/${starter.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: starter.shortName }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to clone template");
      }

      toast(`Template "${starter.name}" added to your workspace!`);
      // Refresh workflows list in background
      void fetchWorkflows();
      // Navigate straight to canvas editor
      router.push(`/workflows/${data.workflowId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(msg, { tone: "error" });
      setCloningId(null);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-20 md:px-8">
      {/* ================================================================= */}
      {/* 1. Header Banner & Welcome Experience                             */}
      {/* ================================================================= */}
      <div className="flex flex-col gap-6 py-8 md:py-10 border-b border-border/70">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/20 border border-accent/40 text-accent-ink text-xs font-semibold mb-3">
              <Zap className="h-3.5 w-3.5" />
              <span>Production Blueprint Gallery</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-ink">
              Welcome to Neuraloop
            </h1>
            <p className="mt-2 text-sm md:text-base text-ink-soft max-w-2xl">
              Start with a ready-made workflow. Add your credentials and make it yours.
            </p>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2.5 self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              onClick={() => setAiModalOpen(true)}
              className="gap-1.5 text-xs h-9"
            >
              <Sparkles className="h-4 w-4 text-accent-ink" />
              Generate with AI
            </Button>

            <Button
              variant="primary"
              onClick={() => setCreateDialogOpen(true)}
              className="gap-1.5 text-xs h-9 font-semibold"
            >
              <Plus className="h-4 w-4" />
              Create New Workflow
            </Button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* Navigation Tabs: Starter Workflows (7) vs My Workflows            */}
        {/* ================================================================= */}
        <div className="flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("starters")}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "starters"
                  ? "border-accent-ink text-ink font-extrabold"
                  : "border-transparent text-ink-soft hover:text-ink hover:border-border"
              }`}
            >
              <LayoutTemplate className="h-4 w-4 text-accent-ink" />
              <span>Starter Workflows</span>
              <span className="rounded-full bg-accent/30 text-accent-ink px-2 py-0.5 text-xs font-mono font-bold">
                7
              </span>
            </button>

            <button
              onClick={() => setActiveTab("my-workflows")}
              className={`flex items-center gap-2 py-3 px-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "my-workflows"
                  ? "border-accent-ink text-ink font-extrabold"
                  : "border-transparent text-ink-soft hover:text-ink hover:border-border"
              }`}
            >
              <FolderKanban className="h-4 w-4 text-ink-soft" />
              <span>My Workflows</span>
              <span className="rounded-full bg-ink/10 text-ink px-2 py-0.5 text-xs font-mono">
                {hydrated ? workflows.length : "…"}
              </span>
            </button>
          </div>

          {activeTab === "starters" && (
            <button
              onClick={() => setActiveTab("my-workflows")}
              className="text-xs text-ink-faint hover:text-ink hidden sm:flex items-center gap-1 underline underline-offset-4 cursor-pointer"
            >
              <span>View your personal workflows ({workflows.length})</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* ================================================================= */}
      {/* 2. STARTER WORKFLOWS VIEW                                         */}
      {/* ================================================================= */}
      {activeTab === "starters" && (
        <div className="mt-8 flex flex-col gap-6">
          {/* Section Sub-heading & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-ink tracking-tight">
                  Starter Workflows
                </h2>
                {sourceInfo === "database" && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-500/10 border border-emerald-300 rounded px-1.5 py-0.5">
                    <Database className="h-3 w-3 text-emerald-600" />
                    Live Database Verified
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-soft mt-0.5">
                Curated templates ordered from beginner to advanced. Preview logic or clone directly to canvas.
              </p>
            </div>

            {/* Difficulty Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
              {DIFFICULTY_FILTERS.map((diff) => (
                <Button
                  key={diff}
                  variant={selectedDifficulty === diff ? "primary" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedDifficulty(diff)}
                  className="h-8 text-xs font-semibold rounded-lg shrink-0"
                >
                  {diff}
                </Button>
              ))}
            </div>
          </div>

          {/* Diagnostic alert banner if API had an issue */}
          {starterError && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3.5 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
                <span>
                  <strong>Server sync notice:</strong> {diagnosticInfo || starterError}. Controlled fallback active.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchStarters}
                className="h-7 text-xs bg-surface border-amber-300 text-amber-900 hover:bg-amber-100 gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <RefreshCw className="h-3 w-3" />
                Retry Sync
              </Button>
            </div>
          )}

          {/* Search Box for Starters */}
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-ink-faint" />
            <Input
              value={starterSearch}
              onChange={(e) => setStarterSearch(e.target.value)}
              placeholder="Search starter workflows by name, category, or tools (HTTP, AI, Telegram, Sheets, IF)..."
              className="pl-9.5 h-9 text-xs bg-surface"
            />
          </div>

          {/* Loading Skeleton State */}
          {loadingStarters ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-surface p-5 shadow-2xs flex flex-col gap-4 animate-pulse"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-canvas" />
                      <div className="space-y-1.5">
                        <div className="h-4 w-28 rounded bg-canvas" />
                        <div className="h-3 w-16 rounded bg-canvas" />
                      </div>
                    </div>
                    <div className="h-5 w-14 rounded-full bg-canvas" />
                  </div>
                  <div className="space-y-1.5">
                    <div className="h-3 w-full rounded bg-canvas" />
                    <div className="h-3 w-3/4 rounded bg-canvas" />
                  </div>
                  <div className="h-6 w-48 rounded bg-canvas" />
                  <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                    <div className="h-7 w-20 rounded bg-canvas" />
                    <div className="h-7 w-28 rounded bg-canvas" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredStarters.length === 0 ? (
            <div className="rounded-xl border border-border bg-surface p-12 text-center flex flex-col items-center justify-center gap-3">
              <Filter className="h-8 w-8 text-ink-faint" />
              <h3 className="text-sm font-semibold text-ink">No starter workflows match your filters</h3>
              <p className="text-xs text-ink-soft max-w-sm">
                Try searching for a different term or resetting the difficulty filter.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStarterSearch("");
                  setSelectedDifficulty("All");
                }}
                className="text-xs mt-1"
              >
                Reset filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredStarters.map((starter) => (
                <StarterCard
                  key={starter.id}
                  starter={starter}
                  onPreview={(st) => setPreviewStarter(st)}
                  onUseTemplate={handleUseTemplate}
                  cloning={cloningId === starter.id}
                />
              ))}
            </div>
          )}

          {/* Presentation Footer Information Callout */}
          <div className="mt-8 rounded-xl border border-border/80 bg-gradient-to-r from-accent/10 via-surface to-canvas p-5 text-xs text-ink-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/20 text-accent-ink">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <p className="font-bold text-ink">
                  How starter workflows work in Neuraloop
                </p>
                <p className="text-[11px] text-ink-soft mt-0.5">
                  Clicking <strong>Use Template</strong> creates an independent copy in your workspace with sanitized credentials. Your cloned workflow opens instantly in the canvas for execution and custom configuration.
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("my-workflows")}
              className="text-xs shrink-0"
            >
              View My Workflows ({workflows.length})
            </Button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* 3. MY WORKFLOWS VIEW                                              */}
      {/* ================================================================= */}
      {activeTab === "my-workflows" && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-ink tracking-tight">
                My Workspace Workflows
              </h2>
              <p className="text-xs text-ink-soft mt-0.5">
                Workflows you’ve cloned or created. Click on any workflow to open the canvas.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("starters")}
              className="text-xs gap-1.5"
            >
              <LayoutTemplate className="h-3.5 w-3.5 text-accent-ink" />
              Browse Starters
            </Button>
          </div>

          {!hydrated ? (
            <div className="mt-4">
              <WorkflowGridSkeleton count={4} />
            </div>
          ) : workflows.length === 0 ? (
            <EmptyState
              title="No workflows created yet"
              description="Pick one of the 7 starter workflows above or build a custom automation from scratch on the canvas."
              actionLabel="Explore 7 Starter Workflows"
              onAction={() => setActiveTab("starters")}
            />
          ) : (
            <>
              <WorkflowSearch
                value={myWorkflowsQuery}
                onChange={setMyWorkflowsQuery}
                className="mb-2"
              />

              {filteredUserWorkflows.length === 0 ? (
                <EmptyState
                  title={`No workflows match “${myWorkflowsQuery}”`}
                  description="Try another search term or clear the filter."
                  actionLabel="Clear search"
                  onAction={() => setMyWorkflowsQuery("")}
                />
              ) : (
                <WorkflowGrid workflows={filteredUserWorkflows} />
              )}
            </>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* 4. MODALS: Template Preview & AI Generator                        */}
      {/* ================================================================= */}
      <StarterPreviewModal
        starter={previewStarter}
        open={Boolean(previewStarter)}
        onOpenChange={(open) => !open && setPreviewStarter(null)}
        onUseTemplate={handleUseTemplate}
        cloning={Boolean(cloningId)}
      />

      <AiGeneratorModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </div>
  );
}
