import { NextResponse } from "next/server";
import { SchedulerService } from "@/lib/scheduler/scheduler-service";

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET || process.env.SCHEDULER_SECRET;
  // If CRON_SECRET is configured in environment, verify header authorization
  if (cronSecret && cronSecret.trim() !== "") {
    const authHeader = request.headers.get("authorization");
    const secretHeader = request.headers.get("x-cron-secret");

    const providedToken = authHeader ? authHeader.replace("Bearer ", "").trim() : secretHeader?.trim();
    if (!providedToken || providedToken !== cronSecret.trim()) {
      return false;
    }
  }
  return true;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "UNAUTHORIZED: Invalid CRON_SECRET token." }, { status: 401 });
  }

  try {
    const result = await SchedulerService.processDueSchedules();
    return NextResponse.json(
      {
        message: "Scheduler tick executed successfully",
        ...result,
        timestamp: new Date().toISOString(),
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
