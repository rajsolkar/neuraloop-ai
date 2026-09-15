"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkflowStore } from "@/store/workflow-store";
import { useUiStore } from "@/store/ui-store";
import { useToastStore } from "@/store/toast-store";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CreateWorkflowDialog() {
  const router = useRouter();
  const createWorkflow = useWorkflowStore((s) => s.createWorkflow);
  const open = useUiStore((s) => s.createDialogOpen);
  const setOpen = useUiStore((s) => s.setCreateDialogOpen);
  const toast = useToastStore((s) => s.toast);

  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) setName("");
  };

  const handleCreate = () => {
    const id = createWorkflow({ name });
    setOpen(false);
    setName("");
    toast("Workflow created", {
      tone: "success",
      description: name.trim() || "Untitled Workflow",
    });
    router.push(`/workflows/${id}`);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Create Workflow</DialogTitle>
          <DialogDescription>
            Give your workflow a name. You can change it anytime in the editor.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleCreate();
          }}
          className="flex flex-col gap-2"
        >
          <Label htmlFor="workflow-name">Workflow name</Label>
          <Input
            ref={inputRef}
            id="workflow-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Untitled Workflow"
            maxLength={80}
            autoComplete="off"
          />
        </form>
        <DialogFooter>
          <Button variant="ghost" type="button" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={handleCreate}>
            Create Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}