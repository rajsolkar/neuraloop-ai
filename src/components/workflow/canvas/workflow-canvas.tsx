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
import { ListPlus, PanelBottomOpen, Sparkles, X, Lightbulb, Plus, Zap } from "lucide-react";
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
import { Mascot } from "@/components/mascot/mascot";
import { MascotBubble } from "@/components/mascot/mascot-bubble";

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

      {/* Dismissible Onboarding Banner */}
      {typeof window !== "undefined" && !localStorage.getItem("nori_onboarding_dismissed") && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 bg-zinc-900/90 border border-emerald-500/30 text-zinc-100 text-xs px-4 py-2 rounded-full shadow-lg backdrop-blur-sm">
          <Mascot mood="happy" size="xs" animate={false} />
          <div className="flex items-center gap-2 font-medium">
            <span className="text-emerald-400 font-semibold">Nori Guide:</span>
            <span>1. Add Trigger → 2. Add AI Node → 3. Connect Edges → 4. Click Test Run</span>
          </div>
          <button
            onClick={() => {
              localStorage.setItem("nori_onboarding_dismissed", "true");
              // trigger rerender
              setContextMenu(null);
            }}
            className="text-zinc-400 hover:text-white p-0.5 ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* AI Workflow Suggestions Bar (When canvas has nodes) */}
      {nodes.length > 0 && (
        <div className="absolute bottom-4 left-4 z-20 pointer-events-auto flex items-center gap-3 bg-zinc-900/95 border border-zinc-700/80 rounded-2xl px-4 py-2.5 shadow-xl text-xs text-zinc-200">
          <Mascot mood="thinking" size="xs" animate={true} />
          <div className="flex items-center gap-2">
            <span className="font-semibold text-emerald-400">Nori Copilot:</span>
            <span>
              {nodes[nodes.length - 1]?.data?.definitionId === "ai"
                ? "Want me to add a Telegram notification step?"
                : nodes[nodes.length - 1]?.data?.definitionId === "manual-trigger" || nodes[nodes.length - 1]?.data?.definitionId === "webhook"
                ? "Want me to add an AI processing node?"
                : "Most workflows add Google Sheets or HTTP Request next."}
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const lastNode = nodes[nodes.length - 1];
              const posX = lastNode ? lastNode.position.x + 240 : 250;
              const posY = lastNode ? lastNode.position.y : 150;
              const targetDef = lastNode?.data?.definitionId === "ai" ? "telegram" : "ai";
              addNode(targetDef, { x: posX, y: posY });
            }}
            className="h-7 text-xs bg-emerald-950/40 hover:bg-emerald-900/60 border-emerald-500/40 text-emerald-300 gap-1 font-semibold"
          >
            <Plus className="w-3 h-3" /> Add Step
          </Button>
        </div>
      )}

      {/* Smart Empty Canvas Overlay */}
      {nodes.length === 0 && !isDragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950/85 backdrop-blur-md p-8 shadow-2xl text-center max-w-md">
            <Mascot
              mood="default"
              size="lg"
              message="What do you want to automate today?"
              bubblePosition="top"
              animate={true}
            />

            <div className="mt-2">
              <h3 className="text-base font-bold text-zinc-100">Smart Automation Canvas</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                Choose a starter template or describe your automation goal in plain English.
              </p>
            </div>

            {/* Starter Template Chips */}
            <div className="grid grid-cols-2 gap-2 w-full mt-1">
              {[
                { title: "Lead Qualification", prompt: "Webhook -> AI -> Switch -> Telegram" },
                { title: "Content Factory", prompt: "Schedule -> AI -> Google Sheets" },
                { title: "Support Ticket Router", prompt: "Webhook -> AI -> Switch" },
                { title: "Research Assistant", prompt: "Google Sheets -> Loop -> AI" },
              ].map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setAiModalOpen(true)}
                  className="flex flex-col items-start p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 hover:border-emerald-500/40 text-left transition-all group"
                >
                  <span className="text-xs font-semibold text-zinc-200 group-hover:text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3 text-emerald-400" />
                    {chip.title}
                  </span>
                  <span className="text-[10px] text-zinc-400 mt-0.5 font-mono truncate w-full">
                    {chip.prompt}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3 w-full mt-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setAiModalOpen(true)}
                className="flex-1 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Generate with Nori AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onShowLibrary}
                className="flex-1 text-xs gap-1.5 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              >
                <ListPlus className="h-3.5 w-3.5" />
                Browse Nodes
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