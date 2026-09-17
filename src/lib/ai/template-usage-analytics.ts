/**
 * Neuraloop Phase 20 — Template Usage & Generation Learning Analytics
 * Tracks generated workflow intents, selected templates, edited graphs, and generation failures
 * to produce telemetry data for future AI model fine-tuning and template ranking.
 */

import { prisma } from "@/lib/prisma";
import { makeId } from "@/lib/utils";

export interface LogGenerationParams {
  userId?: string | null;
  prompt: string;
  templateId?: string;
  templateName?: string;
  mode: "template-adapted" | "template-starting-point" | "openai" | "offline-generator";
  architectureScore: number;
  status: "success" | "failed";
  error?: string;
}

export class TemplateUsageAnalytics {
  static async logGeneration(params: LogGenerationParams): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      await prisma.workflowGeneration.create({
        data: {
          id: `gen-${makeId("g")}`,
          userId: params.userId ?? null,
          prompt: params.prompt,
          status: params.status,
        },
      });
    } catch (err) {
      console.warn("TemplateUsageAnalytics.logGeneration warning:", err);
    }
  }

  static async recordTemplateSelection(templateId: string): Promise<void> {
    if (!process.env.DATABASE_URL) return;

    try {
      await prisma.workflowTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    } catch (err) {
      console.warn("TemplateUsageAnalytics.recordTemplateSelection warning:", err);
    }
  }
}
