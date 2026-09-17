import { NextResponse } from "next/server";
import { WorkflowOptimizer } from "@/lib/ai/workflow-optimizer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { workflow } = body;

    if (!workflow) {
      return NextResponse.json({ error: "workflow object is required" }, { status: 400 });
    }

    const optimization = WorkflowOptimizer.optimizeWorkflow(workflow);

    return NextResponse.json({
      success: true,
      optimization,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
