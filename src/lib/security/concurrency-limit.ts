import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { securityMetrics } from "./security-metrics";

export const MAX_USER_CONCURRENT_EXECUTIONS = 5;

export async function checkExecutionConcurrency(
  userId: string | null | undefined,
  maxConcurrent: number = MAX_USER_CONCURRENT_EXECUTIONS,
): Promise<{ allowed: boolean; activeCount: number; response?: NextResponse }> {
  if (!userId || !process.env.DATABASE_URL) {
    return { allowed: true, activeCount: 0 };
  }

  try {
    const activeCount = await prisma.workflowExecution.count({
      where: {
        userId,
        status: {
          in: ["queued", "running", "QUEUED", "RUNNING"],
        },
      },
    });

    if (activeCount >= maxConcurrent) {
      securityMetrics.recordConcurrencyRejection();
      const response = NextResponse.json(
        {
          error: "CONCURRENCY_LIMIT_EXCEEDED",
          message: `Maximum active concurrent executions (${maxConcurrent}) reached for current user. Please wait for active executions to complete.`,
          activeExecutions: activeCount,
          maxAllowed: maxConcurrent,
        },
        { status: 429 },
      );
      response.headers.set("Retry-After", "5");
      return { allowed: false, activeCount, response };
    }

    return { allowed: true, activeCount };
  } catch (error) {
    console.warn("[ConcurrencyLimit] Database query error, allowing execution:", error);
    return { allowed: true, activeCount: 0 };
  }
}
