"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ReactFlowProvider,
  useReactFlow,
  type XYPosition,
} from "@xyflow/react";
import { WorkflowToolbar } from "@/components/workflow/toolbar/workflow-toolbar";
import { WorkflowCanvas } from "@/components/workflow/canvas/workflow-canvas";
import { NodeLibrary } from "@/components/workflow/node-library/node-library";
import { NodeInspector } from "@/components/workflow/inspector/node-inspector";
import { useEditorShortcuts } from "@/components/workflow/canvas/use-editor-shortcuts";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutPanelLeft, Search, Eye, Maximize2, X } from "lucide-react";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import { createWorkflowNode } from "@/lib/workflow";
import { cn } from "@/lib/utils";
import { AskNoriFloatingPanel } from "@/components/workflow/ai/ask-nori-floating-panel";
import { useWorkflowStore } from "@/store/workflow-store";
import { ResizablePanel } from "@/components/ui/resizable-panel";

export function WorkflowEditor({ workflowId }: { workflowId: string }) {
  return (
    <ReactFlowProvider>
      <EditorInner workflowId={workflowId} />
    </ReactFlowProvider>
  );
}

function EditorInner({ workflowId }: { workflowId: string }) {
  const router = useRouter();
  const loadWorkflow = useEditorStore((s) => s.loadWorkflow);
  const unloadWorkflow = useEditorStore((s) => s.unloadWorkflow);
  const notFound = useEditorStore((s) => s.notFound);
  const nodes = useEditorStore((s) => s.nodes);
  const saveWorkflow = useEditorStore((s) => s.saveWorkflow);
  const addNode = useEditorStore((s) => s.addNode);
  const toast = useToastStore((s) => s.toast);

  const flowRef = useRef<HTMLDivElement | null>(null);
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false);
  const [mobileInspectorOpen, setMobileInspectorOpen] = useState(false);
  
  const [focusMode, setFocusMode] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [inspectorCollapsed, setInspectorCollapsed] = useState(false);

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    loadWorkflow(workflowId);
    return () => unloadWorkflow();
  }, [workflowId, loadWorkflow, unloadWorkflow]);

  // Keyboard listener for Ctrl+I (Inspector toggle)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setInspectorCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSave = useCallback(() => {
    if (saveWorkflow()) {
      toast("Workflow saved", {
        description: "Latest changes are stored on this device.",
      });
    }
  }, [saveWorkflow, toast]);

  const toggleFocus = useCallback(() => {
    setFocusMode((prev) => !prev);
    setPresentationMode(false);
  }, []);

  const togglePresentation = useCallback(() => {
    setPresentationMode((prev) => !prev);
    setFocusMode(false);
  }, []);

  useEditorShortcuts(handleSave, toggleFocus, togglePresentation);

  const getSpawnPosition = useCallback((): XYPosition => {
    const rect = flowRef.current?.getBoundingClientRect();
    const x = (rect?.left ?? 0) + (rect?.width ?? 0) / 2;
    const y = (rect?.top ?? 0) + (rect?.height ?? 0) / 2;
    const base = screenToFlowPosition({ x, y });
    const count = useEditorStore.getState().nodes.length;
    const col = count % 2;
    const row = Math.floor(count / 2) % 4;
    return { x: base.x + col * 260, y: base.y + row * 150 };
  }, [screenToFlowPosition]);

  const addFromLibrary = useCallback(
    (definitionId: string, position: XYPosition): WorkflowNode | null =>
      addNode(definitionId, position),
    [addNode],
  );

  const handleBack = useCallback(() => {
    router.push("/workflows");
  }, [router]);

  if (notFound) {
    return (
      <div className="flex min-h-full flex-col">
        <WorkflowToolbar onBack={handleBack} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-surface text-ink-soft">
            <Search className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-ink">
              Workflow not found
            </h2>
            <p className="mt-1 text-xs leading-5 text-ink-soft">
              The workflow you tried to open doesn’t exist or was deleted.
            </p>
          </div>
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft />
            Back to workflows
          </Button>
        </div>
      </div>
    );
  }

  const showSidebar = !focusMode && !presentationMode;
  const showInspector = !focusMode && !presentationMode && !inspectorCollapsed;
  const showToolbar = !presentationMode;

  return (
    <div className="flex h-full flex-col">
      {showToolbar && <WorkflowToolbar onBack={handleBack} />}

      <div className="relative flex min-h-0 flex-1">
        {/* Left Node Library Sidebar */}
        {showSidebar && (
          <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface lg:flex">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                Library
              </h2>
              <LayoutPanelLeft className="h-3.5 w-3.5 text-ink-faint" aria-hidden />
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              <NodeLibrary
                onAddFromLibrary={addFromLibrary}
                getSpawnPosition={getSpawnPosition}
              />
            </div>
          </aside>
        )}

        <main className="relative min-w-0 flex-1 flex flex-col">
          <div className="relative flex-1">
            <WorkflowCanvas
              flowContainerRef={flowRef}
              onShowLibrary={() => setMobileLibraryOpen(true)}
              onShowInspector={() => setMobileInspectorOpen(true)}
            />

            {/* Focus or Presentation Mode Exit Pill Indicator */}
            {(focusMode || presentationMode) && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 rounded-full border border-border bg-surface/90 backdrop-blur-md shadow-xl text-xs font-medium text-ink">
                <span className="flex items-center gap-1.5 font-semibold text-accent-ink">
                  {presentationMode ? <Maximize2 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {presentationMode ? "Presentation Mode" : "Focus Mode"}
                </span>
                <span className="text-ink-faint">
                  Press {presentationMode ? "P" : "F"} or ESC to exit
                </span>
                <button
                  onClick={() => {
                    setFocusMode(false);
                    setPresentationMode(false);
                  }}
                  className="text-ink-soft hover:text-ink p-0.5 ml-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Cursor-style Ask Nori Assistant (Single Assistant Surface) */}
            {workflowId && !presentationMode && (
              <AskNoriFloatingPanel
                currentWorkflow={{
                  name: useEditorStore.getState().name || "Workflow",
                  description: useEditorStore.getState().description || "",
                  nodes: nodes.map((n) => ({
                    id: n.id,
                    definitionId: n.data.definitionId as any,
                    label: n.data.label,
                    config: (n.data.config as Record<string, unknown>) || {},
                  })),
                  edges: useEditorStore.getState().edges.map((e) => ({
                    id: e.id,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle || undefined,
                    targetHandle: e.targetHandle || undefined,
                  })),
                }}
                onApplyRefinement={(updated, summary) => {
                  const { updateWorkflowContent, saveWorkflowToServer } = useWorkflowStore.getState();
                  const fullNodes: WorkflowNode[] = updated.nodes.map((n, idx) => {
                    const node = createWorkflowNode(n.definitionId, { x: 250 + idx * 280, y: 150 });
                    node.id = n.id;
                    node.data.label = n.label;
                    const cfg = (n.config && typeof n.config === "object") ? (n.config as Record<string, unknown>) : {};
                    node.data.config = Object.assign({}, (node.data.config as Record<string, unknown>) || {}, cfg);
                    return node;
                  });
                  const fullEdges: WorkflowEdge[] = updated.edges.map((e, idx) => ({
                    id: e.id || `e-${idx + 1}`,
                    source: e.source,
                    target: e.target,
                    sourceHandle: e.sourceHandle || "out",
                    targetHandle: e.targetHandle || "in",
                  }));
                  updateWorkflowContent(workflowId, {
                    nodes: fullNodes,
                    edges: fullEdges,
                  });
                  loadWorkflow(workflowId);
                  saveWorkflowToServer(workflowId);
                  toast(summary, { description: "Graph updated by Nori Assistant" });
                }}
              />
            )}
          </div>
        </main>

        {/* Resizable & Collapsible Inspector Drawer */}
        {showInspector && (
          <aside className="hidden lg:block shrink-0">
            <ResizablePanel
              side="right"
              defaultWidth={340}
              minWidth={280}
              maxWidth={560}
              storageKey="inspector-width"
              className="h-full border-l border-border bg-surface"
            >
              <NodeInspector />
            </ResizablePanel>
          </aside>
        )}
      </div>

      {mobileLibraryOpen && (
        <MobileDrawer
          side="left"
          title="Library"
          onClose={() => setMobileLibraryOpen(false)}
        >
          <NodeLibrary
            onAddFromLibrary={addFromLibrary}
            getSpawnPosition={getSpawnPosition}
          />
        </MobileDrawer>
      )}

      {mobileInspectorOpen && (
        <MobileDrawer
          side="right"
          onClose={() => setMobileInspectorOpen(false)}
        >
          <NodeInspector />
        </MobileDrawer>
      )}
    </div>
  );
}

function MobileDrawer({
  side,
  title,
  onClose,
  children,
}: {
  side: "left" | "right";
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal>
      <button
        type="button"
        className="absolute inset-0 bg-ink/30"
        onClick={onClose}
        aria-label="Close panel"
      />
      <aside
        className={cn(
          "absolute inset-y-0 flex w-80 max-w-[88vw] flex-col bg-surface shadow-2xl",
          side === "left" ? "left-0" : "right-0",
        )}
      >
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {title ?? "Details"}
          </h2>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close panel"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </aside>
    </div>
  );
}
