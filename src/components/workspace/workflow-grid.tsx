import type { Workflow } from "@/types/workflow";
import { WorkflowCard } from "@/components/workspace/workflow-card";

export function WorkflowGrid({ workflows }: { workflows: Workflow[] }) {
  if (workflows.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {workflows.map((workflow) => (
        <WorkflowCard key={workflow.id} workflow={workflow} />
      ))}
    </div>
  );
}