"use client";

import { useEffect, useState } from "react";
import { History, RefreshCw, RotateCcw, X, Layers, Clock, Zap, GitCompare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { sanitizeGraph } from "@/lib/workflow";
import type { WorkflowVersionRecord, WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { VersionDiffDialog } from "./version-diff-dialog";

interface VersionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VersionHistoryDialog({ open, onOpenChange }: VersionHistoryDialogProps) {
  const workflowId = useEditorStore((s) => s.workflowId);
  const canvasNodes = useEditorStore((s) => s.nodes);
  const canvasEdges = useEditorStore((s) => s.edges);
  const loadWorkflow = useEditorStore((s) => s.loadWorkflow);
  const toast = useToastStore((s) => s.toast);

  const [versions, setVersions] = useState<WorkflowVersionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);
  const [activatingVersion, setActivatingVersion] = useState<number | null>(null);

  // Diff dialog state
  const [diffDialogOpen, setDiffDialogOpen] = useState(false);
  const [diffOld, setDiffOld] = useState<{ title: string; graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } }>({
    title: "",
    graph: { nodes: [], edges: [] },
  });
  const [diffNew, setDiffNew] = useState<{ title: string; graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] } }>({
    title: "",
    graph: { nodes: [], edges: [] },
  });

  useEffect(() => {
    if (!open || !workflowId) return;
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/workflows/${workflowId}/versions`);
        if (res.ok) {
          const data = await res.json();
          if (isMounted) setVersions(data.versions || []);
        }
      } catch {
        // Ignore
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [open, workflowId]);

  if (!open || !workflowId) return null;

  const handleMakeActive = async (versionNumber: number) => {
    setActivatingVersion(versionNumber);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Activation failed");

      toast(`Version v${versionNumber} is now ACTIVE and live for production execution!`);
      loadWorkflow(workflowId);

      // Refresh versions list
      const listRes = await fetch(`/api/workflows/${workflowId}/versions`);
      if (listRes.ok) {
        const listData = await listRes.json();
        setVersions(listData.versions || []);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Activation failed";
      toast(msg, { tone: "error" });
    } finally {
      setActivatingVersion(null);
    }
  };

  const handleRestoreVersion = async (versionNumber: number) => {
    setRestoringVersion(versionNumber);
    try {
      const res = await fetch(`/api/workflows/${workflowId}/versions/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restore failed");

      const restored = data.workflow;
      if (restored) {
        const clean = sanitizeGraph({ nodes: restored.nodes || [], edges: restored.edges || [] });

        useWorkflowStore.getState().updateWorkflowContent(workflowId, restored);

        useEditorStore.setState({
          name: restored.name,
          description: restored.description,
          status: restored.status,
          nodes: clean.nodes,
          edges: clean.edges,
          past: [],
          future: [],
          selectedNodeId: null,
          selectedEdgeId: null,
          dirty: true,
          lastSavedAt: restored.savedAt,
        });
      }

      toast(`Version v${versionNumber} restored successfully`);
      toast(`Canvas updated from version snapshot v${versionNumber}`);
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Restore failed";
      toast(msg, { tone: "error" });
    } finally {
      setRestoringVersion(null);
    }
  };

  const handleOpenDiff = (ver: WorkflowVersionRecord) => {
    setDiffOld({
      title: `Version v${ver.version}`,
      graph: { nodes: ver.definition.nodes, edges: ver.definition.edges },
    });
    setDiffNew({
      title: "Current Canvas Draft",
      graph: { nodes: canvasNodes, edges: canvasEdges },
    });
    setDiffDialogOpen(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-accent-ink" />
            <h2 className="text-sm font-semibold text-ink">Published Version Snapshot & Active Version Control</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-ink-faint hover:text-ink text-xs font-medium"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-xs text-ink-faint gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading version history...
            </div>
          ) : versions.length === 0 ? (
            <div className="p-8 text-center text-xs text-ink-faint border border-dashed border-border rounded-xl">
              No published version snapshots found. Publish your workflow to create immutable version snapshots.
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {versions.map((ver) => {
                const nodeCount = ver.definition?.nodes?.length || 0;
                const edgeCount = ver.definition?.edges?.length || 0;
                const isActive = Boolean(ver.isActive);

                return (
                  <div
                    key={ver.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-colors gap-3 ${
                      isActive ? "border-success/50 bg-success/5" : "border-border bg-surface hover:bg-canvas/50"
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      <Badge variant={isActive ? "published" : "outline"} className="font-mono text-xs shrink-0 mt-0.5 sm:mt-0">
                        v{ver.version}
                      </Badge>

                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-ink truncate">
                            {ver.definition?.name || "Workflow Version"}
                          </span>
                          {isActive && (
                            <Badge variant="published" className="text-[10px] gap-1">
                              <Zap className="h-3 w-3" />
                              ACTIVE (Live for Production)
                            </Badge>
                          )}
                        </div>
                        <span className="text-[11px] text-ink-faint font-mono flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(ver.createdAt).toLocaleString()}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Layers className="h-3 w-3" />
                            {nodeCount} nodes, {edgeCount} edges
                          </span>
                          {ver.comment && (
                            <>
                              <span>•</span>
                              <span className="italic text-ink-soft">{ver.comment}</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border flex-wrap">
                      {/* Compare Diff */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDiff(ver)}
                        className="text-xs gap-1 h-8 text-accent-ink"
                        title="Compare version graph against current canvas draft"
                      >
                        <GitCompare className="h-3.5 w-3.5" />
                        Compare
                      </Button>

                      {/* Make Active Button */}
                      {!isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleMakeActive(ver.version)}
                          disabled={activatingVersion === ver.version}
                          className="text-xs gap-1.5 h-8 border-success/40 text-success hover:bg-success/10"
                        >
                          {activatingVersion === ver.version ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Zap className="h-3.5 w-3.5" />
                          )}
                          Set Active
                        </Button>
                      )}

                      {/* Restore Version Button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(ver.version)}
                        disabled={restoringVersion === ver.version}
                        className="text-xs gap-1.5 h-8"
                      >
                        {restoringVersion === ver.version ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3.5 w-3.5" />
                        )}
                        Restore
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Version Diff Dialog */}
      <VersionDiffDialog
        open={diffDialogOpen}
        onOpenChange={setDiffDialogOpen}
        titleOld={diffOld.title}
        titleNew={diffNew.title}
        oldGraph={diffOld.graph}
        newGraph={diffNew.graph}
      />
    </div>
  );
}
