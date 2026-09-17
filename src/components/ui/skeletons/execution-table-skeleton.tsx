"use client";

import { Skeleton } from "@/components/ui/skeleton";

export function ExecutionTableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col rounded-xl border border-border bg-surface shadow-sm overflow-hidden animate-pulse">
      {/* Table Header */}
      <div className="grid grid-cols-6 gap-4 border-b border-border bg-canvas px-5 py-3 text-xs font-semibold text-ink-faint">
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-20 rounded" />
        <Skeleton className="h-4 w-16 rounded" />
        <Skeleton className="h-4 w-12 rounded" />
      </div>

      {/* Table Rows */}
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="grid grid-cols-6 gap-4 items-center px-5 py-3.5">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-4 w-36 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
