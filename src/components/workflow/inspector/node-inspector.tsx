"use client";

import { useMemo } from "react";
import {
  Copy,
  MousePointerClick,
  Trash2,
  Workflow as WorkflowIcon,
} from "lucide-react";
import { useEditorStore } from "@/store/editor-store";
import { useToastStore } from "@/store/toast-store";
import { getNodeDefinition, getDefaultNodeConfig } from "@/lib/workflow";
import { cn } from "@/lib/utils";
import type { WorkflowStatus } from "@/types/workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { NodeIcon } from "@/components/workflow/nodes/node-icon";
import { NodeConfigForm } from "@/components/workflow/inspector/forms/node-config-form";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function WorkflowDetailsForm() {
  const name = useEditorStore((s) => s.name);
  const description = useEditorStore((s) => s.description);
  const status = useEditorStore((s) => s.status);
  const updateWorkflowMetadata = useEditorStore(
    (s) => s.updateWorkflowMetadata,
  );
  const saveWorkflow = useEditorStore((s) => s.saveWorkflow);

  const statusOptions = useMemo(() => {
    const labels: Record<WorkflowStatus, string> = {
      draft: "Draft",
      published: "Published",
      archived: "Archived",
    };
    return (["draft", "published", "archived"] as WorkflowStatus[]).map((value) => ({ value, label: labels[value] }));
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5 rounded-lg border border-border bg-canvas px-3 py-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-ink/5 text-ink-soft">
          <WorkflowIcon className="h-4 w-4" />
        </span>
        <p className="text-xs leading-4 text-ink-soft">
          Editing workflow metadata. Node-specific settings arrive in a later
          phase.
        </p>
      </div>

      <Field label="Workflow name">
        <Input
          value={name}
          onChange={(event) => updateWorkflowMetadata({ name: event.target.value })}
          aria-label="Workflow name"
        />
      </Field>

      <Field label="Description">
        <Textarea
          value={description}
          onChange={(event) =>
            updateWorkflowMetadata({ description: event.target.value })
          }
          placeholder="What does this workflow do?"
          aria-label="Workflow description"
        />
      </Field>

      <Field label="Status">
        <div className="flex flex-wrap gap-1.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() =>
                updateWorkflowMetadata({ status: option.value })
              }
              aria-pressed={status === option.value}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                status === option.value
                  ? "border-accent/50 bg-accent-dim text-accent-ink"
                  : "border-border-strong bg-surface text-ink-soft hover:bg-canvas",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] leading-4 text-ink-faint">
          Workflows are not executable yet — status is stored as metadata.
        </p>
      </Field>

      <Button variant="outline" onClick={saveWorkflow}>
        Save workflow
      </Button>
    </div>
  );
}

export function NodeInspector() {
  const selectedNodeId = useEditorStore((s) => s.selectedNodeId);
  const selectedEdgeId = useEditorStore((s) => s.selectedEdgeId);
  const node = useEditorStore((s) =>
    s.nodes.find((item) => item.id === s.selectedNodeId),
  );
  const edge = useEditorStore((s) =>
    s.edges.find((item) => item.id === s.selectedEdgeId),
  );
  const updateNode = useEditorStore((s) => s.updateNode);
  const duplicateNode = useEditorStore((s) => s.duplicateNode);
  const removeNode = useEditorStore((s) => s.removeNode);
  const removeEdge = useEditorStore((s) => s.removeEdge);
  const selectNode = useEditorStore((s) => s.selectNode);
  const cleanSelection = useEditorStore((s) => s.clearSelection);
  const toast = useToastStore((s) => s.toast);

  if (selectedEdgeId && edge) {
    const sourceNode = useEditorStore
      .getState()
      .nodes.find((n) => n.id === edge.source);
    const isIfBranch = sourceNode?.data?.definitionId === "if";
    const branchLabel =
      edge.sourceHandle === "true"
        ? "TRUE branch"
        : edge.sourceHandle === "false"
        ? "FALSE branch"
        : undefined;

    return (
      <InspectorShell title="Connection">
        <div className="flex flex-col gap-4 px-4 py-4">
          <p className="text-xs leading-5 text-ink-soft">
            This connection links{" "}
            <span className="font-medium text-ink">{sourceNode?.data?.label ?? edge.source}</span> →{" "}
            <span className="font-medium text-ink">{edge.target}</span>.
          </p>
          {isIfBranch && branchLabel && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-canvas px-3 py-2 text-xs">
              <span className="font-semibold text-ink">Branch Path:</span>
              <Badge variant={edge.sourceHandle === "true" ? "active" : "draft"}>
                {branchLabel}
              </Badge>
            </div>
          )}
          <Button
            variant="danger"
            onClick={() => {
              removeEdge(edge.id);
              toast("Connection removed");
            }}
          >
            <Trash2 />
            Delete connection
          </Button>
        </div>
      </InspectorShell>
    );
  }

  if (!node) {
    return (
      <InspectorShell title="Details">
        <div className="flex flex-col gap-4 px-4 py-4">
          <p className="flex items-center gap-2 text-xs leading-5 text-ink-faint">
            <MousePointerClick className="h-4 w-4 shrink-0" />
            {selectedNodeId || selectedEdgeId
              ? "The selection could not be found."
              : "Select a node to configure it."}
          </p>
          <WorkflowDetailsForm />
        </div>
      </InspectorShell>
    );
  }

  const definition = getNodeDefinition(node.data.definitionId);
  const currentConfig =
    (node.data.config as Record<string, unknown> | undefined) ??
    getDefaultNodeConfig(node.data.definitionId);

  return (
    <InspectorShell
      title="Node"
      onClose={() => cleanSelection()}
      header={
        <div className="flex items-center gap-2.5">
          <NodeIcon
            definitionId={node.data.definitionId}
            category={node.data.category}
          />
          <span className="mr-6 min-w-0 truncate text-sm font-semibold text-ink">
            {node.data.label}
          </span>
        </div>
      }
    >
      <div className="flex flex-col gap-5 px-4 py-4">
        <Field label="Label">
          <Input
            value={node.data.label}
            onChange={(event) =>
              updateNode(node.id, { label: event.target.value })
            }
            aria-label="Node label"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={node.data.description}
            onChange={(event) =>
              updateNode(node.id, { description: event.target.value })
            }
            placeholder="Optional description"
            aria-label="Node description"
          />
        </Field>

        <div className="flex items-center gap-4">
          <Field label="Node type">
            <p className="text-xs font-medium text-ink">
              {definition?.name ?? node.data.definitionId}
            </p>
          </Field>
          <Field label="Category">
            <Badge variant="outline">
              {node.data.category}
            </Badge>
          </Field>
        </div>

        <div className="h-px bg-border my-1" aria-hidden />

        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            Configuration
          </h3>
          <NodeConfigForm
            definitionId={node.data.definitionId}
            config={currentConfig}
            onChange={(updatedConfig) =>
              updateNode(node.id, { config: updatedConfig })
            }
          />
        </div>

        <div className="h-px bg-border my-1" aria-hidden />

        <div className="flex flex-col gap-1.5">
          <Button
            variant="outline"
            onClick={() => {
              duplicateNode(node.id);
              toast("Node duplicated");
            }}
          >
            <Copy />
            Duplicate
          </Button>
          <Button
            variant="danger"
            onClick={() => {
              removeNode(node.id);
              toast("Node deleted");
              selectNode(null);
            }}
          >
            <Trash2 />
            Delete Node
          </Button>
        </div>
      </div>
    </InspectorShell>
  );
}

function InspectorShell({
  title,
  header,
  onClose,
  children,
}: {
  title: string;
  header?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        {header ?? (
          <h2 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
            {title}
          </h2>
        )}
        {onClose ? (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClose}
            aria-label="Close inspector"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  );
}