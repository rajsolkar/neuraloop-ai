import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type AuditAction =
  | "WORKFLOW_CREATED"
  | "WORKFLOW_DELETED"
  | "WORKFLOW_PUBLISHED"
  | "CREDENTIAL_CREATED"
  | "CREDENTIAL_DELETED"
  | "MEMBER_INVITED"
  | "MEMBER_REMOVED";

export interface LogAuditParams {
  organizationId?: string | null;
  userId: string;
  action: AuditAction | string;
  resourceType: "workflow" | "credential" | "member" | "organization";
  resourceId: string;
  metadata?: Record<string, unknown>;
}

export class AuditLogService {
  static async logAction(params: LogAuditParams): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      await prisma.auditLog.create({
        data: {
          organizationId: params.organizationId || null,
          userId: params.userId,
          action: params.action,
          resourceType: params.resourceType,
          resourceId: params.resourceId,
          metadata: (params.metadata as unknown as Prisma.InputJsonValue) || undefined,
        },
      });
    } catch (err) {
      console.warn("[AuditLogService] Failed to record audit log:", err);
    }
  }

  static async listAuditLogs(options: {
    organizationId?: string | null;
    userId?: string | null;
    limit?: number;
  }): Promise<Array<{
    id: string;
    organizationId: string | null;
    userId: string;
    action: string;
    resourceType: string;
    resourceId: string;
    metadata: unknown;
    createdAt: string;
  }>> {
    if (!process.env.DATABASE_URL) return [];

    try {
      const logs = await prisma.auditLog.findMany({
        where: {
          ...(options.organizationId ? { organizationId: options.organizationId } : {}),
          ...(options.userId ? { userId: options.userId } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: options.limit || 50,
      });

      return logs.map((l) => ({
        id: l.id,
        organizationId: l.organizationId,
        userId: l.userId,
        action: l.action,
        resourceType: l.resourceType,
        resourceId: l.resourceId,
        metadata: l.metadata,
        createdAt: l.createdAt.toISOString(),
      }));
    } catch (err) {
      console.warn("[AuditLogService] Failed to fetch audit logs:", err);
      return [];
    }
  }
}
