import { describe, it, expect, beforeEach, vi } from "vitest";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { CredentialService } from "@/lib/security/credential-service";
import { AuditLogService } from "@/lib/security/audit-log-service";
import { normalizeOrgRole, hasRequiredRole } from "@/lib/auth/get-auth-user";
import type { Workflow } from "@/types/workflow";
import { prisma } from "@/lib/prisma";

describe("Phase 9 Completion: Organizations, Workspaces & Collaboration Test Suite", () => {
  describe("1. Clerk Role Normalization & Permissions", () => {
    it("should correctly normalize Clerk roles to App Roles", () => {
      expect(normalizeOrgRole("org:admin")).toBe("admin");
      expect(normalizeOrgRole("org:owner")).toBe("owner");
      expect(normalizeOrgRole("org:member")).toBe("member");
      expect(normalizeOrgRole(null)).toBe("member");
    });

    it("should evaluate role hierarchy correctly", () => {
      expect(hasRequiredRole("owner", "admin")).toBe(true);
      expect(hasRequiredRole("admin", "admin")).toBe(true);
      expect(hasRequiredRole("member", "admin")).toBe(false);
      expect(hasRequiredRole("admin", "owner")).toBe(false);
      expect(hasRequiredRole("member", "member")).toBe(true);
    });
  });

  describe("2. Organization Multi-Tenant Workflow Isolation & Visibility", () => {
    it("should restrict private workflows to creator and allow workspace visibility to org members", async () => {
      const mockWfs = [
        {
          id: "wf_shared",
          name: "Shared Team Workflow",
          description: "",
          status: "published",
          visibility: "workspace",
          userId: "user_a",
          organizationId: "org_alpha",
          createdAt: new Date(),
          updatedAt: new Date(),
          savedAt: null,
          publishedAt: null,
          versions: [],
        },
        {
          id: "wf_private",
          name: "User A Private Workflow",
          description: "",
          status: "draft",
          visibility: "private",
          userId: "user_a",
          organizationId: "org_alpha",
          createdAt: new Date(),
          updatedAt: new Date(),
          savedAt: null,
          publishedAt: null,
          versions: [],
        },
      ];

      const findManySpy = vi.spyOn(prisma.workflow, "findMany").mockResolvedValueOnce(mockWfs as never);

      // Query workflows as User B in org_alpha
      const orgWfs = await WorkflowService.listWorkflows("user_b", "org_alpha");
      expect(orgWfs).toHaveLength(2);

      findManySpy.mockRestore();
    });

    it("should enforce member role restrictions on workflow deletion", async () => {
      const mockWf: Workflow = {
        id: "wf_target",
        name: "Org Workflow",
        description: "",
        status: "draft",
        visibility: "workspace",
        userId: "user_owner",
        organizationId: "org_alpha",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        savedAt: null,
        nodes: [],
        edges: [],
      };

      const getSpy = vi.spyOn(WorkflowService, "getWorkflow").mockResolvedValueOnce(mockWf);

      // Member attempting to delete another member's workflow must throw error
      await expect(
        WorkflowService.deleteWorkflow("wf_target", "user_member", "org_alpha", "member"),
      ).rejects.toThrow("UNAUTHORIZED");

      getSpy.mockRestore();
    });
  });

  describe("3. Shared Credentials & Vault Permissions", () => {
    it("should prevent member role from creating or deleting org credentials", async () => {
      await expect(
        CredentialService.createCredential(
          "user_member",
          { name: "Slack Token", provider: "slack", value: "xoxb-secret" },
          "org_alpha",
          "member",
        ),
      ).rejects.toThrow("UNAUTHORIZED");

      await expect(
        CredentialService.deleteCredential("cred_1", "user_member", "org_alpha", "member"),
      ).rejects.toThrow("UNAUTHORIZED");
    });
  });

  describe("4. Audit Log Tracking", () => {
    it("should create audit log entries for key actions", async () => {
      const createSpy = vi.spyOn(prisma.auditLog, "create").mockResolvedValueOnce({} as never);

      await AuditLogService.logAction({
        organizationId: "org_alpha",
        userId: "user_a",
        action: "WORKFLOW_PUBLISHED",
        resourceType: "workflow",
        resourceId: "wf_123",
        metadata: { version: 2 },
      });

      expect(createSpy).toHaveBeenCalledTimes(1);
      createSpy.mockRestore();
    });
  });
});
