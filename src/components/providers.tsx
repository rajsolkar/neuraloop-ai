"use client";

import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/toaster";
import { useWorkflowStore } from "@/store/workflow-store";

export function Providers({ children }: { children: React.ReactNode }) {
  // Persisted data is rehydrated on the client only, so server-rendered HTML
  // never leaks store contents and the client's first paint matches it.
  useEffect(() => {
    void useWorkflowStore.getState().fetchWorkflows();
  }, []);

  return (
    <TooltipProvider delayDuration={250}>
      {children}
      <Toaster />
    </TooltipProvider>
  );
}