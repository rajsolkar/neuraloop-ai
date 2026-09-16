import { NextResponse } from "next/server";
import { schedulerMetrics } from "@/lib/scheduler/scheduler-metrics";

export async function GET() {
  try {
    const metrics = schedulerMetrics.getMetrics();
    return NextResponse.json(
      {
        status: "healthy",
        metrics,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: "unhealthy", error: errorMsg },
      { status: 500 },
    );
  }
}
