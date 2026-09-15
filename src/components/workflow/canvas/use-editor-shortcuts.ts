"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store/editor-store";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

function isModifier(event: KeyboardEvent): boolean {
  return event.metaKey || event.ctrlKey;
}

/**
 * Global editor keyboard shortcuts. Deletion is handled here (single history
 * entries that remove node + connected edges together), so React Flow's
 * built-in `deleteKeyCode` is disabled in the canvas.
 */
export function useEditorShortcuts(onSave?: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();

      // Saving must work even while the name/description inputs are focused.
      if (isModifier(event) && key === "s") {
        event.preventDefault();
        if (onSave) {
          onSave();
        } else {
          useEditorStore.getState().saveWorkflow();
        }
        return;
      }

      if (isModifier(event) && key === "z") {
        if (event.shiftKey) {
          event.preventDefault();
          useEditorStore.getState().redo();
        } else {
          event.preventDefault();
          useEditorStore.getState().undo();
        }
        return;
      }

      if (isModifier(event) && key === "y") {
        event.preventDefault();
        useEditorStore.getState().redo();
        return;
      }

      if (isTypingTarget(event.target)) return;

      if ((event.key === "Delete" || event.key === "Backspace") && !isModifier(event)) {
        const editor = useEditorStore.getState();
        if (editor.selectedEdgeId) {
          event.preventDefault();
          editor.removeEdge(editor.selectedEdgeId);
        } else if (editor.selectedNodeId) {
          event.preventDefault();
          editor.removeNode(editor.selectedNodeId);
        }
        return;
      }

      if (event.key === "Escape") {
        useEditorStore.getState().clearSelection();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);
}