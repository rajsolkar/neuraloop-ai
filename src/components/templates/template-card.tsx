"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Sparkles,
  FileText,
  Clock,
  Users,
  Globe,
  Cloud,
  Zap,
  Mail,
  TrendingUp,
  LayoutTemplate,
  ArrowRight,
  Eye,
  CheckCircle2,
  Copy,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToastStore } from "@/store/toast-store";

export interface TemplateCardData {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string | null;
  tags?: string[] | null;
  featured?: boolean;
  usageCount?: number;
  isOfficial?: boolean;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Bot,
  Sparkles,
  FileText,
  Clock,
  Users,
  Globe,
  Cloud,
  Zap,
  Mail,
  TrendingUp,
};

export function TemplateCard({
  template,
  onPreview,
}: {
  template: TemplateCardData;
  onPreview?: (id: string) => void;
}) {
  const router = useRouter();
  const toast = useToastStore((s) => s.toast);
  const [cloning, setCloning] = useState(false);

  const IconComp = (template.icon && ICON_MAP[template.icon]) || LayoutTemplate;
  const tags: string[] = Array.isArray(template.tags) ? template.tags : [];

  const handleUseTemplate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setCloning(true);

    try {
      const res = await fetch(`/api/templates/${template.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to clone template");
      }

      toast(`Template "${template.name}" added to workspace!`);
      router.push(`/workflows/${data.workflowId}`);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      toast(errorMsg, { tone: "error" });
      setCloning(false);
    }
  };

  return (
    <div
      onClick={() => onPreview?.(template.id)}
      className="group relative flex flex-col justify-between rounded-xl border border-border bg-surface p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer hover:border-accent/40"
    >
      <div className="flex flex-col gap-3">
        {/* Top Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-canvas border border-border/80 text-accent-ink group-hover:scale-105 transition-transform">
              <IconComp className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink line-clamp-1 group-hover:text-accent-ink transition-colors">
                {template.name}
              </h3>
              <span className="text-[11px] font-mono text-ink-faint capitalize">
                {template.category}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {template.featured && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300 font-semibold">
                Featured
              </Badge>
            )}
            {template.isOfficial && (
              <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-ink border-accent/30">
                Official
              </Badge>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-xs text-ink-soft line-clamp-2 leading-relaxed">
          {template.description}
        </p>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1 pt-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-faint border border-border/60"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
        <span className="text-[11px] text-ink-faint font-mono flex items-center gap-1">
          <Copy className="h-3 w-3" />
          {template.usageCount || 0} uses
        </span>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onPreview?.(template.id);
            }}
            className="h-7 text-xs text-ink-faint hover:text-ink"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />
            Preview
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleUseTemplate}
            disabled={cloning}
            className="h-7 text-xs gap-1 font-semibold"
          >
            {cloning ? (
              <span>Cloning...</span>
            ) : (
              <>
                <span>Use Template</span>
                <ArrowRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
