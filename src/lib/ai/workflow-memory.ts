/**
 * Neuraloop Phase 21 — Workflow Memory Layer
 * Scoped persistence engine for workflow-level key/value records and Nori conversation logs.
 */

import { prisma } from "@/lib/prisma";

export class WorkflowMemoryService {
  /**
   * Retrieves a memory value for a workflow by key.
   */
  static async getMemory(workflowId: string, key: string): Promise<unknown | null> {
    try {
      const record = await prisma.workflowMemory.findFirst({
        where: { workflowId, key },
        orderBy: { createdAt: "desc" },
      });
      return record ? record.value : null;
    } catch {
      return null;
    }
  }

  /**
   * Sets or creates a memory value for a workflow.
   */
  static async setMemory(workflowId: string, key: string, value: unknown): Promise<boolean> {
    try {
      await prisma.workflowMemory.create({
        data: {
          workflowId,
          key,
          value: value as any,
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Appends a message to the workflow's Nori conversation log.
   */
  static async appendConversationMessage(
    workflowId: string,
    message: { sender: "user" | "nori"; text: string; timestamp?: string },
  ): Promise<boolean> {
    try {
      const existing = (await this.getMemory(workflowId, "nori_conversation")) as Array<any> | null;
      const history = Array.isArray(existing) ? existing : [];
      history.push({
        ...message,
        timestamp: message.timestamp || new Date().toISOString(),
      });
      return await this.setMemory(workflowId, "nori_conversation", history);
    } catch {
      return false;
    }
  }

  /**
   * Clears memory records for a workflow.
   */
  static async clearMemory(workflowId: string, key?: string): Promise<boolean> {
    try {
      await prisma.workflowMemory.deleteMany({
        where: {
          workflowId,
          ...(key ? { key } : {}),
        },
      });
      return true;
    } catch {
      return false;
    }
  }
}
