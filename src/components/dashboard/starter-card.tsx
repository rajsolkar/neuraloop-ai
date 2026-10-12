"use client";

import {
  Send,
  Brain,
  Mail,
  FileSpreadsheet,
  Workflow,
  GitBranch,
  KeyRound,
  CheckCircle2,
  ArrowRight,
  Eye,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StarterTemplateItem } from "@/lib/templates/starter-templates";

const ICON_MAP: Record<string, LucideIcon> = {
  Send,
  Brain,
  Mail,
  FileSpreadsheet,
  Workflow,
  GitBranch,
};

interface StarterCardProps {
  starter: StarterTemplateItem;
  onPreview: (starter: StarterTemplateItem) => void;
  onUseTemplate: (starter: StarterTemplateItem) => void;
  cloning?: boolean;
}

export function StarterCard({
  starter,
  onPreview,
  onUseTemplate,
  cloning = false,
}: StarterCardProps) {
  const IconComp = ICON_MAP[starter.icon] || Workflow;

  const difficultyVariant =
    starter.difficulty === "Beginner"
      ? "text-emerald-800 bg-emerald-500/15 border-emerald-300"
      : starter.difficulty === "Intermediate"
      ? "text-amber-800 bg-amber-500/15 border-amber-300"
      : "text-purple-800 bg-purple-500/15 border-purple-300";

  const hasCredentials = starter.credentialRequirements.length > 0;

  return (
    <div
      onClick={() => onPreview(starter)}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-accent/40"
    >
      <div className="flex flex-col gap-3.5">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-canvas border border-border/80 text-accent-ink group-hover:scale-105 transition-transform">
              <IconComp className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-ink-faint">
                  {starter.number}
                </span>
                <h3 className="text-sm font-bold text-ink line-clamp-1 group-hover:text-accent-ink transition-colors">
                  {starter.shortName}
                </h3>
              </div>
              <span className="text-[11px] font-mono text-ink-faint capitalize">
                {starter.category}
              </span>
            </div>
          </div>

          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyVariant}`}
          >
            {starter.difficulty}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed min-h-[2.5rem]">
          {starter.description}
        </p>

        {/* Pipeline flow pills */}
        <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {starter.flowSequence.map((step, idx) => (
            <span key={step} className="flex items-center gap-1 shrink-0">
              <span className="rounded bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-ink-soft border border-border/60">
                {step}
              </span>
              {idx < starter.flowSequence.length - 1 && (
                <span className="text-[10px] text-ink-faint font-bold">→</span>
              )}
            </span>
          ))}
        </div>

        {/* Credential Setup Indicator Pill */}
        <div className="pt-0.5">
          {hasCredentials ? (
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-800 bg-amber-500/10 border border-amber-300 rounded-md px-2 py-0.5"
              title={`Requires: ${starter.credentialRequirements.map((r) => r.name).join(", ")}`}
            >
              <KeyRound className="h-3 w-3 text-amber-600 shrink-0" />
              <span className="truncate max-w-[220px]">
                Requires: {starter.credentialRequirements.map((r) => r.name).join(", ")}
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 bg-emerald-500/10 border border-emerald-300 rounded-md px-2 py-0.5">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
              <span>No credentials required • Ready to run</span>
            </span>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(starter);
          }}
          className="h-8 text-xs text-ink-faint hover:text-ink gap-1"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onUseTemplate(starter);
          }}
          disabled={cloning}
          className="h-8 text-xs gap-1.5 font-semibold px-3.5"
        >
          {cloning ? (
            <span className="flex items-center gap-1.5">
              <RefreshCw className="h-3 w-3 animate-spin" />
              Cloning...
            </span>
          ) : (
            <>
              <span>Use Template</span>
              <ArrowRight className="h-3 w-3" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
