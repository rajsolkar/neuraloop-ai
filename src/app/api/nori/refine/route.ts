import { NextResponse } from "next/server";
import { WorkflowRefiner } from "@/lib/ai/workflow-refiner";
import type { GeneratedWorkflowData } from "@/lib/ai/schema";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workflow, prompt } = body;

    if (!workflow || !prompt) {
      return NextResponse.json({ error: "workflow object and prompt string are required" }, { status: 400 });
    }

    const result = WorkflowRefiner.refineWorkflow(workflow as GeneratedWorkflowData, prompt);

    return NextResponse.json({
      success: true,
      modified: result.modified,
      refinementSummary: result.refinementSummary,
      workflow: result.workflow,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
