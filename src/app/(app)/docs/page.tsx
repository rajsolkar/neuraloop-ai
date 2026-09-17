import { NoriHelpCenter } from "@/components/docs/nori-help-center";
import { BookOpen } from "lucide-react";

export const metadata = {
  title: "Documentation & Guides · Neuraloop",
  description: "Learn how to build, test, and deploy AI workflows with Neuraloop.",
};

export default function DocsPage() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-ink">
          <BookOpen className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">In-App Documentation Center</h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Explore guides on node definitions, handlebars expressions, OAuth connections, and Nori AI.
          </p>
        </div>
      </div>

      <NoriHelpCenter />
    </div>
  );
}
