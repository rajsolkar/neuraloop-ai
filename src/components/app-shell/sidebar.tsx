"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  Home,
  LayoutTemplate,
  Play,
  Plus,
  Settings,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/workflows", icon: FolderKanban },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
  { label: "Executions", href: "/executions", icon: Play },
  { label: "Team", href: "/team", icon: Users },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NeuraloopMark() {
  return (
    <img
      src="/logo.png"
      alt="Neuraloop Logo"
      className="h-7 w-7 rounded-md object-cover shadow-xs border border-border/40"
    />
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center gap-2 px-4">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Neuraloop home"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <NeuraloopMark />
          <span className="text-[15px] font-bold tracking-tight text-ink">
            Neuraloop
          </span>
        </Link>
        {onNavigate ? (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto md:hidden"
            onClick={onNavigate}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      <div className="px-3 pt-2">
        <Button
          variant="primary"
          className="w-full justify-start gap-2"
          onClick={() => setCreateDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Create New Workflow
        </Button>
      </div>

      <nav
        aria-label="Main navigation"
        className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 pb-4"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-300",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                active
                  ? "bg-accent-dim/60 text-ink"
                  : "text-ink-soft hover:bg-ink/5 hover:text-ink",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-300",
                  active ? "opacity-100" : "opacity-0",
                )}
              />
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-accent-ink" : "text-ink-faint group-hover:text-ink",
                )}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <UserMenu />
      </div>
    </div>
  );
}

/** Desktop sidebar rendered inside the app frame. */
export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r border-border bg-surface md:block">
      <div className="sticky top-0 h-screen">
        <SidebarContent />
      </div>
    </aside>
  );
}

/** Mobile slide-over driven by the UI store. */
export function MobileSidebar() {
  const open = useUiStore((s) => s.mobileSidebarOpen);
  const setOpen = useUiStore((s) => s.setMobileSidebarOpen);

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "fixed inset-0 z-[55] md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}