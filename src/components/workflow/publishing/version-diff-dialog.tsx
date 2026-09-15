"use client";

import { GitCompare, Plus, Minus, Edit3, ArrowRight, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { computeVersionDiff } from "@/lib/workflow/version-diff";

interface VersionDiffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  titleOld?: string;
  titleNew?: string;
  oldGraph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  newGraph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
}

export function VersionDiffDialog({
  open,
  onOpenChange,
  titleOld = "Previous Version",
  titleNew = "Newer Version",
  oldGraph,
  newGraph,
}: VersionDiffDialogProps) {
  if (!open) return null;

  const diff = computeVersionDiff(oldGraph, newGraph);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 backdrop-blur-xs p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl">
        <div className="flex h-12 items-center justify-between border-b border-border px-4">
          <div className="flex items-center gap-2">
            <GitCompare className="h-4 w-4 text-accent-ink" />
            <h2 className="text-sm font-semibold text-ink">Version Graph Comparison Viewer</h2>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-ink-faint hover:text-ink text-xs font-medium"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
          {/* Version Titles & Metrics */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-canvas/60 p-4">
            <div className="flex items-center justify-between text-xs font-bold text-ink">
              <span className="flex items-center gap-1.5">
                <Badge variant="outline">{titleOld}</Badge>
              </span>
              <ArrowRight className="h-4 w-4 text-ink-faint shrink-0" />
              <span className="flex items-center gap-1.5">
                <Badge variant="active" className="bg-accent/20 text-accent-ink border-accent/40">
                  {titleNew}
                </Badge>
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border">
              {diff.addedNodesCount > 0 && (
                <Badge variant="active" className="bg-success/20 text-success border-success/30 text-[10px] gap-1">
                  <Plus className="h-3 w-3" />
                  {diff.addedNodesCount} Added {diff.addedNodesCount === 1 ? "Node" : "Nodes"}
                </Badge>
              )}
              {diff.removedNodesCount > 0 && (
                <Badge variant="draft" className="bg-error/15 text-error border-error/30 text-[10px] gap-1">
                  <Minus className="h-3 w-3" />
                  {diff.removedNodesCount} Removed {diff.removedNodesCount === 1 ? "Node" : "Nodes"}
                </Badge>
              )}
              {diff.modifiedNodesCount > 0 && (
                <Badge variant="draft" className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px] gap-1">
                  <Edit3 className="h-3 w-3" />
                  {diff.modifiedNodesCount} Modified {diff.modifiedNodesCount === 1 ? "Node" : "Nodes"}
                </Badge>
              )}
              {diff.addedEdgesCount > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  +{diff.addedEdgesCount} Connections Added
                </Badge>
              )}
              {diff.removedEdgesCount > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1">
                  -{diff.removedEdgesCount} Connections Removed
                </Badge>
              )}
              {!diff.hasChanges && (
                <span className="text-xs text-ink-faint">No structural changes detected between versions.</span>
              )}
            </div>
          </div>

          {/* Node Diffs */}
          {diff.nodeChanges.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-ink">Node Graph Changes ({diff.nodeChanges.length})</h4>
              <div className="flex flex-col gap-1.5">
                {diff.nodeChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs ${
                      change.type === "added"
                        ? "border-success/30 bg-success/10 text-success"
                        : change.type === "removed"
                        ? "border-error/30 bg-error/10 text-error"
                        : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {change.type === "added" && <Plus className="h-3.5 w-3.5 shrink-0" />}
                      {change.type === "removed" && <Minus className="h-3.5 w-3.5 shrink-0" />}
                      {change.type === "modified" && <Edit3 className="h-3.5 w-3.5 shrink-0" />}
                      <span className="font-semibold">{change.label}</span>
                    </div>
                    <span className="text-[11px] opacity-90">{change.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Edge Diffs */}
          {diff.edgeChanges.length > 0 && (
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-semibold text-ink">Wiring Connections Changes ({diff.edgeChanges.length})</h4>
              <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                {diff.edgeChanges.map((change, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded border ${
                      change.type === "added"
                        ? "border-success/30 bg-success/5 text-success"
                        : "border-error/30 bg-error/5 text-error"
                    }`}
                  >
                    {change.type === "added" ? "+ " : "- "}
                    {change.detail}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
