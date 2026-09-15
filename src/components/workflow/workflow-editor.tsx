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
import {
  useEditorShortcuts,
} from "@/components/workflow/canvas/use-editor-shortcuts";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LayoutPanelLeft, Search } from "lucide-react";
import type { WorkflowNode } from "@/types/workflow";
import { cn } from "@/lib/utils";

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

  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    loadWorkflow(workflowId);
    return () => unloadWorkflow();
  }, [workflowId, loadWorkflow, unloadWorkflow]);

  const handleSave = useCallback(() => {
    if (saveWorkflow()) {
      toast("Workflow saved", {
        description: "Latest changes are stored on this device.",
      });
    }
  }, [saveWorkflow, toast]);

  useEditorShortcuts(handleSave);

  const getSpawnPosition = useCallback((): XYPosition => {
    const rect = flowRef.current?.getBoundingClientRect();
    const x = (rect?.left ?? 0) + (rect?.width ?? 0) / 2;
    const y = (rect?.top ?? 0) + (rect?.height ?? 0) / 2;
    const base = screenToFlowPosition({ x, y });
    // Offset repeat adds so they don't stack on the canvas center (grid spread).
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

  return (
    <div className="flex h-full flex-col">
      <WorkflowToolbar onBack={handleBack} />

      <div className="relative flex min-h-0 flex-1">
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

        <main className="relative min-w-0 flex-1">
          <WorkflowCanvas
            flowContainerRef={flowRef}
            onShowLibrary={() => setMobileLibraryOpen(true)}
            onShowInspector={() => setMobileInspectorOpen(true)}
          />
          {nodes.length === 0 && (
            <EmptyCanvasOverlay
              onOpenLibrary={() => setMobileLibraryOpen(true)}
              onAddNode={() =>
                addFromLibrary(
                  "manual-trigger",
                  getSpawnPosition(),
                )
              }
            />
          )}
        </main>

        <aside className="hidden w-72 shrink-0 flex-col border-l border-border bg-surface lg:flex">
          <NodeInspector />
        </aside>
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

function EmptyCanvasOverlay({
  onOpenLibrary,
  onAddNode,
}: {
  onOpenLibrary: () => void;
  onAddNode: () => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-6">
      <div className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-surface/95 p-6 text-center shadow-xl backdrop-blur">
        <span
          className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-dim text-accent-ink"
          aria-hidden
        >
          <LayoutPanelLeft className="h-5 w-5" />
        </span>
        <h3 className="mt-3 text-sm font-semibold text-ink">
          Start building your workflow
        </h3>
        <p className="mt-1 text-xs leading-5 text-ink-soft">
          Drag a node from the library onto the canvas, or add a trigger to get
          started.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Button variant="primary" onClick={onAddNode}>
            Add a trigger
          </Button>
          <Button variant="outline" onClick={onOpenLibrary}>
            Open library
          </Button>
        </div>
      </div>
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
