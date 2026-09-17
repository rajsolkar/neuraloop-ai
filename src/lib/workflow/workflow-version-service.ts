/**
 * Neuraloop Phase 22 — Workflow Versioning & Lifecycle Service
 * Manages workflow snapshot creation, version restoration, history listing, and graph diff comparison.
 */

import { prisma } from "@/lib/prisma";
import { computeVersionDiff, type VersionDiffSummary } from "./version-diff";
import type { GeneratedWorkflowData } from "@/lib/ai/schema";

export interface WorkflowVersionItem {
  id: string;
  workflowId: string;
  version: number;
  definition: GeneratedWorkflowData;
  comment: string | null;
  isActive: boolean;
  publishedAt: Date | null;
  createdAt: Date;
}

export class WorkflowVersionService {
  /**
   * Creates a new snapshot version for a workflow.
   */
  static async createVersion(
    workflowId: string,
    definition: GeneratedWorkflowData,
    comment?: string,
    setAsActive = false,
  ): Promise<WorkflowVersionItem> {
    const existing = await prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: "desc" },
      take: 1,
    });

    const nextVersionNumber = (existing[0]?.version || 0) + 1;

    if (setAsActive) {
      await prisma.workflowVersion.updateMany({
        where: { workflowId, isActive: true },
        data: { isActive: false },
      });
    }

    const created = await prisma.workflowVersion.create({
      data: {
        id: `ver-${workflowId}-${nextVersionNumber}`,
        workflowId,
        version: nextVersionNumber,
        definition: definition as any,
        comment: comment || `Version ${nextVersionNumber} snapshot`,
        isActive: setAsActive,
        publishedAt: setAsActive ? new Date() : null,
      },
    });

    if (setAsActive) {
      await prisma.workflow.update({
        where: { id: workflowId },
        data: {
          activeVersionId: created.id,
          activeVersionNumber: nextVersionNumber,
          status: "published",
        },
      });
    }

    return {
      id: created.id,
      workflowId: created.workflowId,
      version: created.version,
      definition: created.definition as unknown as GeneratedWorkflowData,
      comment: created.comment,
      isActive: created.isActive,
      publishedAt: created.publishedAt,
      createdAt: created.createdAt,
    };
  }

  /**
   * Lists all versions for a workflow.
   */
  static async listVersions(workflowId: string): Promise<WorkflowVersionItem[]> {
    const records = await prisma.workflowVersion.findMany({
      where: { workflowId },
      orderBy: { version: "desc" },
    });

    return records.map((r) => ({
      id: r.id,
      workflowId: r.workflowId,
      version: r.version,
      definition: r.definition as unknown as GeneratedWorkflowData,
      comment: r.comment,
      isActive: r.isActive,
      publishedAt: r.publishedAt,
      createdAt: r.createdAt,
    }));
  }

  /**
   * Restores a workflow to a target version ID.
   */
  static async restoreVersion(workflowId: string, versionId: string): Promise<WorkflowVersionItem> {
    const targetVer = await prisma.workflowVersion.findUnique({
      where: { id: versionId },
    });

    if (!targetVer || targetVer.workflowId !== workflowId) {
      throw new Error("Target version record not found");
    }

    await prisma.workflowVersion.updateMany({
      where: { workflowId, isActive: true },
      data: { isActive: false },
    });

    const updatedVer = await prisma.workflowVersion.update({
      where: { id: versionId },
      data: { isActive: true },
    });

    await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        activeVersionId: updatedVer.id,
        activeVersionNumber: updatedVer.version,
        publishedVersionId: updatedVer.id,
        publishedVersionNumber: updatedVer.version,
        status: "published",
      },
    });

    return {
      id: updatedVer.id,
      workflowId: updatedVer.workflowId,
      version: updatedVer.version,
      definition: updatedVer.definition as unknown as GeneratedWorkflowData,
      comment: updatedVer.comment,
      isActive: updatedVer.isActive,
      publishedAt: updatedVer.publishedAt,
      createdAt: updatedVer.createdAt,
    };
  }

  /**
   * Compares two workflow definitions and returns diff output.
   */
  static compareVersions(v1Def: GeneratedWorkflowData, v2Def: GeneratedWorkflowData): VersionDiffSummary {
    return computeVersionDiff(v1Def as any, v2Def as any);
  }

  /**
   * Updates workflow status (draft, published, paused, archived).
   */
  static async updateStatus(workflowId: string, status: "draft" | "published" | "paused" | "archived"): Promise<boolean> {
    try {
      await prisma.workflow.update({
        where: { id: workflowId },
        data: { status },
      });
      return true;
    } catch {
      return false;
    }
  }
}
