"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  FlaskConical,
  Globe,
  History,
  Redo2,
  Rocket,
  Save,
  Sparkles,
  Undo2,
} from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { TestExecutionDialog } from "@/components/workflow/execution/test-execution-dialog";
import { AiGeneratorModal } from "@/components/workflow/ai/ai-generator-modal";
import { PublishModal } from "@/components/workflow/publishing/publish-modal";
import { WebhookManagementPanel } from "@/components/workflow/publishing/webhook-management-panel";
import { VersionHistoryDialog } from "@/components/workflow/publishing/version-history-dialog";
import { computeVersionDiff } from "@/lib/workflow/version-diff";
import type { WorkflowVersionRecord } from "@/types/workflow";

export function WorkflowToolbar({ onBack }: { onBack: () => void }) {
  const workflowId = useEditorStore((s) => s.workflowId);
  const name = useEditorStore((s) => s.name);
  const status = useEditorStore((s) => s.status);
  const dirty = useEditorStore((s) => s.dirty);
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const nodesCount = nodes.length;
  const past = useEditorStore((s) => s.past);
  const future = useEditorStore((s) => s.future);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const updateWorkflowMetadata = useEditorStore(
    (s) => s.updateWorkflowMetadata,
  );
  const toast = useToastStore((s) => s.toast);

  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Phase 7.1 Publishing & Active Version Metadata
  const [publishedVersionNumber, setPublishedVersionNumber] = useState<number | null>(null);
  const [activeVersionNumber, setActiveVersionNumber] = useState<number | null>(null);
  const [activeVersionDef, setActiveVersionDef] = useState<WorkflowVersionRecord["definition"] | null>(null);
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);

  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [publishModalOpen, setPublishModalOpen] = useState(false);
  const [webhookPanelOpen, setWebhookPanelOpen] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  useEffect(() => {
    if (!workflowId) return;
    let isMounted = true;

    async function loadMetadata() {
      try {
        const res = await fetch(`/api/workflows/${workflowId}`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.workflow) {
            setPublishedVersionNumber(data.workflow.publishedVersionNumber || null);
            setActiveVersionNumber(data.workflow.activeVersionNumber || data.workflow.publishedVersionNumber || null);
            setWebhookSecret(data.workflow.webhookSecret || null);
          }
        }

        const verRes = await fetch(`/api/workflows/${workflowId}/versions`);
        if (verRes.ok) {
          const verData = await verRes.json();
          const vers = verData.versions as WorkflowVersionRecord[];
          const activeVer = vers.find((v) => v.isActive) || vers[0];
          if (isMounted && activeVer) {
            setActiveVersionDef(activeVer.definition);
          }
        }
      } catch {
        // Ignore fetch errors
      }
    }

    loadMetadata();
    return () => {
      isMounted = false;
    };
  }, [workflowId, publishModalOpen, historyDialogOpen]);

  // Compute draft changes vs active live version
  const hasUnpublishedChanges = Boolean(
    status === "published" &&
      activeVersionDef &&
      computeVersionDiff(activeVersionDef, { nodes, edges }).hasChanges,
  );

  const handleSave = () => {
    const lastSavedAt = useEditorStore.getState().lastSavedAt;
    if (useEditorStore.getState().saveWorkflow()) {
      toast("Workflow saved", {
        description: lastSavedAt ? "Latest changes are stored." : undefined,
      });
      setSavedFlash(true);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 1400);
    }
  };

  const handleTest = () => {
    setTestDialogOpen(true);
  };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const displayVersion = activeVersionNumber || publishedVersionNumber;

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-2 sm:px-3">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            aria-label="Back to workflows"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Back to workflows</TooltipContent>
      </Tooltip>

      <span className="mx-1 hidden h-5 w-px bg-border sm:block" aria-hidden />

      <div className="flex min-w-0 flex-1 items-center gap-2">
        <input
          value={name}
          onChange={(event) => updateWorkflowMetadata({ name: event.target.value })}
          aria-label="Workflow name"
          aria-keyshortcuts="(kept in toolbar)"
          className="h-9 w-full min-w-0 max-w-[260px] truncate rounded-md bg-transparent px-2 text-sm font-semibold text-ink transition-colors duration-300 hover:bg-canvas focus:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        />

        {/* Phase 7.1 Status & Active Version Badge */}
        <Badge
          variant={
            status === "published"
              ? "published"
              : status === "archived"
              ? "archived"
              : "draft"
          }
        >
          {status === "published"
            ? `Published v${displayVersion || 1}`
            : status === "archived"
            ? "Archived"
            : "Draft"}
        </Badge>

        {/* Phase 7.1 Draft Changes Detection Badge */}
        {hasUnpublishedChanges && (
          <Badge variant="draft" className="bg-amber-500/15 text-amber-600 border-amber-500/30 max-sm:hidden">
            Unpublished Changes
          </Badge>
        )}

        <span
          className={cn(
            "relative mt-0.5 hidden h-2 w-2 shrink-0 rounded-full transition-colors duration-300 md:block",
            dirty ? "bg-accent" : "bg-transparent",
          )}
          aria-hidden
          title={dirty ? "Unsaved changes" : undefined}
        />
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canUndo}
                onClick={undo}
                aria-label="Undo (Ctrl+Z)"
                className="disabled:opacity-40"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Undo</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="ghost"
                size="icon"
                disabled={!canRedo}
                onClick={redo}
                aria-label="Redo (Ctrl+Shift+Z)"
                className="disabled:opacity-40"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Redo</TooltipContent>
        </Tooltip>

        <span className="mx-1 h-5 w-px bg-border max-sm:hidden" aria-hidden />

        {/* Webhook Endpoint Panel Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWebhookPanelOpen(true)}
                className="max-sm:hidden border-accent/40 text-accent-ink hover:bg-accent/10"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Production Webhook API Endpoint & Security Docs
          </TooltipContent>
        </Tooltip>

        {/* Version History Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setHistoryDialogOpen(true)}
                className="max-sm:hidden"
              >
                <History className="h-4 w-4 text-ink-faint" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Published Version History & Live Version Control
          </TooltipContent>
        </Tooltip>

        {/* Generate with AI Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                className="max-sm:hidden border-accent/40 hover:bg-accent/10"
                onClick={() => setAiModalOpen(true)}
              >
                <Sparkles className="h-4 w-4 text-accent-ink" />
                <span className="hidden lg:inline">Generate with AI</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            Generate workflow from natural language prompt
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                className="max-sm:hidden"
                onClick={handleTest}
                disabled={nodesCount === 0}
              >
                <FlaskConical className="h-4 w-4" />
                <span className="hidden lg:inline">Test</span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {nodesCount === 0 ? "Add a node first" : "Test & Execute Workflow"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="outline"
                onClick={handleSave}
                aria-label="Save workflow (Ctrl+S)"
                className={cn(savedFlash && "border-success/50 text-success-ink")}
              >
                {savedFlash ? (
                  <Check className="h-4 w-4 text-success" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                <span className="hidden lg:inline">
                  {savedFlash ? "Saved" : "Save"}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">Save (Ctrl+S)</TooltipContent>
        </Tooltip>

        {/* Phase 7.1 Live Publish Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                variant="primary"
                onClick={() => setPublishModalOpen(true)}
                disabled={nodesCount === 0}
                className="gap-1.5 bg-success text-white hover:bg-success/90"
              >
                <Rocket className="h-4 w-4" />
                <span className="hidden lg:inline">
                  {status === "published" ? "Publish New Version" : "Publish"}
                </span>
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            {nodesCount === 0 ? "Add nodes to publish" : "Publish workflow to production"}
          </TooltipContent>
        </Tooltip>
      </div>

      <span className="ml-1 hidden items-center gap-1 text-[11px] text-ink-faint sm:flex">
        {nodesCount} {nodesCount === 1 ? "node" : "nodes"}
      </span>

      <TestExecutionDialog open={testDialogOpen} onOpenChange={setTestDialogOpen} />
      <AiGeneratorModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
      <PublishModal open={publishModalOpen} onOpenChange={setPublishModalOpen} />
      <WebhookManagementPanel
        open={webhookPanelOpen}
        onOpenChange={setWebhookPanelOpen}
        webhookSecret={webhookSecret}
        status={status}
      />
      <VersionHistoryDialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} />
    </header>
  );
}