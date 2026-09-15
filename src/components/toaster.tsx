"use client";

import { CheckCircle2, Info, CircleAlert, Bell } from "lucide-react";
import { useToastStore, type ToastTone } from "@/store/toast-store";
import { cn } from "@/lib/utils";

const TONE_ICON: Record<ToastTone, React.ComponentType<{ className?: string }>> = {
  default: Bell,
  success: CheckCircle2,
  error: CircleAlert,
  info: Info,
};

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
    >
      {toasts.map((toast) => {
        const Icon = TONE_ICON[toast.tone];
        return (
          <div
            key={toast.id}
            role="status"
            className={cn(
              "pointer-events-auto flex items-start gap-3 rounded-lg border bg-surface p-3 shadow-lg animate-in slide-in-from-top-2 fade-in-0 duration-300",
              toast.tone === "error" && "border-error/40",
              toast.tone === "success" && "border-success/40",
              toast.tone === "info" && "border-accent/50",
            )}
          >
            <span
              className={cn(
                "mt-0.5 shrink-0",
                toast.tone === "error" && "text-error",
                toast.tone === "success" && "text-success",
                toast.tone === "info" && "text-accent-ink",
                toast.tone === "default" && "text-ink-soft",
              )}
            >
              <Icon className="h-4 w-4" />
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <p className="text-sm font-medium leading-5 text-ink">
                {toast.title}
              </p>
              {toast.description ? (
                <p className="text-xs leading-4 text-ink-soft">
                  {toast.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded p-0.5 text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
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
              <span className="sr-only">Close</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}