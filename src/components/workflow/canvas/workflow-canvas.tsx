"use client";

import { useCallback, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type Edge,
  type EdgeMouseHandler,
  type NodeMouseHandler,
} from "@xyflow/react";
import { ListPlus, PanelBottomOpen, Sparkles } from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { NODE_TYPES } from "@/components/workflow/nodes/workflow-node";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AiGeneratorModal } from "@/components/workflow/ai/ai-generator-modal";

interface WorkflowCanvasProps {
  flowContainerRef: React.RefObject<HTMLDivElement | null>;
  onShowLibrary: () => void;
  onShowInspector: () => void;
}

interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string | null;
}

export function WorkflowCanvas({
  flowContainerRef,
  onShowLibrary,
  onShowInspector,
}: WorkflowCanvasProps) {
  const nodes = useEditorStore((s) => s.nodes);
  const edges = useEditorStore((s) => s.edges);
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId);

  const onNodesChange = useEditorStore((s) => s.applyNodeChanges);
  const onEdgesChange = useEditorStore((s) => s.applyEdgeChanges);
  const onConnect = useEditorStore((s) => s.onConnect);
  const selectNode = useEditorStore((s) => s.selectNode);
  const selectEdge = useEditorStore((s) => s.selectEdge);
  const clearSelection = useEditorStore((s) => s.clearSelection);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const addNode = useEditorStore((s) => s.addNode);
  const onNodeDragStart = useEditorStore((s) => s.onNodeDragStart);
  const onNodeDragStop = useEditorStore((s) => s.onNodeDragStop);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();

  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    if (event.dataTransfer.types.includes("application/neuraloop-node")) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    }
  }, []);

  const handleDragLeave = useCallback(
    (event: React.DragEvent) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node)) {
        setIsDragOver(false);
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setIsDragOver(false);

      const definitionId = event.dataTransfer.getData(
        "application/neuraloop-node",
      );
      if (!definitionId) return;

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });
      addNode(definitionId, position);
    },
    [addNode, screenToFlowPosition],
  );

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
    if (selectedNodeId || selectedEdgeId) clearSelection();
  }, [selectedNodeId, selectedEdgeId, clearSelection]);

  const handleNodeClick = useCallback<NodeMouseHandler>(
    (_event, node) => {
      setContextMenu(null);
      selectNode(node.id);
    },
    [selectNode],
  );

  const handleEdgeClick = useCallback<EdgeMouseHandler>(
    (_event, edge: Edge) => {
      setContextMenu(null);
      selectEdge(edge.id);
    },
    [selectEdge],
  );

  const handleNodeContextMenu = useCallback<NodeMouseHandler>(
    (event, node) => {
      event.preventDefault();
      selectNode(node.id);
      setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
    },
    [selectNode],
  );

  const handlePaneContextMenu = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: null,
      });
    },
    [],
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      removeNode(nodeId);
      setContextMenu(null);
    },
    [removeNode],
  );

  const handleNodeDragStop = useCallback(() => {
    setContextMenu(null);
    onNodeDragStop();
  }, [onNodeDragStop]);

  return (
    <div
      ref={flowContainerRef}
      className={cn(
        "relative h-full w-full rounded-md bg-canvas",
        isDragOver && "ring-2 ring-accent/40 ring-inset",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={NODE_TYPES}
        onPaneClick={handlePaneClick}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneContextMenu={handlePaneContextMenu}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={handleNodeDragStop}
        deleteKeyCode={null}
        minZoom={0.2}
        maxZoom={2.5}
        fitView
        fitViewOptions={{ padding: 0.25, maxZoom: 1 }}
        snapToGrid
        snapGrid={[16, 16]}
        proOptions={{ hideAttribution: true }}
        colorMode="light"
        className="h-full w-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color="rgba(44,44,44,0.08)"
        />
        <MiniMap
          className="!bg-surface/80 border border-border"
          maskColor="rgba(245,241,232,0.7)"
          nodeColor={(n) =>
            (n.data as { accentColor?: string })?.accentColor ?? "#2c2c2c"
          }
          nodeStrokeWidth={2}
          pannable={false}
          zoomable={false}
        />
        <Controls
          position="bottom-right"
          showInteractive={false}
          className="border border-border shadow-sm"
        />
      </ReactFlow>

      {/* Empty Canvas Prompt Overlay */}
      {nodes.length === 0 && !isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-3 rounded-2xl border border-border bg-surface/90 backdrop-blur-xs p-6 shadow-xl text-center max-w-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/15 text-accent-ink">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Canvas is Empty</h3>
              <p className="text-xs text-ink-faint mt-1">
                Describe a workflow in natural language or drag nodes from the library to begin.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAiModalOpen(true)}
                className="text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate with AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowLibrary}
                className="text-xs gap-1.5"
              >
                <ListPlus className="h-3.5 w-3.5" />
                Open Library
              </Button>
            </div>
          </div>
        </div>
      )}

      {isDragOver && (
        <div className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-accent/60 bg-accent/5">
          <p className="text-sm font-medium text-accent-ink">Drop to add node</p>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-50 w-44 rounded-lg border border-border bg-surface p-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => event.stopPropagation()}
        >
          {contextMenu.nodeId && (
            <ContextMenuButton
              label="Duplicate node"
              onClick={() => {
                duplicateNode(contextMenu.nodeId!);
                setContextMenu(null);
              }}
            />
          )}
          <ContextMenuButton
            label="Add node"
            onClick={() => {
              setContextMenu(null);
              onShowLibrary();
            }}
          />
          <ContextMenuButton
            label="Zoom in"
            onClick={() => {
              zoomIn();
              setContextMenu(null);
            }}
          />
          <ContextMenuButton
            label="Zoom out"
            onClick={() => {
              zoomOut();
              setContextMenu(null);
            }}
          />
          <ContextMenuButton
            label="Fit view"
            onClick={() => {
              fitView({ padding: 0.25, duration: 400 });
              setContextMenu(null);
            }}
          />
          {contextMenu.nodeId && (
            <>
              <span className="my-1 h-px bg-border" aria-hidden />
              <ContextMenuButton
                variant="danger"
                label="Delete node"
                onClick={() => handleDeleteNode(contextMenu.nodeId!)}
              />
            </>
          )}
        </div>
      )}

      <MobilePanelButtons
        onShowLibrary={onShowLibrary}
        onShowInspector={onShowInspector}
      />

      <AiGeneratorModal open={aiModalOpen} onOpenChange={setAiModalOpen} />
    </div>
  );
}

function ContextMenuButton({
  label,
  onClick,
  variant = "default",
}: {
  label: string;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        variant === "danger"
          ? "text-error hover:bg-error/10"
          : "text-ink hover:bg-canvas",
      )}
    >
      {label}
    </button>
  );
}

function MobilePanelButtons({
  onShowLibrary,
  onShowInspector,
}: {
  onShowLibrary: () => void;
  onShowInspector: () => void;
}) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-1.5 lg:hidden">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto"
            onClick={onShowLibrary}
            aria-label="Open node library"
          >
            <ListPlus className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Node library</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="pointer-events-auto"
            onClick={onShowInspector}
            aria-label="Open inspector"
          >
            <PanelBottomOpen className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Details</TooltipContent>
      </Tooltip>
    </div>
  );
}