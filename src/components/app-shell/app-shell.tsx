"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";
import { Sidebar, MobileSidebar } from "@/components/app-shell/sidebar";
import { CreateWorkflowDialog } from "@/components/workspace/create-workflow-dialog";
import { useUiStore } from "@/store/ui-store";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setMobileSidebarOpen = useUiStore((s) => s.setMobileSidebarOpen);
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);

  // Close transient UI (mobile sidebar, dialogs, drawers) on route change.
  useEffect(() => {
    useUiStore.getState().closeAllForNavigation();
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-surface px-3 md:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <span className="text-sm font-bold text-ink">Neuraloop</span>
          <Button
            variant="primary"
            size="sm"
            className="ml-auto"
            onClick={() => setCreateDialogOpen(true)}
          >
            New workflow
          </Button>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
      <MobileSidebar />
      <CreateWorkflowDialog />
    </div>
  );
}