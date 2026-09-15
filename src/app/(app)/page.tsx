import { WorkflowsView } from "@/components/workspace/workflow-list-view";

export default function HomePage() {
  return (
    <WorkflowsView
      heading="Welcome back"
      description="Build and automate your workflows."
      limit={6}
    />
  );
}