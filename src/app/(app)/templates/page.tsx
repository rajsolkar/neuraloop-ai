"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  LayoutTemplate,
  Bot,
  Clock,
  Globe,
  Zap,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TemplateCard, type TemplateCardData } from "@/components/templates/template-card";

const CATEGORIES = [
  "All",
  "AI",
  "Productivity",
  "Operations",
  "Sales",
  "Marketing",
  "Personal",
];

export default function TemplatesPage() {
  const router = useRouter();

  const [templates, setTemplates] = useState<TemplateCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/templates?limit=100");
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory =
        activeCategory === "All" ||
        tpl.category.toLowerCase() === activeCategory.toLowerCase();

      const query = search.trim().toLowerCase();
      const matchesSearch =
        !query ||
        tpl.name.toLowerCase().includes(query) ||
        tpl.description.toLowerCase().includes(query) ||
        (Array.isArray(tpl.tags) && tpl.tags.some((t) => t.toLowerCase().includes(query)));

      return matchesCategory && matchesSearch;
    });
  }, [templates, activeCategory, search]);

  const featuredTemplates = useMemo(() => {
    return templates.filter((t) => t.featured);
  }, [templates]);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
      {/* Header Banner */}
      <div className="rounded-2xl border border-border bg-gradient-to-r from-accent/10 via-surface to-canvas p-6 sm:p-8 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-ink">
            <LayoutTemplate className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">
              Template Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft">
              Production-ready workflow blueprints. Clone with one click and start automating immediately.
            </p>
          </div>
        </div>

        {/* Search & Category Filter */}
        <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-ink-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates, tags, or tools..."
              className="pl-9 h-9 text-xs bg-surface"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
            {CATEGORIES.map((cat) => (
              <Button
                key={cat}
                variant={activeCategory === cat ? "primary" : "ghost"}
                size="sm"
                onClick={() => setActiveCategory(cat)}
                className="h-8 text-xs font-medium rounded-lg shrink-0"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 w-full items-center justify-center text-xs text-ink-faint gap-2">
          <RefreshCw className="h-4 w-4 animate-spin text-accent-ink" />
          Loading workflow blueprints...
        </div>
      ) : (
        <>
          {/* Featured Blueprints Section */}
          {activeCategory === "All" && !search && featuredTemplates.length > 0 && (
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-500 fill-amber-500" />
                <h2 className="text-sm font-bold text-ink uppercase tracking-wider text-ink-soft">
                  Featured Automations
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {featuredTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onPreview={(id) => router.push(`/templates/${id}`)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Main Templates Grid */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink uppercase tracking-wider text-ink-soft flex items-center gap-2">
                <Filter className="h-4 w-4 text-ink-faint" />
                {activeCategory} Blueprints ({filteredTemplates.length})
              </h2>
            </div>

            {filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-border rounded-xl bg-surface">
                <LayoutTemplate className="h-10 w-10 text-ink-faint mb-2" />
                <h3 className="text-sm font-bold text-ink">No templates found</h3>
                <p className="text-xs text-ink-faint mt-1 max-w-sm">
                  Try adjusting your search query or selecting another category filter.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates.map((tpl) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    onPreview={(id) => router.push(`/templates/${id}`)}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}