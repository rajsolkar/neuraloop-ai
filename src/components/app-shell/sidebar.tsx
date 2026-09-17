"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderKanban,
  LayoutTemplate,
  Play,
  BarChart3,
  BookOpen,
  Layers,
  Settings,
  Plus,
  X,
  PanelLeftClose,
  PanelLeft,
  type LucideIcon,
} from "lucide-react";
import { UserMenu } from "@/components/auth/user-menu";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ResizablePanel } from "@/components/ui/resizable-panel";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/workflows", icon: FolderKanban },
  { label: "Templates", href: "/templates", icon: LayoutTemplate },
  { label: "Executions", href: "/executions", icon: Play },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Docs", href: "/docs", icon: BookOpen },
  { label: "Architecture", href: "/about-architecture", icon: Layers },
  { label: "Settings", href: "/settings", icon: Settings },
];

function NeuraloopMark() {
  return (
    <img
      src="/logo.png"
      alt="Neuraloop Logo"
      className="h-7 w-7 rounded-md object-cover shadow-xs border border-border/40 shrink-0"
    />
  );
}

function SidebarContent({
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const setCreateDialogOpen = useUiStore((s) => s.setCreateDialogOpen);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full flex-col bg-surface border-r border-border overflow-hidden">
      {/* Sidebar Header */}
      <div className="flex h-14 items-center justify-between px-3.5 border-b border-border">
        <Link
          href="/"
          onClick={onNavigate}
          aria-label="Neuraloop home"
          className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
        >
          <NeuraloopMark />
          {!collapsed && (
            <span className="text-[15px] font-bold tracking-tight text-ink truncate">
              Neuraloop
            </span>
          )}
        </Link>
        {onToggleCollapse && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onToggleCollapse}
            className="hidden md:flex text-ink-faint hover:text-ink"
            aria-label="Toggle sidebar (Ctrl+B)"
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        )}
        {onNavigate && (
          <Button
            variant="ghost"
            size="icon-sm"
            className="ml-auto md:hidden"
            onClick={onNavigate}
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Create Workflow Button */}
      <div className="px-3 pt-3">
        {collapsed ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="primary"
                size="icon"
                className="w-full"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Create New Workflow</TooltipContent>
          </Tooltip>
        ) : (
          <Button
            variant="primary"
            className="w-full justify-start gap-2 text-xs font-semibold"
            onClick={() => setCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span>Create New Workflow</span>
          </Button>
        )}
      </div>

      {/* Nav List */}
      <nav
        aria-label="Main navigation"
        className="mt-4 flex flex-1 flex-col gap-1 overflow-y-auto px-2 pb-4"
      >
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          const navLink = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors duration-200",
                collapsed && "justify-center px-0",
                active
                  ? "bg-accent-dim/60 text-ink font-semibold"
                  : "text-ink-soft hover:bg-canvas hover:text-ink"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent transition-opacity duration-200",
                  active ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0 transition-colors",
                  active ? "text-accent-ink" : "text-ink-faint group-hover:text-ink"
                )}
              />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{navLink}</TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return navLink;
        })}
      </nav>

      {/* Footer User Menu */}
      <div className="border-t border-border p-3">
        <UserMenu />
      </div>
    </div>
  );
}

/** Desktop resizable & collapsible sidebar. */
export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  // Keyboard shortcut Ctrl+B / Cmd+B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <aside className="hidden md:block shrink-0">
      <ResizablePanel
        side="left"
        defaultWidth={240}
        minWidth={200}
        maxWidth={360}
        storageKey="sidebar-width"
        isCollapsed={collapsed}
        collapsedWidth={64}
        className="h-screen sticky top-0"
      >
        <SidebarContent
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((prev) => !prev)}
        />
      </ResizablePanel>
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
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <div
        onClick={() => setOpen(false)}
        className={cn(
          "absolute inset-0 bg-ink/25 backdrop-blur-[2px] transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-surface shadow-xl transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent onNavigate={() => setOpen(false)} />
      </div>
    </div>
  );
}