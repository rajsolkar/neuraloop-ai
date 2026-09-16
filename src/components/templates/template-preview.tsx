"use client";

import { memo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NODE_TYPES } from "@/components/workflow/nodes/workflow-node";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

interface TemplatePreviewProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  height?: string | number;
}

export const TemplatePreview = memo(function TemplatePreview({
  nodes,
  edges,
  height = 400,
}: TemplatePreviewProps) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border border-border bg-canvas shadow-xs"
      style={{ height }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag
        zoomOnScroll
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} className="!bg-surface !border-border !shadow-xs" />
      </ReactFlow>
    </div>
  );
});
