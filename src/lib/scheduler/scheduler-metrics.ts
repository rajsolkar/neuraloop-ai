export interface SchedulerMetrics {
  schedulesProcessed: number;
  schedulesExecuted: number;
  failedSchedules: number;
  skippedSchedules: number;
  lastTickTimestamp: string | null;
  lastTickDurationMs: number | null;
}

class SchedulerMetricsTracker {
  private schedulesProcessed = 0;
  private schedulesExecuted = 0;
  private failedSchedules = 0;
  private skippedSchedules = 0;
  private lastTickTimestamp: string | null = null;
  private lastTickDurationMs: number | null = null;

  recordTick(durationMs: number): void {
    this.lastTickTimestamp = new Date().toISOString();
    this.lastTickDurationMs = durationMs;
  }

  recordProcessed(count = 1): void {
    this.schedulesProcessed += count;
  }

  recordExecuted(count = 1): void {
    this.schedulesExecuted += count;
  }

  recordFailed(count = 1): void {
    this.failedSchedules += count;
  }

  recordSkipped(count = 1): void {
    this.skippedSchedules += count;
  }

  getMetrics(): SchedulerMetrics {
    return {
      schedulesProcessed: this.schedulesProcessed,
      schedulesExecuted: this.schedulesExecuted,
      failedSchedules: this.failedSchedules,
      skippedSchedules: this.skippedSchedules,
      lastTickTimestamp: this.lastTickTimestamp,
      lastTickDurationMs: this.lastTickDurationMs,
    };
  }

  resetMetrics(): void {
    this.schedulesProcessed = 0;
    this.schedulesExecuted = 0;
    this.failedSchedules = 0;
    this.skippedSchedules = 0;
    this.lastTickTimestamp = null;
    this.lastTickDurationMs = null;
  }
}

export const schedulerMetrics = new SchedulerMetricsTracker();
