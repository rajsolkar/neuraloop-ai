import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  presetToCron,
  isValidCronExpression,
  getNextRunDate,
  getNextNRunDates,
  formatCronHumanReadable,
} from "../cron-parser-utils";
import { SchedulerService } from "../scheduler-service";
import { schedulerMetrics } from "../scheduler-metrics";
import { prisma } from "@/lib/prisma";

describe("Phase 12: Scheduler & Production Trigger Infrastructure Test Suite", () => {
  beforeEach(() => {
    schedulerMetrics.resetMetrics();
  });

  describe("1. Cron Parser & Preset Utilities", () => {
    it("should correctly convert presets to valid 5-part cron expressions", () => {
      expect(presetToCron("every_minute")).toBe("* * * * *");
      expect(presetToCron("hourly")).toBe("0 * * * *");
      expect(presetToCron("daily", undefined, "14:30")).toBe("30 14 * * *");
      expect(presetToCron("weekly", undefined, "09:15")).toBe("15 9 * * 0");
      expect(presetToCron("monthly", undefined, "00:00")).toBe("0 0 1 * *");
      expect(presetToCron("cron", "*/15 * * * *")).toBe("*/15 * * * *");
    });

    it("should validate cron expressions accurately", () => {
      expect(isValidCronExpression("* * * * *")).toBe(true);
      expect(isValidCronExpression("0 8 * * *")).toBe(true);
      expect(isValidCronExpression("invalid_cron_str")).toBe(false);
      expect(isValidCronExpression("60 24 32 * *")).toBe(false);
    });

    it("should calculate next run dates correctly in UTC and custom timezones", () => {
      const baseDate = new Date("2026-09-16T12:00:00Z");

      // Next run for "* * * * *" should be 1 minute later
      const nextMin = getNextRunDate("* * * * *", "UTC", baseDate);
      expect(nextMin.toISOString()).toBe("2026-09-16T12:01:00.000Z");

      // Next 3 runs for "0 * * * *"
      const next3Hours = getNextNRunDates("0 * * * *", 3, "UTC", baseDate);
      expect(next3Hours).toHaveLength(3);
      expect(next3Hours[0].toISOString()).toBe("2026-09-16T13:00:00.000Z");
      expect(next3Hours[1].toISOString()).toBe("2026-09-16T14:00:00.000Z");
      expect(next3Hours[2].toISOString()).toBe("2026-09-16T15:00:00.000Z");
    });

    it("should format human-readable descriptions using cronstrue", () => {
      const desc1 = formatCronHumanReadable("0 8 * * *");
      expect(desc1.toLowerCase()).toContain("8:00");

      const desc2 = formatCronHumanReadable("* * * * *");
      expect(desc2.toLowerCase()).toContain("every minute");
    });
  });

  describe("2. Scheduler Metrics", () => {
    it("should track processed, executed, skipped, and failed metrics", () => {
      schedulerMetrics.recordProcessed(5);
      schedulerMetrics.recordExecuted(3);
      schedulerMetrics.recordSkipped(1);
      schedulerMetrics.recordFailed(1);
      schedulerMetrics.recordTick(125);

      const m = schedulerMetrics.getMetrics();
      expect(m.schedulesProcessed).toBe(5);
      expect(m.schedulesExecuted).toBe(3);
      expect(m.skippedSchedules).toBe(1);
      expect(m.failedSchedules).toBe(1);
      expect(m.lastTickDurationMs).toBe(125);
      expect(m.lastTickTimestamp).not.toBeNull();
    });
  });

  describe("3. Scheduler Service & Tick Execution", () => {
    it("should handle empty due schedules safely", async () => {
      const result = await SchedulerService.processDueSchedules();
      expect(result.processed).toBe(0);
      expect(result.executed).toBe(0);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should process due schedules and enqueue executions", async () => {
      const pastDate = new Date("2026-09-16T10:00:00Z");
      const mockSchedules = [
        {
          id: "sched_1",
          workflowId: "wf_1",
          userId: "user_test",
          enabled: true,
          cronExpression: "0 * * * *",
          timezone: "UTC",
          nextRunAt: pastDate,
          lastRunAt: null,
          createdAt: pastDate,
          updatedAt: pastDate,
          workflow: {
            id: "wf_1",
            userId: "user_test",
            status: "published",
            publishedVersionId: "ver_1",
            publishedVersionNumber: 1,
          },
        },
      ];

      const findManySpy = vi.spyOn(prisma.workflowSchedule, "findMany").mockResolvedValueOnce(mockSchedules as never);
      const updateSpy = vi.spyOn(prisma.workflowSchedule, "update").mockResolvedValueOnce({} as never);

      const result = await SchedulerService.processDueSchedules();

      expect(result.processed).toBe(1);
      expect(result.executed).toBe(1);
      expect(updateSpy).toHaveBeenCalledTimes(1);

      findManySpy.mockRestore();
      updateSpy.mockRestore();
    });
  });
});
