import { NextResponse } from "next/server";
import { WorkflowGenerationService } from "@/lib/ai/workflow-generator";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { limitAiGeneration, createRateLimitResponse } from "@/lib/security/rate-limit";

export async function POST(request: Request) {
  const { userId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  const rateLimitResult = await limitAiGeneration(request, userId);
  if (!rateLimitResult.success) {
    return createRateLimitResponse(rateLimitResult);
  }

  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const prompt = (body.prompt as string) || "";
    const refinementPrompt = (body.refinementPrompt as string) || "";
    const currentWorkflow = body.currentWorkflow as Record<string, unknown> | undefined;

    // Phase 20.5: Conversational "Ask Nori" Refinement Route
    if (refinementPrompt && currentWorkflow) {
      const refined = WorkflowGenerationService.refineWorkflow(
        currentWorkflow as unknown as import("@/lib/ai/schema").GeneratedWorkflowData,
        refinementPrompt,
      );
      return NextResponse.json(
        {
          message: refined.refinementSummary,
          workflow: refined.workflow,
          modified: refined.modified,
        },
        { status: 200 },
      );
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json(
        { error: "PROMPT_REQUIRED: Please provide a natural language prompt describing the workflow." },
        { status: 400 },
      );
    }

    const forwardHeader = request.headers.get("x-forwarded-for");
    const clientIp = forwardHeader ? forwardHeader.split(",")[0].trim() : "local-client";

    const result = await WorkflowGenerationService.generateWorkflow({
      prompt,
      clientId: clientIp,
      userId,
    });

    return NextResponse.json(
      {
        message: "Workflow graph generated successfully",
        workflow: result.workflow,
        plan: result.plan,
        explanation: result.explanation,
        validation: result.validation,
        optimizations: result.optimizations,
        architectureScore: result.architectureScore,
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
