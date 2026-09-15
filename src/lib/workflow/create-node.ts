import type { XYPosition } from "@xyflow/react";
import { getNodeDefinition } from "./node-definitions";
import { getDefaultNodeConfig } from "./config-schemas";
import type { WorkflowNode } from "@/types/workflow";
import { makeId } from "@/lib/utils";

/**
 * Build a fresh workflow node from a node registry key.
 * The node carries only serializable data; icon/component mappings stay in
 * the definition registry.
 */
export function createWorkflowNode(
  definitionId: string,
  position: XYPosition,
): WorkflowNode {
  const def = getNodeDefinition(definitionId);
  const definition = def ?? {
    id: definitionId,
    name: definitionId,
    category: "action" as const,
    description: "",
    icon: undefined,
    accentColor: "#8f8c82",
    defaultLabel: definitionId,
    isTrigger: false,
  };

  return {
    id: makeId("n"),
    type: "neuraloop-node",
    position,
    deletable: true,
    connectable: true,
    draggable: true,
    width: 250,
    height: 100,
    data: {
      definitionId: definition.id,
      label: definition.defaultLabel,
      description: definition.description,
      category: definition.category,
      config: getDefaultNodeConfig(definition.id),
    },
  };
}

/** Offset applied when multiple nodes are spawned at an identical spot. */
export function staggerPosition(
  base: XYPosition,
  index: number,
  step = 24,
): XYPosition {
  const axis = Math.floor(index / 2);
  return {
    x: base.x + (index % 2 === 0 ? 0 : step) + axis * step * 0.5,
    y: base.y + axis * step,
  };
}