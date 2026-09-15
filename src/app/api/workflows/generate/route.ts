import { NextResponse } from "next/server";
import { WorkflowGenerationService } from "@/lib/ai/workflow-generator";

export async function POST(request: Request) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const prompt = (body.prompt as string) || "";
    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "PROMPT_REQUIRED: Please provide a natural language prompt describing the workflow." },
        { status: 400 },
      );
    }

    // Extract client IP identifier
    const forwardHeader = request.headers.get("x-forwarded-for");
    const clientIp = forwardHeader ? forwardHeader.split(",")[0].trim() : "local-client";

    const result = await WorkflowGenerationService.generateWorkflow({
      prompt,
      clientId: clientIp,
    });

    return NextResponse.json(
      {
        message: "Workflow graph generated successfully",
        workflow: result.workflow,
        generationId: result.generationId,
        mode: result.mode,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const isRateLimit = errorMsg.includes("RATE_LIMIT_EXCEEDED");
    const status = isRateLimit ? 429 : 500;

    return NextResponse.json({ error: errorMsg }, { status });
  }
}
