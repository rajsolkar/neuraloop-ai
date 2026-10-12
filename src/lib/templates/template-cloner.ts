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

    // Deep clone nodes with regenerated IDs and sanitized credentials
    const clonedNodes: WorkflowNode[] = rawNodes.map((node) => {
      const newNodeId = nodeIdMap.get(node.id) || `n-${makeId("cloned")}`;
      let dataJson = JSON.stringify(node.data || {});

      // Remap any references to old node IDs inside expressions (e.g. steps.node-ai-1.text -> steps.n-cloned-xxx.text)
      for (const [oldId, remappedId] of nodeIdMap.entries()) {
        dataJson = dataJson.replaceAll(oldId, remappedId);
      }

      const clonedData = JSON.parse(dataJson);

      // Clear last execution status on fresh cloned canvas
      delete clonedData.lastExecutionStatus;

      // Ensure credential IDs and embedded secrets are wiped clean so user configures their own
      if (clonedData.config && typeof clonedData.config === "object") {
        if ("credentialId" in clonedData.config) {
          clonedData.config.credentialId = "";
        }
        if ("bearerToken" in clonedData.config && clonedData.config.authType === "bearer") {
          clonedData.config.bearerToken = "";
        }
        if ("apiKeyValue" in clonedData.config && clonedData.config.authType === "api_key") {
          clonedData.config.apiKeyValue = "";
        }
      }

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
