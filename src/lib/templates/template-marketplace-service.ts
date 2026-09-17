/**
 * Neuraloop Phase 22 — Template Marketplace (Lite) Service
 * Manages marketplace listings (Official vs Community), template cloning, and user favorites.
 */

import { prisma } from "@/lib/prisma";
import { TemplateCloner } from "./template-cloner";
import { TemplateService } from "./template-service";

export interface MarketplaceFilterOptions {
  category?: string;
  search?: string;
  filter?: "all" | "official" | "community" | "favorites";
  userId?: string | null;
  organizationId?: string | null;
  page?: number;
  limit?: number;
}

export class TemplateMarketplaceService {
  /**
   * Lists marketplace templates supporting Official, Community, and Favorites filters.
   */
  static async listMarketplaceTemplates(options: MarketplaceFilterOptions = {}) {
    const { category, search, filter = "all", userId, organizationId, page = 1, limit = 20 } = options;

    if (filter === "favorites" && userId) {
      const favorites = await prisma.templateFavorite.findMany({
        where: { userId },
        select: { templateId: true },
      });
      const favoriteIds = favorites.map((f) => f.templateId);

      const templates = await prisma.workflowTemplate.findMany({
        where: {
          id: { in: favoriteIds },
          ...(category && category !== "all" ? { category: { equals: category, mode: "insensitive" } } : {}),
        },
      });

      return {
        templates: templates.map((t) => ({ ...t, isFavorite: true })),
        total: templates.length,
        page,
        limit,
      };
    }

    const baseList = await TemplateService.listTemplates({
      category,
      search,
      page,
      limit,
      userId,
      organizationId,
    });

    let filtered = baseList.templates;
    if (filter === "official") {
      filtered = filtered.filter((t) => t.isOfficial);
    } else if (filter === "community") {
      filtered = filtered.filter((t) => !t.isOfficial);
    }

    // Attach favorite status if userId provided
    let favSet = new Set<string>();
    if (userId) {
      const favs = await prisma.templateFavorite.findMany({
        where: { userId },
        select: { templateId: true },
      });
      favSet = new Set(favs.map((f) => f.templateId));
    }

    return {
      templates: filtered.map((t) => ({
        ...t,
        isFavorite: favSet.has(t.id),
      })),
      total: filtered.length,
      page: baseList.page,
      limit: baseList.limit,
    };
  }

  /**
   * Toggles a template favorite status for a user.
   */
  static async toggleFavorite(templateId: string, userId: string): Promise<{ isFavorite: boolean }> {
    const existing = await prisma.templateFavorite.findUnique({
      where: {
        templateId_userId: { templateId, userId },
      },
    });

    if (existing) {
      await prisma.templateFavorite.delete({
        where: { id: existing.id },
      });
      return { isFavorite: false };
    } else {
      await prisma.templateFavorite.create({
        data: { templateId, userId },
      });
      return { isFavorite: true };
    }
  }

  /**
   * Clones a template definition to create a new workflow.
   */
  static async cloneTemplate(templateId: string, targetUserId?: string | null) {
    return await TemplateService.cloneTemplate({ templateId, userId: targetUserId || "anon" });
  }
}
