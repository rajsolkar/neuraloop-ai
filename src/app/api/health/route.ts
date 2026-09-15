import { NextResponse } from "next/server";
import { getQueueHealth } from "@/lib/queue/execution-queue";
import { prisma } from "@/lib/prisma";

export async function GET() {
  let dbReachable = false;
  if (process.env.DATABASE_URL) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbReachable = true;
    } catch {
      dbReachable = false;
    }
  }

  const queueHealth = await getQueueHealth();

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: {
        configured: Boolean(process.env.DATABASE_URL),
        reachable: dbReachable,
      },
      queue: queueHealth,
    },
    { status: 200 },
  );
}
