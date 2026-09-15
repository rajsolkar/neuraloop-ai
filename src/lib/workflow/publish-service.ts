/**
 * Neuraloop Phase 7 & 7.1 — Workflow Publishing, Versioning & Live Control Service
 * Manages publishing, active version selection, version snapshots, secret rotation,
 * draft change detection, and race-safe non-destructive version rollback.
 */

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { makeId } from "@/lib/utils";
import type { Workflow, WorkflowNode, WorkflowEdge, WorkflowVersionRecord } from "@/types/workflow";
import { sanitizeGraph } from "./serialize";
import { validateWorkflowForPublish } from "./publish-validation";
import { WorkflowService } from "./workflow-service";
import { computeVersionDiff } from "./version-diff";

// In-memory fallback version store for non-DB / testing environments
const inMemoryVersionsMap = new Map<string, WorkflowVersionRecord[]>();

export class PublishService {
  static generateSecret(): string {
    return `sk_live_${makeId("sk")}${makeId("secret")}`;
  }

  static async publishWorkflow(
    id: string,
    options: {
      activateImmediately?: boolean;
      nodes?: WorkflowNode[];
      edges?: WorkflowEdge[];
    } = { activateImmediately: true },
  ): Promise<Workflow> {
    let workflow = await WorkflowService.getWorkflow(id);
    if (!workflow) {
      throw new Error(`Workflow with ID ${id} not found.`);
    }

    if (options.nodes && options.nodes.length > 0) {
      workflow = {
        ...workflow,
        nodes: options.nodes,
        edges: options.edges ?? workflow.edges,
      };
      await WorkflowService.updateWorkflow(id, {
        nodes: options.nodes,
        edges: options.edges ?? workflow.edges,
      });
    }

    // 1. Graph Publish Validation
    const validation = validateWorkflowForPublish(workflow);
    if (!validation.valid) {
      throw new Error(`PUBLISH_VALIDATION_FAILED: ${validation.errors.join("; ")}`);
    }

    const clean = sanitizeGraph({ nodes: workflow.nodes, edges: workflow.edges });
    const now = new Date();
    const iso = now.toISOString();

    let secret = workflow.webhookSecret;
    if (!secret) {
      secret = this.generateSecret();
    }

    let nextVersionNumber = 1;
    let versionId = makeId("ver");
    const shouldActivate = options.activateImmediately !== false;

    if (process.env.DATABASE_URL) {
      try {
        const txResult = await prisma.$transaction(async (tx) => {
          // Find the latest version for this workflow
          const latestVer = await tx.workflowVersion.findFirst({
            where: { workflowId: id },
            orderBy: { version: "desc" },
          });

          let verId: string;
          let newVersion: number;

          // If initial draft version 1 was created upon workflow creation and never published, publish v1!
          if (latestVer && !latestVer.publishedAt && latestVer.version === 1) {
            verId = latestVer.id;
            newVersion = 1;

            if (shouldActivate) {
              await tx.workflowVersion.updateMany({
                where: { workflowId: id },
                data: { isActive: false },
              });
            }

            await tx.workflowVersion.update({
              where: { id: verId },
              data: {
                definition: {
                  name: workflow.name,
                  description: workflow.description,
                  status: "published",
                  nodes: clean.nodes,
                  edges: clean.edges,
                } as unknown as Prisma.InputJsonValue,
                publishedAt: now,
                isActive: shouldActivate,
                comment: `Published version v1`,
              },
            });
          } else {
            // Calculate MAX(version) inside transaction lock
            const agg = await tx.workflowVersion.aggregate({
              where: { workflowId: id },
              _max: { version: true },
            });

            const maxVersion = agg._max.version ?? 0;
            newVersion = maxVersion + 1;
            verId = makeId("ver");

            if (shouldActivate) {
              await tx.workflowVersion.updateMany({
                where: { workflowId: id },
                data: { isActive: false },
              });
            }

            await tx.workflowVersion.create({
              data: {
                id: verId,
                workflowId: id,
                version: newVersion,
                definition: {
                  name: workflow.name,
                  description: workflow.description,
                  status: "published",
                  nodes: clean.nodes,
                  edges: clean.edges,
                } as unknown as Prisma.InputJsonValue,
                publishedAt: now,
                isActive: shouldActivate,
                comment: `Published version v${newVersion}`,
              },
            });
          }

          const activeId = shouldActivate ? verId : workflow.activeVersionId || verId;
          const activeNum = shouldActivate ? newVersion : workflow.activeVersionNumber || newVersion;

          await tx.workflow.update({
            where: { id },
            data: {
              status: "published",
              publishedVersionId: verId,
              publishedVersionNumber: newVersion,
              activeVersionId: activeId,
              activeVersionNumber: activeNum,
              webhookSecret: secret,
              publishedAt: now,
              savedAt: now,
            },
          });

          return { newVersion, verId, activeId, activeNum };
        });

        nextVersionNumber = txResult.newVersion;
        versionId = txResult.verId;
      } catch (err: unknown) {
        if (typeof err === "object" && err !== null && "code" in err && (err as { code: string }).code === "P2002") {
          throw new Error("PUBLISH_FAILED: Version collision detected. Please retry publishing.");
        }
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`PUBLISH_FAILED: ${msg}`);
      }
    } else {
      // In-memory version calculation
      const existing = inMemoryVersionsMap.get(id) || [];
      const firstUnpublished = existing.find((v) => v.version === 1 && !v.publishedAt);

      if (firstUnpublished) {
        nextVersionNumber = 1;
        versionId = firstUnpublished.id;
        firstUnpublished.publishedAt = iso;
        firstUnpublished.isActive = shouldActivate;
        firstUnpublished.definition = {
          name: workflow.name,
          description: workflow.description,
          status: "published",
          nodes: clean.nodes,
          edges: clean.edges,
        };
      } else {
        const maxVer = Math.max(...existing.map((v) => v.version), 0);
        nextVersionNumber = maxVer + 1;

        if (shouldActivate) {
          existing.forEach((v) => {
            v.isActive = false;
          });
        }

        const newRecord: WorkflowVersionRecord = {
          id: versionId,
          workflowId: id,
          version: nextVersionNumber,
          definition: {
            name: workflow.name,
            description: workflow.description,
            status: "published",
            nodes: clean.nodes,
            edges: clean.edges,
          },
          publishedAt: iso,
          isActive: shouldActivate,
          comment: `Published version v${nextVersionNumber}`,
          createdAt: iso,
        };

        existing.unshift(newRecord);
      }

      inMemoryVersionsMap.set(id, existing);
    }

    const updated = await WorkflowService.updateWorkflow(id, {
      status: "published",
      nodes: clean.nodes,
      edges: clean.edges,
    });

    const activeNum = shouldActivate ? nextVersionNumber : workflow.activeVersionNumber || nextVersionNumber;

    return {
      ...updated,
      status: "published",
      publishedAt: iso,
      publishedVersionId: versionId,
      publishedVersionNumber: nextVersionNumber,
      activeVersionId: shouldActivate ? versionId : workflow.activeVersionId,
      activeVersionNumber: activeNum,
      webhookSecret: secret,
    };
  }

  static async setActiveVersion(id: string, versionNumber: number): Promise<Workflow> {
    const versions = await this.listVersions(id);
    const targetVer = versions.find((v) => v.version === versionNumber);

    if (!targetVer) {
      throw new Error(`Version v${versionNumber} not found for workflow ${id}.`);
    }

    if (process.env.DATABASE_URL) {
      await prisma.$transaction([
        prisma.workflowVersion.updateMany({
          where: { workflowId: id },
          data: { isActive: false },
        }),
        prisma.workflowVersion.update({
          where: { id: targetVer.id },
          data: { isActive: true },
        }),
        prisma.workflow.update({
          where: { id },
          data: {
            activeVersionId: targetVer.id,
            activeVersionNumber: versionNumber,
            publishedVersionId: targetVer.id,
            publishedVersionNumber: versionNumber,
            status: "published",
          },
        }),
      ]);
    } else {
      const existing = inMemoryVersionsMap.get(id) || [];
      existing.forEach((v) => {
        v.isActive = v.version === versionNumber;
      });
    }

    const wf = await WorkflowService.getWorkflow(id);
    return {
      ...(wf || {}),
      id,
      name: wf?.name || "",
      description: wf?.description || "",
      status: "published",
      createdAt: wf?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      savedAt: wf?.savedAt || null,
      nodes: targetVer.definition.nodes,
      edges: targetVer.definition.edges,
      activeVersionId: targetVer.id,
      activeVersionNumber: versionNumber,
      publishedVersionId: targetVer.id,
      publishedVersionNumber: versionNumber,
    };
  }

  static async rotateWebhookSecret(id: string): Promise<string> {
    const newSecret = this.generateSecret();

    if (process.env.DATABASE_URL) {
      await prisma.workflow.update({
        where: { id },
        data: { webhookSecret: newSecret },
      });
    }

    return newSecret;
  }

  static async listVersions(id: string): Promise<WorkflowVersionRecord[]> {
    if (process.env.DATABASE_URL) {
      const dbVersions = await prisma.workflowVersion.findMany({
        where: { workflowId: id },
        orderBy: { version: "desc" },
      });

      return dbVersions.map((v) => ({
        id: v.id,
        workflowId: v.workflowId,
        version: v.version,
        definition: v.definition as unknown as WorkflowVersionRecord["definition"],
        publishedAt: v.publishedAt ? v.publishedAt.toISOString() : null,
        isActive: v.isActive,
        comment: v.comment,
        createdAt: v.createdAt.toISOString(),
      }));
    }

    // In-memory store fallback
    if (inMemoryVersionsMap.has(id)) {
      return [...(inMemoryVersionsMap.get(id) || [])];
    }

    const wf = await WorkflowService.getWorkflow(id);
    if (!wf) return [];
    const dummy: WorkflowVersionRecord = {
      id: "ver-1",
      workflowId: id,
      version: wf.publishedVersionNumber || 1,
      definition: {
        name: wf.name,
        description: wf.description,
        status: wf.status,
        nodes: wf.nodes,
        edges: wf.edges,
      },
      publishedAt: wf.publishedAt || wf.createdAt,
      isActive: true,
      comment: "Version 1",
      createdAt: wf.createdAt,
    };
    inMemoryVersionsMap.set(id, [dummy]);
    return [dummy];
  }

  static async hasUnpublishedChanges(
    id: string,
    currentNodes: WorkflowNode[],
    currentEdges: WorkflowEdge[],
  ): Promise<boolean> {
    const versions = await this.listVersions(id);
    if (versions.length === 0) return false;

    // Use active or latest published version for comparison
    const activeVer = versions.find((v) => v.isActive) || versions[0];
    if (!activeVer || !activeVer.definition) return false;

    const diff = computeVersionDiff(activeVer.definition, {
      nodes: currentNodes,
      edges: currentEdges,
    });

    return diff.hasChanges;
  }

  static async restoreVersion(id: string, targetVersionNumber: number): Promise<Workflow> {
    const versions = await this.listVersions(id);
    const targetVersion = versions.find((v) => v.version === targetVersionNumber);

    if (!targetVersion) {
      throw new Error(`Version v${targetVersionNumber} not found for workflow ${id}.`);
    }

    const now = new Date();
    const iso = now.toISOString();
    const restoredDefinition = targetVersion.definition;

    let newVersionNumber = 1;
    let newVersionId = makeId("ver");

    if (process.env.DATABASE_URL) {
      try {
        const txResult = await prisma.$transaction(async (tx) => {
          const agg = await tx.workflowVersion.aggregate({
            where: { workflowId: id },
            _max: { version: true },
          });

          const maxVersion = agg._max.version ?? 0;
          const nextVersion = maxVersion + 1;
          const verId = makeId("ver");

          await tx.workflowVersion.updateMany({
            where: { workflowId: id },
            data: { isActive: false },
          });

          await tx.workflowVersion.create({
            data: {
              id: verId,
              workflowId: id,
              version: nextVersion,
              definition: {
                ...restoredDefinition,
                name: `${restoredDefinition.name} (Restored v${targetVersionNumber})`,
              } as unknown as Prisma.InputJsonValue,
              publishedAt: now,
              isActive: true,
              comment: `Restored from version v${targetVersionNumber}`,
            },
          });

          await tx.workflow.update({
            where: { id },
            data: {
              name: restoredDefinition.name,
              description: restoredDefinition.description,
              status: "published",
              publishedVersionId: verId,
              publishedVersionNumber: nextVersion,
              activeVersionId: verId,
              activeVersionNumber: nextVersion,
              publishedAt: now,
              savedAt: now,
            },
          });

          return { nextVersion, verId };
        });

        newVersionNumber = txResult.nextVersion;
        newVersionId = txResult.verId;
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`RESTORE_FAILED: ${msg}`);
      }
    } else {
      const maxVer = Math.max(...versions.map((v) => v.version), 0);
      newVersionNumber = maxVer + 1;

      versions.forEach((v) => {
        v.isActive = false;
      });

      const restoredRecord: WorkflowVersionRecord = {
        id: newVersionId,
        workflowId: id,
        version: newVersionNumber,
        definition: {
          ...restoredDefinition,
          name: `${restoredDefinition.name} (Restored v${targetVersionNumber})`,
        },
        publishedAt: iso,
        isActive: true,
        comment: `Restored from version v${targetVersionNumber}`,
        createdAt: iso,
      };

      versions.unshift(restoredRecord);
      inMemoryVersionsMap.set(id, versions);
    }

    const updated = await WorkflowService.updateWorkflow(id, {
      name: restoredDefinition.name,
      description: restoredDefinition.description,
      status: "published",
      nodes: restoredDefinition.nodes,
      edges: restoredDefinition.edges,
    });

    return {
      ...updated,
      status: "published",
      publishedVersionId: newVersionId,
      publishedVersionNumber: newVersionNumber,
      activeVersionId: newVersionId,
      activeVersionNumber: newVersionNumber,
      publishedAt: iso,
    };
  }
}
