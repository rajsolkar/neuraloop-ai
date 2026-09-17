import { WorkflowCostAnalyticsService } from "@/lib/analytics/workflow-cost-analytics";
import { UsageDashboard } from "@/components/analytics/usage-dashboard";
import { DollarSign, Activity } from "lucide-react";

export const metadata = {
  title: "Cost Analytics & Usage · Neuraloop",
  description: "Financial visibility, AI token usage, and execution spend dashboard.",
};

export default async function AnalyticsPage() {
  const metrics = await WorkflowCostAnalyticsService.getCostMetrics();

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/20 text-accent-ink">
          <DollarSign className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-ink tracking-tight">Cost Analytics & Financial Visibility</h1>
          <p className="text-xs sm:text-sm text-ink-soft">
            Track AI LLM token usage, execution spend, and cost efficiency across all workflows.
          </p>
        </div>
      </div>

      <UsageDashboard metrics={metrics} />
    </div>
  );
}
