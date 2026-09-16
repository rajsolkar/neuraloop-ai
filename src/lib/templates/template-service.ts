import { prisma } from "@/lib/prisma";
import { TemplateCloner, type TemplateDefinition } from "./template-cloner";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { AuditLogService } from "@/lib/security/audit-log-service";
import type { Prisma } from "@prisma/client";

export interface ListTemplatesOptions {
  search?: string;
  category?: string;
  featured?: boolean;
  page?: number;
  limit?: number;
  userId?: string | null;
  organizationId?: string | null;
}

export class TemplateService {
  /**
   * Retrieves a paginated list of templates with optional search, category, and featured filters.
   */
  static async listTemplates(options: ListTemplatesOptions = {}) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const whereClause: Prisma.WorkflowTemplateWhereInput = {
      OR: [
        { isOfficial: true },
        { isPublic: true },
        ...(options.organizationId ? [{ organizationId: options.organizationId }] : []),
        ...(options.userId ? [{ userId: options.userId }] : []),
      ],
    };

    if (options.category && options.category.toLowerCase() !== "all") {
      whereClause.category = { equals: options.category, mode: "insensitive" };
    }

    if (options.featured !== undefined) {
      whereClause.featured = options.featured;
    }

    if (options.search && options.search.trim()) {
      const query = options.search.trim();
      whereClause.AND = [
        {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            { category: { contains: query, mode: "insensitive" } },
          ],
        },
      ];
    }

    const [templates, total] = await Promise.all([
      prisma.workflowTemplate.findMany({
        where: whereClause,
        orderBy: [
          { featured: "desc" },
          { usageCount: "desc" },
          { createdAt: "desc" },
        ],
        skip,
        take: limit,
      }),
      prisma.workflowTemplate.count({ where: whereClause }),
    ]);

    return {
      templates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Fetches a template by ID with ownership verification.
   */
  static async getTemplate(
    id: string,
    authContext?: { userId?: string | null; organizationId?: string | null },
  ) {
    const template = await prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      throw new Error(`Template '${id}' not found.`);
    }

    if (!template.isOfficial && !template.isPublic) {
      const isOwner =
        (authContext?.organizationId && template.organizationId === authContext.organizationId) ||
        (authContext?.userId && template.userId === authContext.userId);

      if (!isOwner) {
        throw new Error("UNAUTHORIZED: Access denied to private template.");
      }
    }

    return template;
  }

  /**
   * Core Marketplace Operation: Clones a template into the user's workspace as a new workflow.
   * Atomically increments template `usageCount` and records audit log.
   */
  static async cloneTemplate(params: {
    templateId: string;
    userId: string;
    organizationId?: string | null;
    customName?: string;
  }) {
    const { templateId, userId, organizationId, customName } = params;

    const template = await this.getTemplate(templateId, { userId, organizationId });
    const rawDef = template.definition as unknown as TemplateDefinition;

    // Use TemplateCloner to duplicate node & edge IDs safely
    const clonedGraph = TemplateCloner.cloneGraph(rawDef, customName || template.name);

    // Increment usage count atomically
    if (process.env.DATABASE_URL) {
      await prisma.workflowTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } },
      }).catch(() => {});
    }

    // Create brand-new user workflow with Version 1 using WorkflowService
    const newWorkflow = await WorkflowService.createWorkflow(
      {
        name: clonedGraph.name,
        description: clonedGraph.description,
        status: "draft",
        nodes: clonedGraph.nodes,
        edges: clonedGraph.edges,
      },
      userId,
      organizationId,
    );

    // Record audit log
    await AuditLogService.logAction({
      userId,
      organizationId,
      action: "TEMPLATE_CLONED",
      resourceType: "workflow",
      resourceId: newWorkflow.id,
      metadata: {
        templateId,
        templateName: template.name,
        workflowId: newWorkflow.id,
      },
    });

    return newWorkflow;
  }

  /**
   * Future-Ready Publishing API: Converts an existing workspace workflow into a published template.
   */
  static async publishTemplate(params: {
    workflowId: string;
    userId: string;
    organizationId?: string | null;
    name: string;
    description: string;
    category?: string;
    icon?: string;
    tags?: string[];
    isPublic?: boolean;
    isOfficial?: boolean;
  }) {
    const { workflowId, userId, organizationId, name, description, category, icon, tags, isPublic = true, isOfficial = false } = params;

    const workflow = await WorkflowService.getWorkflow(workflowId, userId, organizationId);
    if (!workflow) {
      throw new Error(`Workflow '${workflowId}' not found.`);
    }

    const definition: TemplateDefinition = {
      name: name || workflow.name,
      description: description || workflow.description,
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
    };

    const template = await prisma.workflowTemplate.create({
      data: {
        userId,
        organizationId: organizationId ?? null,
        name,
        description,
        category: category || "custom",
        icon: icon || "Sparkles",
        tags: (tags || []) as unknown as Prisma.InputJsonValue,
        isPublic,
        isOfficial,
        definition: definition as unknown as Prisma.InputJsonValue,
      },
    });

    await AuditLogService.logAction({
      userId,
      organizationId,
      action: "TEMPLATE_PUBLISHED",
      resourceType: "workflow",
      resourceId: template.id,
      metadata: {
        templateId: template.id,
        workflowId,
      },
    });

    return template;
  }
}
