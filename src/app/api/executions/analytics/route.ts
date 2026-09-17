import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/auth/get-auth-user";

export async function GET() {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  if (!process.env.DATABASE_URL) {
    return NextResponse.json({
      analytics: {
        totalRuns: 0,
        successRate: 100,
        failedRuns: 0,
        avgRuntimeMs: 0,
        totalAiTokens: 0,
        totalAiCost: 0,
        totalHttpRequests: 0,
      },
    });
  }

  try {
    const whereCondition: Record<string, unknown> = {};
    if (orgId) {
      whereCondition.organizationId = orgId;
    } else if (userId) {
      whereCondition.userId = userId;
    }

    const executions = await prisma.workflowExecution.findMany({
      where: whereCondition,
      select: {
        id: true,
        status: true,
        duration: true,
        aiTokensIn: true,
        aiTokensOut: true,
        aiEstimatedCost: true,
        httpRequestsCount: true,
      },
    });

    const totalRuns = executions.length;
    if (totalRuns === 0) {
      return NextResponse.json({
        analytics: {
          totalRuns: 0,
          successRate: 100,
          failedRuns: 0,
          avgRuntimeMs: 0,
          totalAiTokens: 0,
          totalAiCost: 0,
          totalHttpRequests: 0,
        },
      });
    }

    const successfulRuns = executions.filter((e) => e.status === "success").length;
    const failedRuns = executions.filter((e) => e.status === "failed").length;
    const successRate = Math.round((successfulRuns / totalRuns) * 100);

    const totalDuration = executions.reduce((acc, e) => acc + (e.duration || 0), 0);
    const avgRuntimeMs = Math.round(totalDuration / totalRuns);

    const totalAiTokens = executions.reduce((acc, e) => acc + (e.aiTokensIn || 0) + (e.aiTokensOut || 0), 0);
    const totalAiCost = parseFloat(executions.reduce((acc, e) => acc + (e.aiEstimatedCost || 0), 0).toFixed(4));
    const totalHttpRequests = executions.reduce((acc, e) => acc + (e.httpRequestsCount || 0), 0);

    return NextResponse.json({
      analytics: {
        totalRuns,
        successfulRuns,
        failedRuns,
        successRate,
        avgRuntimeMs,
        totalAiTokens,
        totalAiCost,
        totalHttpRequests,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
