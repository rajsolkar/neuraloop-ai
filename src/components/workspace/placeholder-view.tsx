import { type LucideIcon, Clock3 } from "lucide-react";

export function PlaceholderView({
  title,
  description,
  icon: Icon,
}: {
  title: string;
  icon: LucideIcon;
  description: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-surface text-ink-soft">
        <Icon className="h-7 w-7" />
      </span>
      <div>
        <h1 className="text-xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-ink-soft">{description}</p>
      </div>
      <span className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink-faint">
        <Clock3 className="h-3.5 w-3.5" />
        Available in a later phase
      </span>
    </div>
  );
}