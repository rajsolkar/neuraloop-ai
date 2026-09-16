import { CronExpressionParser } from "cron-parser";
import cronstrue from "cronstrue";

export type ScheduleFrequencyPreset =
  | "every_minute"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "cron"
  | "custom";

/**
 * Converts a frequency preset + optional time parameter into a standard 5-part Cron expression
 */
export function presetToCron(
  frequency: ScheduleFrequencyPreset | string,
  customCron?: string,
  time = "00:00",
): string {
  if (frequency === "cron" || frequency === "custom") {
    if (customCron && customCron.trim()) {
      return customCron.trim();
    }
    return "0 8 * * *"; // default daily at 8am
  }

  if (frequency === "every_minute") {
    return "* * * * *";
  }

  if (frequency === "hourly") {
    return "0 * * * *";
  }

  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10) || 0;
  const minute = parseInt(minuteStr, 10) || 0;

  if (frequency === "daily") {
    return `${minute} ${hour} * * *`;
  }

  if (frequency === "weekly") {
    return `${minute} ${hour} * * 0`; // Sunday
  }

  if (frequency === "monthly") {
    return `${minute} ${hour} 1 * *`; // 1st of every month
  }

  return customCron && customCron.trim() ? customCron.trim() : "0 8 * * *";
}

/**
 * Validates whether a cron expression is syntactically correct
 */
export function isValidCronExpression(cronExpression: string): boolean {
  try {
    CronExpressionParser.parse(cronExpression.trim());
    return true;
  } catch {
    return false;
  }
}

/**
 * Calculates the next execution Date in UTC for a given cron expression and timezone
 */
export function getNextRunDate(
  cronExpression: string,
  timezone = "UTC",
  fromDate: Date = new Date(),
): Date {
  const cleanCron = cronExpression.trim();
  const options = {
    currentDate: fromDate,
    tz: timezone && timezone.trim() ? timezone.trim() : "UTC",
  };

  try {
    const interval = CronExpressionParser.parse(cleanCron, options);
    return interval.next().toDate();
  } catch {
    // If timezone parsing fails, retry with UTC fallback
    const fallbackInterval = CronExpressionParser.parse(cleanCron, {
      currentDate: fromDate,
      tz: "UTC",
    });
    return fallbackInterval.next().toDate();
  }
}

/**
 * Returns the next N projected execution dates
 */
export function getNextNRunDates(
  cronExpression: string,
  count = 3,
  timezone = "UTC",
  fromDate: Date = new Date(),
): Date[] {
  const cleanCron = cronExpression.trim();
  const options = {
    currentDate: fromDate,
    tz: timezone && timezone.trim() ? timezone.trim() : "UTC",
  };

  const dates: Date[] = [];
  try {
    const interval = CronExpressionParser.parse(cleanCron, options);
    for (let i = 0; i < count; i++) {
      dates.push(interval.next().toDate());
    }
  } catch {
    // Fallback using default interval
    let current = fromDate;
    for (let i = 0; i < count; i++) {
      current = getNextRunDate(cleanCron, "UTC", current);
      dates.push(current);
    }
  }
  return dates;
}

/**
 * Formats a 5-part cron expression into a human-readable English string
 */
export function formatCronHumanReadable(cronExpression: string): string {
  if (!cronExpression || !cronExpression.trim()) {
    return "Invalid schedule";
  }
  try {
    return cronstrue.toString(cronExpression.trim(), { throwExceptionOnParseError: false });
  } catch {
    return "Custom cron schedule";
  }
}
