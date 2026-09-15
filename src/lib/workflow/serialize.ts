import type { WorkflowEdge, WorkflowNode } from "@/types/workflow";

/**
 * Strip React Flow's ephemeral fields (measured sizes, transient selection,
 * drag state) so that persisted workflow state stays clean and canonical.
 */
export function sanitizeNode(node: WorkflowNode): WorkflowNode {
  return {
    ...node,
    selected: false,
    dragging: false,
    measured: undefined,
  } as WorkflowNode;
}

export function sanitizeEdge(edge: WorkflowEdge): WorkflowEdge {
  return {
    ...edge,
    selected: false,
  } as WorkflowEdge;
}

export function sanitizeNodes(nodes: WorkflowNode[]): WorkflowNode[] {
  return (nodes || []).map(sanitizeNode);
}

/**
 * Validates graph edge integrity:
 * 1. Strips orphaned edges whose source or target node no longer exists.
 * 2. Prevents self-loop edges (source === target).
 * 3. Prevents duplicate edge IDs.
 * 4. Prevents duplicate edge connections between the exact same handles.
 */
export function sanitizeEdges(
  edges: WorkflowEdge[],
  nodesOrIds?: WorkflowNode[] | Set<string>,
): WorkflowEdge[] {
  let validNodeIds: Set<string> | null = null;
  if (nodesOrIds) {
    if (nodesOrIds instanceof Set) {
      validNodeIds = nodesOrIds;
    } else {
      validNodeIds = new Set((nodesOrIds || []).map((n) => n.id));
    }
  }

  const seenIds = new Set<string>();
  const seenConnections = new Set<string>();
  const result: WorkflowEdge[] = [];

  for (const rawEdge of edges || []) {
    if (!rawEdge || !rawEdge.id || !rawEdge.source || !rawEdge.target) continue;

    // Rule 1: Remove edges referencing non-existent nodes
    if (
      validNodeIds &&
      (!validNodeIds.has(rawEdge.source) || !validNodeIds.has(rawEdge.target))
    ) {
      continue;
    }

    // Rule 2: Prevent self-loop edges
    if (rawEdge.source === rawEdge.target) {
      continue;
    }

    // Rule 3: Prevent duplicate edge IDs
    if (seenIds.has(rawEdge.id)) {
      continue;
    }

    // Rule 4: Prevent duplicate edge connections between the exact same handles
    const sourceHandle = rawEdge.sourceHandle ?? "out";
    const targetHandle = rawEdge.targetHandle ?? "in";
    const connKey = `${rawEdge.source}:${sourceHandle}->${rawEdge.target}:${targetHandle}`;
    if (seenConnections.has(connKey)) {
      continue;
    }

    seenIds.add(rawEdge.id);
    seenConnections.add(connKey);

    result.push({
      ...rawEdge,
      sourceHandle,
      targetHandle,
      selected: rawEdge.selected ?? false,
    });
  }

  return result;
}

/**
 * Validates overall graph integrity, sanitizing nodes and edges together.
 */
export function sanitizeGraph(graph: {
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  const sanitizedNodes = sanitizeNodes(graph.nodes ?? []);
  const sanitizedEdges = sanitizeEdges(graph.edges ?? [], sanitizedNodes);

  return {
    nodes: sanitizedNodes,
    edges: sanitizedEdges,
  };
}