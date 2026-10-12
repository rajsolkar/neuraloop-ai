import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  STARTER_TEMPLATES,
  STARTER_TEMPLATE_IDS,
  LEGACY_STARTER_IDS,
  validateAllStarterTemplates,
  seedStarterTemplates,
  formatStarterTemplateRecord,
} from "../starter-templates";
import { TemplateCloner } from "../template-cloner";
import { TemplateService } from "../template-service";
import { prisma } from "@/lib/prisma";
import { validateUrlForSsrf } from "@/lib/execution/ssrf";
import { IfExecutor } from "@/lib/execution/executors/if";
import { validateNodeConfig } from "@/lib/workflow/config-schemas";
import type { WorkflowNode, WorkflowEdge } from "@/types/workflow";
import type { ExecutionContext } from "@/lib/execution/types";
import { GET as getStartersRoute } from "@/app/api/templates/starters/route";

const EXPECTED_STARTER_IDS = [
  "starter-01-api-quickstart",
  "starter-02-ai-content-generator",
  "starter-03-ai-telegram-assistant",
  "starter-04-email-alert",
  "starter-05-google-sheets-logger",
  "starter-06-api-to-sheets-pipeline",
  "starter-07-smart-ai-alert-router",
] as const;

describe("Neuraloop Starter Workflow Gallery Suite", () => {
  // ==========================================================================
  // Section 7 — Item 1: Exact 7 Deterministic IDs in 01–07 Order
  // ==========================================================================
  describe("1. Exact 7 Deterministic IDs in 01–07 Order (Item 1)", () => {
    it("should have exactly seven starter templates with deterministic IDs matching the prompt specification", () => {
      expect(STARTER_TEMPLATES).toHaveLength(7);
      expect(STARTER_TEMPLATE_IDS).toHaveLength(7);
      expect(STARTER_TEMPLATE_IDS).toEqual(EXPECTED_STARTER_IDS);

      const templateIds = STARTER_TEMPLATES.map((t) => t.id);
      expect(templateIds).toEqual(EXPECTED_STARTER_IDS);
    });

    it("should number templates strictly from '01' to '07'", () => {
      const numbers = STARTER_TEMPLATES.map((t) => t.number);
      expect(numbers).toEqual(["01", "02", "03", "04", "05", "06", "07"]);
    });

    it("should be strictly ordered by difficulty from Beginner to Advanced", () => {
      const difficulties = STARTER_TEMPLATES.map((t) => t.difficulty);
      expect(difficulties).toEqual([
        "Beginner", // 01 — API Quickstart
        "Beginner", // 02 — AI Content Generator
        "Intermediate", // 03 — AI-to-Telegram Assistant
        "Intermediate", // 04 — Automated Email Alert
        "Intermediate", // 05 — Google Sheets Logger
        "Advanced", // 06 — API-to-Sheets Pipeline
        "Advanced", // 07 — Smart AI Alert Router
      ]);

      const orders = STARTER_TEMPLATES.map((t) => t.difficultyOrder);
      expect(orders).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("should verify Starter 01: API Quickstart graph and public endpoint", () => {
      const s1 = STARTER_TEMPLATES[0];
      expect(s1.id).toBe("starter-01-api-quickstart");
      expect(s1.credentialRequirements).toHaveLength(0);
      expect(s1.flowSequence).toEqual(["Manual Trigger", "HTTP Request"]);

      const nodes = s1.definition.nodes;
      expect(nodes).toHaveLength(2);
      expect(nodes[0].data.definitionId).toBe("manual-trigger");
      expect(nodes[1].data.definitionId).toBe("http-request");

      const httpConfig = nodes[1].data.config as Record<string, unknown>;
      expect(httpConfig.method).toBe("GET");
      expect(httpConfig.url).toBe("https://dummyjson.com/quotes/random");
      expect(httpConfig.authType).toBe("none");
      expect(httpConfig.credentialId).toBe("");
    });

    it("should verify Starter 02: AI Content Generator configuration", () => {
      const s2 = STARTER_TEMPLATES[1];
      expect(s2.id).toBe("starter-02-ai-content-generator");
      expect(s2.credentialRequirements).toHaveLength(1);
      expect(s2.credentialRequirements[0].provider).toBe("openai");

      const nodes = s2.definition.nodes;
      expect(nodes).toHaveLength(2);
      expect(nodes[0].data.definitionId).toBe("manual-trigger");
      expect(nodes[1].data.definitionId).toBe("ai");

      const aiConfig = nodes[1].data.config as Record<string, unknown>;
      expect(aiConfig.credentialId).toBe("");
      expect(aiConfig.model).toBe("gpt-4o-mini");
      expect(String(aiConfig.prompt)).toContain("{{input.productDescription}}");
    });

    it("should verify Starter 03: AI-to-Telegram Assistant flow and expression resolution", () => {
      const s3 = STARTER_TEMPLATES[2];
      expect(s3.id).toBe("starter-03-ai-telegram-assistant");
      expect(s3.credentialRequirements).toHaveLength(2);
      expect(s3.flowSequence).toEqual(["Manual Trigger", "AI Agent", "Telegram"]);

      const nodes = s3.definition.nodes;
      expect(nodes).toHaveLength(3);
      expect(nodes[0].data.definitionId).toBe("manual-trigger");
      expect(nodes[1].data.definitionId).toBe("ai");
      expect(nodes[2].data.definitionId).toBe("telegram");

      const telegramConfig = nodes[2].data.config as Record<string, unknown>;
      expect(String(telegramConfig.text)).toContain("{{steps.node-ai-1.text}}");
    });

    it("should verify Starter 04: Automated Email Alert configuration", () => {
      const s4 = STARTER_TEMPLATES[3];
      expect(s4.id).toBe("starter-04-email-alert");
      expect(s4.credentialRequirements[0].provider).toBe("smtp");

      const nodes = s4.definition.nodes;
      expect(nodes).toHaveLength(2);
      expect(nodes[1].data.definitionId).toBe("email");

      const emailConfig = nodes[1].data.config as Record<string, unknown>;
      expect(emailConfig.credentialId).toBe("");
      expect(emailConfig.to).toBe("alerts@example.com");
      expect(String(emailConfig.subject)).toContain("{{input.alertType}}");
    });

    it("should verify Starter 05: Google Sheets Logger append_row operation", () => {
      const s5 = STARTER_TEMPLATES[4];
      expect(s5.id).toBe("starter-05-google-sheets-logger");
      expect(s5.credentialRequirements[0].provider).toBe("google-sheets-service-account");

      const nodes = s5.definition.nodes;
      expect(nodes).toHaveLength(2);
      expect(nodes[1].data.definitionId).toBe("google-sheets");

      const sheetsConfig = nodes[1].data.config as Record<string, unknown>;
      expect(sheetsConfig.operation).toBe("append_row");
      expect(sheetsConfig.credentialId).toBe("");
      expect(String(sheetsConfig.rowValues)).toContain("{{timestamp}}");
    });

    it("should verify Starter 06: API-to-Sheets Pipeline topology and transform config", () => {
      const s6 = STARTER_TEMPLATES[5];
      expect(s6.id).toBe("starter-06-api-to-sheets-pipeline");
      expect(s6.flowSequence).toEqual(["Manual Trigger", "HTTP Request", "Transform", "Google Sheets"]);

      const nodes = s6.definition.nodes;
      expect(nodes).toHaveLength(4);
      expect(nodes[0].data.definitionId).toBe("manual-trigger");
      expect(nodes[1].data.definitionId).toBe("http-request");
      expect(nodes[2].data.definitionId).toBe("transform");
      expect(nodes[3].data.definitionId).toBe("google-sheets");

      const transformConfig = nodes[2].data.config as Record<string, unknown>;
      expect(transformConfig.operation).toBe("add_field");
      expect(transformConfig.key).toBe("formattedRow");

      const sheetsConfig = nodes[3].data.config as Record<string, unknown>;
      expect(sheetsConfig.operation).toBe("append_row");
      expect(sheetsConfig.rowValues).toBe("{{steps.node-transform-1.formattedRow}}");
    });

    it("should verify Starter 07: Smart AI Alert Router branching and conditions", () => {
      const s7 = STARTER_TEMPLATES[6];
      expect(s7.id).toBe("starter-07-smart-ai-alert-router");
      expect(s7.credentialRequirements).toHaveLength(3);

      const nodes = s7.definition.nodes;
      expect(nodes).toHaveLength(5);
      expect(nodes[0].data.definitionId).toBe("manual-trigger");
      expect(nodes[1].data.definitionId).toBe("ai");
      expect(nodes[2].data.definitionId).toBe("if");
      expect(nodes[3].data.definitionId).toBe("telegram");
      expect(nodes[4].data.definitionId).toBe("email");

      // Verify AI outputs structured JSON
      const aiConfig = nodes[1].data.config as Record<string, unknown>;
      expect(aiConfig.responseType).toBe("json");

      // Verify IF condition
      const ifConfig = nodes[2].data.config as Record<string, unknown>;
      const cond = ifConfig.condition as Record<string, unknown>;
      expect(cond.field).toBe("steps.node-ai-1.json.isUrgent");
      expect(cond.operator).toBe("is_true");

      // Verify Edge Branching Handles
      const edges = s7.definition.edges;
      const trueEdge = edges.find((e) => e.sourceHandle === "true");
      const falseEdge = edges.find((e) => e.sourceHandle === "false");

      expect(trueEdge).toBeDefined();
      expect(trueEdge?.source).toBe("node-if-1");
      expect(trueEdge?.target).toBe("node-telegram-1");

      expect(falseEdge).toBeDefined();
      expect(falseEdge?.source).toBe("node-if-1");
      expect(falseEdge?.target).toBe("node-email-1");
    });
  });

  // ==========================================================================
  // Section 7 — Item 2: Repeated Seeding Produces Zero Duplicates
  // ==========================================================================
  describe("2. Repeated Seeding Produces Zero Duplicates (Item 2)", () => {
    it("should be completely idempotent when seedStarterTemplates is executed repeatedly", async () => {
      // Execute seeding twice sequentially
      await seedStarterTemplates();
      await seedStarterTemplates();

      const templatesInDb = await prisma.workflowTemplate.findMany({
        where: { id: { in: [...STARTER_TEMPLATE_IDS] } },
      });

      // There must be exactly 7 records, zero duplicates
      expect(templatesInDb).toHaveLength(7);

      const foundIds = templatesInDb.map((t) => t.id).sort();
      const expectedIds = [...EXPECTED_STARTER_IDS].sort();
      expect(foundIds).toEqual(expectedIds);

      // Verify no duplicate IDs exist
      const uniqueIds = new Set(templatesInDb.map((t) => t.id));
      expect(uniqueIds.size).toBe(7);

      // Verify legacy IDs were cleaned up
      const legacyInDb = await prisma.workflowTemplate.findMany({
        where: { id: { in: [...LEGACY_STARTER_IDS] } },
      });
      expect(legacyInDb).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Section 7 — Item 3: Shared Visibility Across Users, Orgs, and Anonymous Contexts
  // ==========================================================================
  describe("3. Shared Visibility Across Users and Organizations (Item 3)", () => {
    it("should have userId: null, organizationId: null, isPublic: true, isOfficial: true in database", async () => {
      const templates = await prisma.workflowTemplate.findMany({
        where: { id: { in: [...STARTER_TEMPLATE_IDS] } },
      });

      expect(templates).toHaveLength(7);
      for (const tpl of templates) {
        expect(tpl.userId).toBeNull();
        expect(tpl.organizationId).toBeNull();
        expect(tpl.isOfficial).toBe(true);
        expect(tpl.isPublic).toBe(true);
      }
    });

    it("should return identical 7 starter templates regardless of user or organization context", async () => {
      // Query 1: Anonymous / Unauthenticated
      const anonResult = await TemplateService.listTemplates({ startersOnly: true });
      expect(anonResult.templates).toHaveLength(7);

      // Query 2: User A in Org Alpha
      const userAResult = await TemplateService.listTemplates({
        userId: "user-alpha-123",
        organizationId: "org-alpha-123",
        startersOnly: true,
      });
      expect(userAResult.templates).toHaveLength(7);

      // Query 3: User B in Org Beta
      const userBResult = await TemplateService.listTemplates({
        userId: "user-beta-456",
        organizationId: "org-beta-456",
        startersOnly: true,
      });
      expect(userBResult.templates).toHaveLength(7);

      // All callers receive the exact same 7 starter IDs in identical order
      const anonIds = anonResult.templates.map((t) => t.id);
      const userAIds = userAResult.templates.map((t) => t.id);
      const userBIds = userBResult.templates.map((t) => t.id);

      expect(anonIds).toEqual(EXPECTED_STARTER_IDS);
      expect(userAIds).toEqual(EXPECTED_STARTER_IDS);
      expect(userBIds).toEqual(EXPECTED_STARTER_IDS);
    });

    it("should allow any user or anonymous caller to read individual starter templates via getTemplate", async () => {
      for (const id of EXPECTED_STARTER_IDS) {
        const withoutAuth = await TemplateService.getTemplate(id);
        expect(withoutAuth.id).toBe(id);

        const withAuth = await TemplateService.getTemplate(id, {
          userId: "user-random-guest",
          organizationId: "org-random",
        });
        expect(withAuth.id).toBe(id);
      }
    });
  });

  // ==========================================================================
  // Section 7 — Item 4: Personal Workflows Never Leak Into Starter Workflows
  // ==========================================================================
  describe("4. Personal Workflows Never Leak Into Starter Workflows (Item 4)", () => {
    it("should never include user workflows or private templates in starter responses", async () => {
      const testUserId = "user-leak-detector-123";

      // Create a user workflow
      const personalWorkflow = await prisma.workflow.create({
        data: {
          id: "personal-workflow-leak-test",
          userId: testUserId,
          name: "My Secret Personal Workflow",
          status: "active",
        },
      });

      // Create a private template owned by user
      const privateTemplate = await prisma.workflowTemplate.create({
        data: {
          id: "private-template-leak-test",
          userId: testUserId,
          name: "My Custom Private Template",
          description: "Private template",
          category: "Custom",
          icon: "Shield",
          tags: ["private"],
          isOfficial: false,
          isPublic: false,
          definition: { nodes: [], edges: [] },
        },
      });

      try {
        const starters = await TemplateService.getStarterTemplates();
        const starterIds = starters.map((s) => s.id);

        expect(starterIds).not.toContain(personalWorkflow.id);
        expect(starterIds).not.toContain(privateTemplate.id);
        expect(starterIds).toEqual(EXPECTED_STARTER_IDS);

        const formatted = await TemplateService.getFormattedStarterTemplates();
        const formattedIds = formatted.starters.map((s) => s.id);
        expect(formattedIds).not.toContain(personalWorkflow.id);
        expect(formattedIds).not.toContain(privateTemplate.id);
        expect(formattedIds).toEqual(EXPECTED_STARTER_IDS);
      } finally {
        await prisma.workflow.delete({ where: { id: personalWorkflow.id } }).catch(() => {});
        await prisma.workflowTemplate.delete({ where: { id: privateTemplate.id } }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // Section 7 — Item 5: Starter Templates Never Appear in User Workflow Collections Unless Cloned
  // ==========================================================================
  describe("5. Starter Templates Never Appear in User Workflow Collections Unless Cloned (Item 5)", () => {
    it("should ensure a new user's workflow collection is strictly separated from starter templates", async () => {
      const freshUserId = "user-new-clean-account-789";

      const userWorkflows = await prisma.workflow.findMany({
        where: { userId: freshUserId },
      });
      expect(userWorkflows).toHaveLength(0);

      // Verify that starter IDs only exist in workflow_templates and never in workflows
      const workflowsWithStarterIds = await prisma.workflow.findMany({
        where: { id: { in: [...EXPECTED_STARTER_IDS] } },
      });
      expect(workflowsWithStarterIds).toHaveLength(0);
    });
  });

  // ==========================================================================
  // Section 7 — Item 6: Cloning Preserves Canonical Template While Creating Isolated Copy
  // ==========================================================================
  describe("6. Non-Destructive Cloning & Credential Sanitization (Item 6)", () => {
    it("should clone Starter 03, regenerate IDs, wipe credentials, and leave canonical template intact", async () => {
      const templateId = "starter-03-ai-telegram-assistant";
      const targetUserId = "user-cloner-verified-001";

      const beforeClone = await prisma.workflowTemplate.findUnique({
        where: { id: templateId },
      });
      expect(beforeClone).toBeDefined();
      const initialUsage = beforeClone?.usageCount || 0;

      const cloned = await TemplateService.cloneTemplate({
        templateId,
        userId: targetUserId,
        customName: "My Custom Telegram Pipeline",
      });

      try {
        expect(cloned.id).toBeDefined();
        expect(cloned.id).not.toBe(templateId);
        expect(cloned.userId).toBe(targetUserId);
        expect(cloned.name).toBe("My Custom Telegram Pipeline");
        expect(cloned.status).toBe("draft");

        // Verify version 1 graph
        const version = await prisma.workflowVersion.findFirst({
          where: { workflowId: cloned.id, version: 1 },
        });
        expect(version).toBeDefined();
        const graph = version?.definition as unknown as { nodes: WorkflowNode[]; edges: WorkflowEdge[] };

        // Verify node IDs regenerated
        for (const node of graph.nodes) {
          expect(node.id).toMatch(/^n-/);
          expect(node.id).not.toBe("node-ai-1");
          expect(node.id).not.toBe("node-telegram-1");

          // Verify credential sanitization
          const cfg = (node.data.config as Record<string, unknown>) || {};
          if ("credentialId" in cfg) {
            expect(cfg.credentialId).toBe("");
          }
        }

        // Verify expression remapping
        const telegramNode = graph.nodes.find((n) => n.data.definitionId === "telegram");
        expect(telegramNode).toBeDefined();
        const textExpr = String((telegramNode?.data.config as Record<string, unknown>).text);
        expect(textExpr).not.toContain("node-ai-1");
        expect(textExpr).toMatch(/steps\.n-.*\.text/);

        // Verify the CANONICAL template was not modified in the database
        const afterClone = await prisma.workflowTemplate.findUnique({
          where: { id: templateId },
        });
        expect(afterClone).toBeDefined();
        expect(afterClone?.name).toBe("03 — AI-to-Telegram Assistant");
        expect(afterClone?.userId).toBeNull();
        expect(afterClone?.isOfficial).toBe(true);
        expect(afterClone?.usageCount).toBe(initialUsage + 1);
      } finally {
        await prisma.workflow.delete({ where: { id: cloned.id } }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // Section 7 — Item 7: Simulated Database Failure Triggers Diagnostics & Fallback
  // ==========================================================================
  describe("7. Fault-Tolerance & Database Failure Diagnostics (Item 7)", () => {
    it("should safely fall back to in-memory starters without throwing or returning empty list on DB error", async () => {
      const findManySpy = vi.spyOn(prisma.workflowTemplate, "findMany").mockRejectedValueOnce(
        new Error("Connection pool limit exceeded: 5 connections exhausted"),
      );

      const starters = await TemplateService.getStarterTemplates();
      expect(starters).toHaveLength(7);
      expect(starters.map((s) => s.id)).toEqual(EXPECTED_STARTER_IDS);

      findManySpy.mockRestore();
    });

    it("should normalize database records with formatStarterTemplateRecord correctly", () => {
      const s1 = STARTER_TEMPLATES[0];
      const mockDbRecord: import("@prisma/client").WorkflowTemplate = {
        id: s1.id,
        userId: null,
        organizationId: null,
        name: s1.name,
        description: s1.description,
        category: s1.category,
        icon: s1.icon,
        tags: s1.tags as unknown as import("@prisma/client").Prisma.JsonValue,
        featured: true,
        usageCount: 42,
        isOfficial: true,
        isPublic: true,
        definition: s1.definition as unknown as import("@prisma/client").Prisma.JsonValue,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const formatted = formatStarterTemplateRecord(mockDbRecord);
      expect(formatted.id).toBe(s1.id);
      expect(formatted.number).toBe("01");
      expect(formatted.shortName).toBe("API Quickstart");
      expect(formatted.difficulty).toBe("Beginner");
      expect(formatted.credentialRequirements).toEqual([]);
    });

    it("should serve GET /api/templates/starters with 200 and structured diagnostics", async () => {
      const req = new Request("http://localhost:3000/api/templates/starters");
      const res = await getStartersRoute(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.success).toBe(true);
      expect(data.templates).toHaveLength(7);
      expect(data.total).toBe(7);
      expect(data.diagnostics).toBeDefined();
      expect(data.diagnostics.verifiedIds).toEqual(EXPECTED_STARTER_IDS);
    });
  });

  // ==========================================================================
  // Section 7 — Item 8: User Workflows and Executions Immutability During Seeding
  // ==========================================================================
  describe("8. User Workflows & Executions Immutability During Seeding (Item 8)", () => {
    it("should never delete or mutate user workflows or execution logs when seedStarterTemplates runs", async () => {
      const preserveUserId = "user-preservation-check-999";

      // Create an existing user workflow
      const existingUserWorkflow = await prisma.workflow.create({
        data: {
          id: "wf-user-must-be-preserved",
          userId: preserveUserId,
          name: "Critical Production Invoicing Workflow",
          status: "active",
        },
      });

      try {
        // Run full template seeding
        await seedStarterTemplates();

        // Check that the user workflow still exists unmodified
        const preserved = await prisma.workflow.findUnique({
          where: { id: existingUserWorkflow.id },
        });

        expect(preserved).toBeDefined();
        expect(preserved?.name).toBe("Critical Production Invoicing Workflow");
        expect(preserved?.status).toBe("active");
        expect(preserved?.userId).toBe(preserveUserId);
      } finally {
        await prisma.workflow.delete({ where: { id: existingUserWorkflow.id } }).catch(() => {});
      }
    });
  });

  // ==========================================================================
  // Section 7 — Item 9: Fresh Initialization Populates All 7 Templates
  // ==========================================================================
  describe("9. Fresh Initialization Populates All 7 Templates (Item 9)", () => {
    it("should validate all 7 starter templates against Zod schemas and seed complete definitions", async () => {
      // Validate schema
      expect(() => validateAllStarterTemplates()).not.toThrow();

      // Seed database
      await seedStarterTemplates();

      // Confirm all 7 exist in DB with valid metadata
      const templates = await prisma.workflowTemplate.findMany({
        where: { id: { in: [...EXPECTED_STARTER_IDS] } },
      });

      expect(templates).toHaveLength(7);

      for (const starter of STARTER_TEMPLATES) {
        const dbRecord = templates.find((t) => t.id === starter.id);
        expect(dbRecord, `Missing starter in DB: ${starter.id}`).toBeDefined();
        expect(dbRecord?.name).toBe(starter.name);
        expect(dbRecord?.category).toBe(starter.category);
        expect(dbRecord?.isOfficial).toBe(true);
        expect(dbRecord?.isPublic).toBe(true);
        expect(dbRecord?.featured).toBe(true);

        const def = dbRecord?.definition as Record<string, unknown>;
        expect(def.starterNumber).toBe(starter.number);
        expect(def.difficulty).toBe(starter.difficulty);
        expect(Array.isArray(def.nodes)).toBe(true);
        expect(Array.isArray(def.edges)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // Node Config Schemas Validation
  // ==========================================================================
  describe("10. Node Config Schemas Validation", () => {
    it("should pass schema validation for all 7 starter templates without errors", () => {
      expect(() => validateAllStarterTemplates()).not.toThrow();
    });

    it("should validate all individual node configs via validateNodeConfig", () => {
      for (const starter of STARTER_TEMPLATES) {
        for (const node of starter.definition.nodes) {
          const res = validateNodeConfig(node.data.definitionId, node.data.config);
          expect(res.success, `Node ${node.id} (${node.data.definitionId}) in ${starter.id} failed validation`).toBe(true);
        }
      }
    });
  });

  // ==========================================================================
  // SSRF Protection on Starter Public Endpoints
  // ==========================================================================
  describe("11. SSRF Protection on Starter Public Endpoints", () => {
    it("should confirm public dummyjson endpoint passes SSRF validation", async () => {
      const result = await validateUrlForSsrf("https://dummyjson.com/quotes/random");
      expect(result.safe).toBe(true);
    });

    it("should reject malicious or private endpoints", async () => {
      const localhost = await validateUrlForSsrf("http://127.0.0.1:8080/private");
      expect(localhost.safe).toBe(false);

      const metadata = await validateUrlForSsrf("http://169.254.169.254/latest/meta-data");
      expect(metadata.safe).toBe(false);
    });
  });

  // ==========================================================================
  // Starter 07 IF Router Execution Logic
  // ==========================================================================
  describe("12. Starter 07 IF Router Execution Logic", () => {
    const mockContext = (nodeOutputs: Record<string, unknown>): ExecutionContext => ({
      workflowId: "test-wf",
      workflowVersionId: "ver-1",
      versionNumber: 1,
      executionId: "exec-1",
      userId: "user-1",
      input: {},
      nodeInputs: {},
      nodeOutputs,
      nodeStatuses: {},
      metadata: {},
    });

    it("should route to True handle when AI classifies incident as urgent", async () => {
      const s7 = STARTER_TEMPLATES[6];
      const ifNode = s7.definition.nodes.find((n) => n.data.definitionId === "if")!;

      const context = mockContext({
        "node-ai-1": {
          text: '{"isUrgent": true, "summary": "Payment failure spike"}',
          json: { isUrgent: true, summary: "Payment failure spike" },
        },
      });

      const result = await IfExecutor.execute(ifNode, {}, context);
      expect(result.status).toBe("success");
      expect(result.selectedHandle).toBe("true");
    });

    it("should route to False handle when AI classifies incident as not urgent", async () => {
      const s7 = STARTER_TEMPLATES[6];
      const ifNode = s7.definition.nodes.find((n) => n.data.definitionId === "if")!;

      const context = mockContext({
        "node-ai-1": {
          text: '{"isUrgent": false, "summary": "Routine documentation update"}',
          json: { isUrgent: false, summary: "Routine documentation update" },
        },
      });

      const result = await IfExecutor.execute(ifNode, {}, context);
      expect(result.status).toBe("success");
      expect(result.selectedHandle).toBe("false");
    });
  });
});
