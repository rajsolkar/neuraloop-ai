import { NextResponse } from "next/server";
import { requireAuthUser } from "@/lib/auth/get-auth-user";
import { AuditLogService } from "@/lib/security/audit-log-service";

export async function GET() {
  const { userId, orgId, errorResponse } = await requireAuthUser();
  if (errorResponse) return errorResponse;

  try {
    const logs = await AuditLogService.listAuditLogs({
      organizationId: orgId,
      userId: orgId ? undefined : userId,
      limit: 100,
    });

    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("GET /api/audit-logs error:", error);
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Failed to fetch audit logs" } },
      { status: 500 },
    );
  }
}
