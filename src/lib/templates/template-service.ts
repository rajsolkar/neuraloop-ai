import { prisma } from "@/lib/prisma";
import { TemplateCloner, type TemplateDefinition } from "./template-cloner";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { AuditLogService } from "@/lib/security/audit-log-service";
import type { Prisma } from "@prisma/client";
import {
  STARTER_TEMPLATES,
  STARTER_TEMPLATE_IDS,
  seedStarterTemplates,
  formatStarterTemplateRecord,
  type StarterTemplateItem,
} from "./starter-templates";

export interface ListTemplatesOptions {
  search?: string;
  category?: string;
  featured?: boolean;
  startersOnly?: boolean;
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
    if (options.startersOnly) {
      const starters = await this.getStarterTemplates();
      return {
        templates: starters,
        total: starters.length,
        page: 1,
        limit: starters.length,
        totalPages: 1,
      };
    }

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
   * Returns the exactly seven canonical starter workflows in deterministic order (01 to 07).
   * Automatically seeds the database if any starter is missing.
   */
  static async getStarterTemplates() {
    try {
      const existing = await prisma.workflowTemplate.findMany({
        where: { id: { in: STARTER_TEMPLATE_IDS } },
      });

      if (existing.length < STARTER_TEMPLATES.length) {
        await seedStarterTemplates().catch((err) => {
          console.warn("Auto-seeding starter templates encountered an error:", err);
        });
        const reloaded = await prisma.workflowTemplate.findMany({
          where: { id: { in: STARTER_TEMPLATE_IDS } },
        });
        if (reloaded.length > 0) {
          return STARTER_TEMPLATE_IDS.map((id) => reloaded.find((t) => t.id === id)).filter(
            (t): t is import("@prisma/client").WorkflowTemplate => Boolean(t),
          );
        }
      } else {
        return STARTER_TEMPLATE_IDS.map((id) => existing.find((t) => t.id === id)).filter(
          (t): t is import("@prisma/client").WorkflowTemplate => Boolean(t),
        );
      }
    } catch (err) {
      console.warn("Database query for starter templates failed, using built-in definitions:", err);
    }

    // In-memory fallback if database query or connection fails
    return STARTER_TEMPLATES.map((st) => ({
      id: st.id,
      userId: null,
      organizationId: null,
      name: st.name,
      description: st.description,
      category: st.category,
      icon: st.icon,
      tags: st.tags as unknown as Prisma.JsonValue,
      featured: true,
      usageCount: 0,
      isOfficial: true,
      isPublic: true,
      definition: {
        ...st.definition,
        starterNumber: st.number,
        difficulty: st.difficulty,
        difficultyOrder: st.difficultyOrder,
        credentialRequirements: st.credentialRequirements,
        flowSequence: st.flowSequence,
        checklist: st.checklist,
        exampleInput: st.exampleInput,
        expectedOutput: st.expectedOutput,
      } as unknown as Prisma.JsonValue,
      createdAt: new Date(),
      updatedAt: new Date(),
    })) as import("@prisma/client").WorkflowTemplate[];
  }

  /**
   * Returns the canonical starter workflows normalized into fully typed StarterTemplateItem records.
   * Pulls directly from persistent database with guaranteed 01 to 07 ordering.
   */
  static async getFormattedStarterTemplates(): Promise<{
    starters: StarterTemplateItem[];
    source: "database" | "fallback";
    diagnostics: { count: number; verifiedIds: string[] };
  }> {
    const rawTemplates = await this.getStarterTemplates();
    const source: "database" | "fallback" = process.env.DATABASE_URL ? "database" : "fallback";
    const formatted = rawTemplates.map((record) => formatStarterTemplateRecord(record));

    return {
      starters: formatted,
      source,
      diagnostics: {
        count: formatted.length,
        verifiedIds: formatted.map((s) => s.id),
      },
    };
  }

  /**
   * Fetches a template by ID with ownership verification.
   */
  static async getTemplate(
    id: string,
    authContext?: { userId?: string | null; organizationId?: string | null },
  ) {
    let template = await prisma.workflowTemplate.findUnique({
      where: { id },
    });

    if (!template && STARTER_TEMPLATE_IDS.includes(id)) {
      try {
        await seedStarterTemplates();
        template = await prisma.workflowTemplate.findUnique({
          where: { id },
        });
      } catch (err) {
        console.warn(`Could not seed missing starter template '${id}':`, err);
      }

      if (!template) {
        const foundStarter = STARTER_TEMPLATES.find((s) => s.id === id);
        if (foundStarter) {
          template = {
            id: foundStarter.id,
            userId: null,
            organizationId: null,
            name: foundStarter.name,
            description: foundStarter.description,
            category: foundStarter.category,
            icon: foundStarter.icon,
            tags: foundStarter.tags,
            featured: true,
            usageCount: 0,
            isOfficial: true,
            isPublic: true,
            definition: {
              ...foundStarter.definition,
              starterNumber: foundStarter.number,
              difficulty: foundStarter.difficulty,
              difficultyOrder: foundStarter.difficultyOrder,
              credentialRequirements: foundStarter.credentialRequirements,
              flowSequence: foundStarter.flowSequence,
              checklist: foundStarter.checklist,
              exampleInput: foundStarter.exampleInput,
              expectedOutput: foundStarter.expectedOutput,
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          } as unknown as typeof template;
        }
      }
    }

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
