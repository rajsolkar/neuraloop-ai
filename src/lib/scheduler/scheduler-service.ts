import { prisma } from "@/lib/prisma";
import type { WorkflowNode } from "@/types/workflow";
import { ExecutionQueue } from "@/lib/queue/execution-queue";
import {
  presetToCron,
  getNextRunDate,
  getNextNRunDates,
  isValidCronExpression,
} from "./cron-parser-utils";
import { schedulerMetrics } from "./scheduler-metrics";

export interface ScheduleStatus {
  id: string;
  workflowId: string;
  userId: string;
  enabled: boolean;
  cronExpression: string;
  timezone: string;
  nextRunAt: string;
  lastRunAt: string | null;
  upcomingRuns: string[];
}

export class SchedulerService {
  /**
   * Synchronizes WorkflowSchedule entity whenever a workflow is published or updated
   */
  static async syncWorkflowSchedule(
    workflowId: string,
    userId: string | null | undefined,
    nodes: WorkflowNode[],
  ): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    const scheduleNode = nodes.find(
      (n) =>
        (n.data && (n.data as { definitionId?: string }).definitionId === "schedule") ||
        (n as unknown as { type?: string }).type === "schedule",
    );

    if (!scheduleNode) {
      // If workflow has no Schedule Trigger node, disable/remove any existing WorkflowSchedule
      try {
        await prisma.workflowSchedule.deleteMany({
          where: { workflowId },
        });
      } catch {
        // Ignore delete error if no record existed
      }
      return;
    }

    const config = (scheduleNode.data.config as Record<string, unknown>) ?? {};
    const frequency = (config.frequency as string) || "daily";
    const customCron = (config.cronExpression as string) || "";
    const time = (config.time as string) || "08:00";
    const timezone = (config.timezone as string) || "UTC";

    const cronExpression = presetToCron(frequency, customCron, time);
    if (!isValidCronExpression(cronExpression)) {
      console.warn(`[SchedulerService] Invalid cron expression '${cronExpression}' for workflow ${workflowId}`);
      return;
    }

    const now = new Date();
    const nextRunAt = getNextRunDate(cronExpression, timezone, now);
    const ownerUserId = userId || "user_system";

    try {
      const existing = await prisma.workflowSchedule.findFirst({
        where: { workflowId },
      });

      if (existing) {
        await prisma.workflowSchedule.update({
          where: { id: existing.id },
          data: {
            userId: ownerUserId,
            enabled: true,
            cronExpression,
            timezone,
            nextRunAt,
            updatedAt: now,
          },
        });
      } else {
        await prisma.workflowSchedule.create({
          data: {
            workflowId,
            userId: ownerUserId,
            enabled: true,
            cronExpression,
            timezone,
            nextRunAt,
          },
        });
      }
    } catch (err) {
      console.error("[SchedulerService] Failed to sync WorkflowSchedule to database:", err);
    }
  }

  /**
   * Scans due WorkflowSchedule records (nextRunAt <= NOW()) and enqueues workflow executions
   */
  static async processDueSchedules(): Promise<{
    processed: number;
    executed: number;
    skipped: number;
    failed: number;
    durationMs: number;
  }> {
    const startTime = Date.now();
    let processedCount = 0;
    let executedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    if (!process.env.DATABASE_URL) {
      const durationMs = Date.now() - startTime;
      schedulerMetrics.recordTick(durationMs);
      return { processed: 0, executed: 0, skipped: 0, failed: 0, durationMs };
    }

    const now = new Date();

    try {
      // Query due schedules where enabled = true and nextRunAt <= NOW()
      const dueSchedules = await prisma.workflowSchedule.findMany({
        where: {
          enabled: true,
          nextRunAt: { lte: now },
        },
        include: {
          workflow: {
            select: {
              id: true,
              userId: true,
              status: true,
              publishedVersionId: true,
              publishedVersionNumber: true,
            },
          },
        },
        take: 50, // Process in batches of up to 50 due schedules per tick
      });

      processedCount = dueSchedules.length;
      schedulerMetrics.recordProcessed(processedCount);

      for (const sched of dueSchedules) {
        try {
          // Check if workflow is actively published
          if (
            !sched.workflow ||
            sched.workflow.status !== "published" ||
            !sched.workflow.publishedVersionId
          ) {
            // Disable or skip un-published workflow schedule
            skippedCount++;
            schedulerMetrics.recordSkipped(1);

            // Compute next run to avoid tight loop polling on disabled workflow
            const nextRun = getNextRunDate(sched.cronExpression, sched.timezone, now);
            await prisma.workflowSchedule.update({
              where: { id: sched.id },
              data: { nextRunAt: nextRun },
            });
            continue;
          }

          const versionId = sched.workflow.publishedVersionId;
          const ownerUserId = sched.userId || sched.workflow.userId || "user_system";
          const deduplicationId = `sched-${sched.id}-${sched.nextRunAt.getTime()}`;

          // Enqueue scheduled execution into BullMQ / ExecutionQueue with deduplication metadata
          await ExecutionQueue.enqueueExecution({
            workflowId: sched.workflowId,
            workflowVersionId: versionId,
            userId: ownerUserId,
            source: "schedule",
            input: {
              trigger: "schedule",
              cronExpression: sched.cronExpression,
              timezone: sched.timezone,
              scheduledFor: sched.nextRunAt.toISOString(),
              executedAt: now.toISOString(),
            },
            triggerMetadata: {
              scheduleId: sched.id,
              cronExpression: sched.cronExpression,
              timezone: sched.timezone,
              deduplicationId,
            },
          });

          // Calculate next run date
          const nextRunAt = getNextRunDate(sched.cronExpression, sched.timezone, now);

          // Atomic state update: lastRunAt = now, nextRunAt = newNextRunAt
          await prisma.workflowSchedule.update({
            where: { id: sched.id },
            data: {
              lastRunAt: now,
              nextRunAt,
            },
          });

          executedCount++;
          schedulerMetrics.recordExecuted(1);
        } catch (err) {
          console.error(`[SchedulerService] Error processing schedule ${sched.id}:`, err);
          failedCount++;
          schedulerMetrics.recordFailed(1);
        }
      }
    } catch (err) {
      console.error("[SchedulerService] Database query error in processDueSchedules:", err);
    }

    const durationMs = Date.now() - startTime;
    schedulerMetrics.recordTick(durationMs);

    return {
      processed: processedCount,
      executed: executedCount,
      skipped: skippedCount,
      failed: failedCount,
      durationMs,
    };
  }

  /**
   * Fetches schedule status & projected next 3 execution dates for a given workflow
   */
  static async getScheduleStatus(workflowId: string): Promise<ScheduleStatus | null> {
    if (!process.env.DATABASE_URL) return null;

    try {
      const sched = await prisma.workflowSchedule.findFirst({
        where: { workflowId },
      });

      if (!sched) return null;

      const upcomingDates = getNextNRunDates(
        sched.cronExpression,
        3,
        sched.timezone,
        sched.nextRunAt,
      );

      return {
        id: sched.id,
        workflowId: sched.workflowId,
        userId: sched.userId,
        enabled: sched.enabled,
        cronExpression: sched.cronExpression,
        timezone: sched.timezone,
        nextRunAt: sched.nextRunAt.toISOString(),
        lastRunAt: sched.lastRunAt ? sched.lastRunAt.toISOString() : null,
        upcomingRuns: upcomingDates.map((d) => d.toISOString()),
      };
    } catch (err) {
      console.error("[SchedulerService] Failed to fetch schedule status:", err);
      return null;
    }
  }
}
