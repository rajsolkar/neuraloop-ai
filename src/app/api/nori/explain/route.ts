import { NextResponse } from "next/server";
import { WorkflowExplainer } from "@/lib/ai/workflow-explainer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workflow } = body;

    if (!workflow) {
      return NextResponse.json({ error: "workflow object is required" }, { status: 400 });
    }

    const explanation = WorkflowExplainer.explainWorkflow(workflow);

    return NextResponse.json({
      success: true,
      explanation,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
