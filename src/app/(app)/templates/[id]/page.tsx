"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Copy,
  Eye,
  LayoutTemplate,
  RefreshCw,
  Sparkles,
  Tag,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToastStore } from "@/store/toast-store";
import { TemplatePreview } from "@/components/templates/template-preview";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";

interface TemplateDetail {
  id: string;
  name: string;
  description: string;
  category: string;
  icon?: string | null;
  tags?: string[] | null;
  featured?: boolean;
  usageCount?: number;
  isOfficial?: boolean;
  createdAt: string;
  definition: {
    name: string;
    description: string;
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  };
}

export default function TemplateDetailPage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(paramsPromise);
  const router = useRouter();
  const toast = useToastStore((s) => s.toast);

  const [template, setTemplate] = useState<TemplateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloning, setCloning] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setErrorMsg(null);
      try {
        const res = await fetch(`/api/templates/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setErrorMsg(data.error?.message || "Failed to load template");
          return;
        }
        setTemplate(data.template);
      } catch (err) {
        setErrorMsg("Network error fetching template details");
      } finally {
        setLoading(false);
      }
    }
    fetchDetail();
  }, [id]);

  const handleUseTemplate = async () => {
    if (!template) return;
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

      toast(`Template "${template.name}" cloned into your workspace!`);
      router.push(`/workflows/${data.workflowId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(msg, { tone: "error" });
      setCloning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-xs text-ink-faint gap-2 h-96">
        <RefreshCw className="h-5 w-5 animate-spin text-accent-ink" />
        Loading template details & graph structure...
      </div>
    );
  }

  if (errorMsg || !template) {
    return (
      <div className="flex-1 p-8 max-w-4xl mx-auto flex flex-col items-center justify-center text-center gap-4">
        <div className="rounded-full bg-error/10 p-4 text-error">
          <LayoutTemplate className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-ink">Template Not Found</h2>
        <p className="text-xs text-ink-soft max-w-sm">{errorMsg || "The requested template could not be located."}</p>
        <Button variant="outline" size="sm" onClick={() => router.push("/templates")}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Templates Marketplace
        </Button>
      </div>
    );
  }

  const nodes = template.definition?.nodes || [];
  const edges = template.definition?.edges || [];
  const tags: string[] = Array.isArray(template.tags) ? template.tags : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-6xl mx-auto w-full flex flex-col gap-6">
      {/* Back Link */}
      <Link
        href="/templates"
        className="inline-flex items-center text-xs font-semibold text-ink-faint hover:text-ink transition-colors gap-1.5"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Template Marketplace
      </Link>

      {/* Detail Header Card */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              {template.name}
            </h1>
            {template.featured && (
              <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-300 font-semibold">
                Featured Blueprint
              </Badge>
            )}
            {template.isOfficial && (
              <Badge variant="outline" className="text-[10px] bg-accent/10 text-accent-ink border-accent/30">
                Official Neuraloop Template
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] font-mono capitalize">
              {template.category}
            </Badge>
          </div>

          <p className="text-xs sm:text-sm text-ink-soft max-w-3xl leading-relaxed">
            {template.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-ink-faint pt-1">
            <span className="flex items-center gap-1 font-mono">
              <Copy className="h-3.5 w-3.5" />
              {template.usageCount || 0} times cloned
            </span>
            <span>•</span>
            <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
          </div>
        </div>

        <Button
          variant="primary"
          onClick={handleUseTemplate}
          disabled={cloning}
          className="h-10 px-5 text-xs font-bold gap-2 shrink-0 shadow-sm"
        >
          {cloning ? (
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Cloning to Workspace...
            </span>
          ) : (
            <>
              <span>Use This Template</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      {/* Tags & Blueprint Metadata */}
      {tags.length > 0 && (
        <div className="flex items-center gap-2">
          <Tag className="h-3.5 w-3.5 text-ink-faint" />
          <div className="flex flex-wrap gap-1.5">
            {tags.map((t) => (
              <Badge key={t} variant="outline" className="text-[11px] font-mono bg-canvas">
                #{t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Graph Visual Preview Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-ink uppercase tracking-wider text-ink-faint flex items-center gap-1.5">
            <Eye className="h-4 w-4 text-accent-ink" />
            Workflow Topology Graph Preview ({nodes.length} nodes, {edges.length} connections)
          </h2>
          <span className="text-[11px] text-ink-faint">
            Read-only preview. Pan & zoom to inspect logic before cloning.
          </span>
        </div>

        <TemplatePreview nodes={nodes} edges={edges} height={450} />
      </div>
    </div>
  );
}
