/**
 * Neuraloop Phase 7.1 — Version Comparison & Graph Diff Engine
 * Computes structural additions, removals, and node configuration modifications between workflow versions.
 */

import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface NodeDiffItem {
  type: "added" | "removed" | "modified";
  id: string;
  label: string;
  definitionId: string;
  detail?: string;
}

export interface EdgeDiffItem {
  type: "added" | "removed";
  id: string;
  detail: string;
}

export interface VersionDiffSummary {
  addedNodesCount: number;
  removedNodesCount: number;
  modifiedNodesCount: number;
  addedEdgesCount: number;
  removedEdgesCount: number;
  nodeChanges: NodeDiffItem[];
  edgeChanges: EdgeDiffItem[];
  hasChanges: boolean;
}

export function computeVersionDiff(
  oldGraph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
  newGraph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] },
): VersionDiffSummary {
  const oldNodes = oldGraph.nodes || [];
  const oldEdges = oldGraph.edges || [];
  const newNodes = newGraph.nodes || [];
  const newEdges = newGraph.edges || [];

  const oldNodeMap = new Map(oldNodes.map((n) => [n.id, n]));
  const newNodeMap = new Map(newNodes.map((n) => [n.id, n]));

  const nodeChanges: NodeDiffItem[] = [];

  // Detect added and modified nodes
  for (const newNode of newNodes) {
    const oldNode = oldNodeMap.get(newNode.id);
    const label = newNode.data?.label || newNode.id;
    const defId = newNode.data?.definitionId || "node";

    if (!oldNode) {
      nodeChanges.push({
        type: "added",
        id: newNode.id,
        label,
        definitionId: defId,
        detail: `Added new node "${label}" (${defId})`,
      });
    } else {
      // Check config or label changes
      const oldConfig = JSON.stringify(oldNode.data?.config || {});
      const newConfig = JSON.stringify(newNode.data?.config || {});
      const labelChanged = oldNode.data?.label !== newNode.data?.label;

      if (oldConfig !== newConfig || labelChanged) {
        nodeChanges.push({
          type: "modified",
          id: newNode.id,
          label,
          definitionId: defId,
          detail: labelChanged
            ? `Renamed node to "${label}"`
            : `Updated configuration for "${label}"`,
        });
      }
    }
  }

  // Detect removed nodes
  for (const oldNode of oldNodes) {
    if (!newNodeMap.has(oldNode.id)) {
      const label = oldNode.data?.label || oldNode.id;
      const defId = oldNode.data?.definitionId || "node";
      nodeChanges.push({
        type: "removed",
        id: oldNode.id,
        label,
        definitionId: defId,
        detail: `Removed node "${label}" (${defId})`,
      });
    }
  }

  // Edge Diffs
  const oldEdgeMap = new Map(
    oldEdges.map((e) => [`${e.source}:${e.sourceHandle || "out"}->${e.target}:${e.targetHandle || "in"}`, e]),
  );
  const newEdgeMap = new Map(
    newEdges.map((e) => [`${e.source}:${e.sourceHandle || "out"}->${e.target}:${e.targetHandle || "in"}`, e]),
  );

  const edgeChanges: EdgeDiffItem[] = [];

  for (const [key, newEdge] of newEdgeMap.entries()) {
    if (!oldEdgeMap.has(key)) {
      const sourceLabel = newNodeMap.get(newEdge.source)?.data?.label || newEdge.source;
      const targetLabel = newNodeMap.get(newEdge.target)?.data?.label || newEdge.target;
      edgeChanges.push({
        type: "added",
        id: newEdge.id,
        detail: `Connected "${sourceLabel}" → "${targetLabel}"`,
      });
    }
  }

  for (const [key, oldEdge] of oldEdgeMap.entries()) {
    if (!newEdgeMap.has(key)) {
      const sourceLabel = oldNodeMap.get(oldEdge.source)?.data?.label || oldEdge.source;
      const targetLabel = oldNodeMap.get(oldEdge.target)?.data?.label || oldEdge.target;
      edgeChanges.push({
        type: "removed",
        id: oldEdge.id,
        detail: `Disconnected "${sourceLabel}" → "${targetLabel}"`,
      });
    }
  }

  const addedNodesCount = nodeChanges.filter((n) => n.type === "added").length;
  const removedNodesCount = nodeChanges.filter((n) => n.type === "removed").length;
  const modifiedNodesCount = nodeChanges.filter((n) => n.type === "modified").length;
  const addedEdgesCount = edgeChanges.filter((e) => e.type === "added").length;
  const removedEdgesCount = edgeChanges.filter((e) => e.type === "removed").length;

  const hasChanges = nodeChanges.length > 0 || edgeChanges.length > 0;

  return {
    addedNodesCount,
    removedNodesCount,
    modifiedNodesCount,
    addedEdgesCount,
    removedEdgesCount,
    nodeChanges,
    edgeChanges,
    hasChanges,
  };
}
