import { WorkflowEditor } from "@/components/workflow/workflow-editor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkflowEditorPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="h-full">
      <WorkflowEditor workflowId={id} />
    </div>
  );
}