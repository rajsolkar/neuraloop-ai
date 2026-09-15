/**
 * Neuraloop Phase 6 — AI Workflow Generation (Auto-Layout Engine)
 * Algorithmic left-to-right auto-layout engine for generated workflow graphs.
 */

import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export function applyAutoLayout(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  if (nodes.length === 0) {
    return { nodes, edges };
  }

  // 1. Build adjacency graph & indegree map
  const adj = new Map<string, Array<{ target: string; sourceHandle?: string }>>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adj.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    if (adj.has(edge.source)) {
      adj.get(edge.source)!.push({ target: edge.target, sourceHandle: edge.sourceHandle || undefined });
    }
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
  }

  // 2. Identify root nodes (nodes with zero in-degree or triggers)
  let roots = nodes.filter((n) => (inDegree.get(n.id) || 0) === 0).map((n) => n.id);
  if (roots.length === 0 && nodes.length > 0) {
    roots = [nodes[0].id];
  }

  // 3. Level Assignment (Breadth-First Search)
  const levels = new Map<string, number>();
  const positions = new Map<string, { x: number; y: number }>();
  const queue: Array<{ id: string; level: number; yOffset: number }> = [];

  for (let i = 0; i < roots.length; i++) {
    const rootId = roots[i];
    queue.push({ id: rootId, level: 0, yOffset: i * 200 });
    levels.set(rootId, 0);
  }

  const X_SPACING = 280;
  const Y_SPACING = 140;

  while (queue.length > 0) {
    const item = queue.shift()!;
    const id = item.id;
    const level = item.level;
    const yOffset = item.yOffset;

    if (positions.has(id)) continue;

    positions.set(id, {
      x: 100 + level * X_SPACING,
      y: 150 + yOffset,
    });

    const currentNode = nodes.find((n) => n.id === id);
    const isIfNode = currentNode?.data.definitionId === "if";
    const outgoing = adj.get(id) || [];

    for (let i = 0; i < outgoing.length; i++) {
      const edgeInfo = outgoing[i];
      const targetId = edgeInfo.target;
      if (!positions.has(targetId)) {
        let childYOffset = yOffset;
        if (isIfNode) {
          // Separate TRUE path (above) and FALSE path (below)
          if (edgeInfo.sourceHandle === "true" || i === 0) {
            childYOffset = yOffset - Y_SPACING;
          } else {
            childYOffset = yOffset + Y_SPACING;
          }
        } else if (outgoing.length > 1) {
          childYOffset = yOffset + (i - (outgoing.length - 1) / 2) * Y_SPACING;
        }

        const nextLevel = Math.max(level + 1, levels.get(targetId) || 0);
        levels.set(targetId, nextLevel);
        queue.push({ id: targetId, level: nextLevel, yOffset: childYOffset });
      }
    }
  }

  // 4. Position any remaining unplaced nodes
  let unplacedIndex = 0;
  for (const node of nodes) {
    if (!positions.has(node.id)) {
      positions.set(node.id, {
        x: 100 + (levels.get(node.id) || 1) * X_SPACING,
        y: 150 + unplacedIndex * Y_SPACING,
      });
      unplacedIndex++;
    }
  }

  // 5. Update node position coordinates
  const updatedNodes = nodes.map((node) => {
    const pos = positions.get(node.id) || { x: 100, y: 150 };
    return {
      ...node,
      position: { x: pos.x, y: pos.y },
    };
  });

  return { nodes: updatedNodes, edges };
}
