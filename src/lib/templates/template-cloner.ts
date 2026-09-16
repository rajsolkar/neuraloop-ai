import { makeId } from "@/lib/utils";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

export interface TemplateDefinition {
  name: string;
  description: string;
  status?: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  [key: string]: unknown;
}

export class TemplateCloner {
  /**
   * Safely duplicates a workflow graph definition into an independent workflow topology.
   * Regenerates all node IDs and edge IDs to guarantee zero reference leaks across templates.
   */
  static cloneGraph(
    definition: TemplateDefinition,
    newWorkflowName?: string,
  ): {
    name: string;
    description: string;
    status: "draft";
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } {
    const rawNodes = definition.nodes || [];
    const rawEdges = definition.edges || [];

    // Map old node ID to brand new node ID
    const nodeIdMap = new Map<string, string>();
    rawNodes.forEach((node) => {
      nodeIdMap.set(node.id, `n-${makeId("cloned")}`);
    });

    // Deep clone nodes with regenerated IDs
    const clonedNodes: WorkflowNode[] = rawNodes.map((node) => {
      const newNodeId = nodeIdMap.get(node.id) || `n-${makeId("cloned")}`;
      const clonedData = JSON.parse(JSON.stringify(node.data || {}));
      
      // Clear last execution status on fresh cloned canvas
      delete clonedData.lastExecutionStatus;

      return {
        ...node,
        id: newNodeId,
        data: clonedData,
        position: {
          x: node.position?.x ?? 100,
          y: node.position?.y ?? 100,
        },
      };
    });

    // Deep clone edges linking mapped node IDs
    const clonedEdges: WorkflowEdge[] = rawEdges.map((edge) => {
      const newEdgeId = `e-${makeId("cloned")}`;
      const newSource = nodeIdMap.get(edge.source) || edge.source;
      const newTarget = nodeIdMap.get(edge.target) || edge.target;

      return {
        ...edge,
        id: newEdgeId,
        source: newSource,
        target: newTarget,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      };
    });

    return {
      name: newWorkflowName || `${definition.name || "Cloned Workflow"}`,
      description: definition.description || "",
      status: "draft",
      nodes: clonedNodes,
      edges: clonedEdges,
    };
  }
}
