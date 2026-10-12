import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WorkflowService } from "@/lib/workflow/workflow-service";
import { TemplateService } from "@/lib/templates/template-service";
import { STARTER_TEMPLATE_IDS } from "@/lib/templates/starter-templates";
import { prisma } from "@/lib/prisma";
import { GET as getWorkflowsRoute } from "@/app/api/workflows/route";
import { GET as getWorkflowDetailRoute, PUT as putWorkflowRoute, DELETE as deleteWorkflowRoute } from "@/app/api/workflows/[id]/route";
import { POST as executeWorkflowRoute } from "@/app/api/workflows/[id]/execute/route";
import * as authModule from "@/lib/auth/get-auth-user";
import { NextResponse } from "next/server";

const USER_ALICE = "user_test_alice_isolation_1";
const USER_BOB = "user_test_bob_isolation_2";

describe("Neuraloop Cross-User Workflow Isolation Suite", () => {
  let aliceWorkflowId: string | null = null;
  let bobWorkflowId: string | null = null;
  let clonedWorkflowId: string | null = null;

  afterEach(async () => {
    vi.restoreAllMocks();
    // Clean up test workflows created during tests
    if (aliceWorkflowId) {
      await prisma.workflow.delete({ where: { id: aliceWorkflowId } }).catch(() => {});
      aliceWorkflowId = null;
    }
    if (bobWorkflowId) {
      await prisma.workflow.delete({ where: { id: bobWorkflowId } }).catch(() => {});
      bobWorkflowId = null;
    }
    if (clonedWorkflowId) {
      await prisma.workflow.delete({ where: { id: clonedWorkflowId } }).catch(() => {});
      clonedWorkflowId = null;
    }
  });

  // ==========================================================================
  // Requirement 1: A newly registered user sees zero personal workflows
  // ==========================================================================
  it("1. A newly registered user sees exactly zero personal workflows (both list and count)", async () => {
    // Bob has zero created workflows
    const workflows = await WorkflowService.listWorkflows(USER_BOB);
    expect(workflows).toHaveLength(0);

    const count = await WorkflowService.countWorkflows(USER_BOB);
    expect(count).toBe(0);

    // Verify through the API route
    vi.spyOn(authModule, "requireAuthUser").mockResolvedValue({
      userId: USER_BOB,
      orgId: null,
      orgRole: null,
      errorResponse: null,
    });

    const res = await getWorkflowsRoute();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workflows).toHaveLength(0);
    expect(data.total).toBe(0);
    expect(data.count).toBe(0);
  });

  // ==========================================================================
  // Requirement 2: An existing user sees only their own workflows
  // ==========================================================================
  it("2. An existing user sees only their own workflows and not another user's or legacy unowned workflows", async () => {
    // Create a personal workflow for Alice
    const createdAlice = await WorkflowService.createWorkflow(
      { name: "Alice Private Financial Pipeline", description: "Alice confidential" },
      USER_ALICE,
    );
    aliceWorkflowId = createdAlice.id;

    // Alice queries her workflows
    const aliceWorkflows = await WorkflowService.listWorkflows(USER_ALICE);
    expect(aliceWorkflows).toHaveLength(1);
    expect(aliceWorkflows[0].id).toBe(aliceWorkflowId);
    expect(aliceWorkflows[0].userId).toBe(USER_ALICE);

    const aliceCount = await WorkflowService.countWorkflows(USER_ALICE);
    expect(aliceCount).toBe(1);

    // Verify Bob still sees 0 workflows
    const bobWorkflows = await WorkflowService.listWorkflows(USER_BOB);
    expect(bobWorkflows).toHaveLength(0);
    const bobCount = await WorkflowService.countWorkflows(USER_BOB);
    expect(bobCount).toBe(0);

    // Verify through GET /api/workflows for Alice
    vi.spyOn(authModule, "requireAuthUser").mockResolvedValue({
      userId: USER_ALICE,
      orgId: null,
      orgRole: null,
      errorResponse: null,
    });

    const res = await getWorkflowsRoute();
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.workflows).toHaveLength(1);
    expect(data.workflows[0].id).toBe(aliceWorkflowId);
    expect(data.total).toBe(1);
  });

  // ==========================================================================
  // Requirement 3: Neither user can list, read, edit, delete, or execute another user's private workflow
  // ==========================================================================
  it("3. Neither user can list, read, edit, delete, or execute another user's private workflow", async () => {
    // Alice creates a private workflow
    const aliceWf = await WorkflowService.createWorkflow(
      { name: "Alice Highly Secret Workflow" },
      USER_ALICE,
    );
    aliceWorkflowId = aliceWf.id;

    // Bob creates a private workflow
    const bobWf = await WorkflowService.createWorkflow(
      { name: "Bob Confidential Machine Learning Pipeline" },
      USER_BOB,
    );
    bobWorkflowId = bobWf.id;

    // A. LIST ISOLATION: Bob cannot see Alice's workflow in list
    const bobList = await WorkflowService.listWorkflows(USER_BOB);
    expect(bobList.map((w) => w.id)).not.toContain(aliceWorkflowId);
    expect(bobList.map((w) => w.id)).toContain(bobWorkflowId);

    // B. READ ISOLATION: Bob cannot get Alice's workflow
    const bobReadAlice = await WorkflowService.getWorkflow(aliceWorkflowId, USER_BOB);
    expect(bobReadAlice).toBeNull();

    // Via Route: Bob gets 404 when requesting Alice's workflow
    vi.spyOn(authModule, "requireAuthUser").mockResolvedValue({
      userId: USER_BOB,
      orgId: null,
      orgRole: null,
      errorResponse: null,
    });
    const readRes = await getWorkflowDetailRoute(
      new Request(`http://localhost:3000/api/workflows/${aliceWorkflowId}`),
      { params: Promise.resolve({ id: aliceWorkflowId }) },
    );
    expect(readRes.status).toBe(404);

    // C. EDIT ISOLATION: Bob cannot update Alice's workflow
    await expect(
      WorkflowService.updateWorkflow(aliceWorkflowId, { name: "Bob Hacked Title" }, USER_BOB),
    ).rejects.toThrow();

    // Via Route: Bob gets 404 when attempting PUT
    const putRes = await putWorkflowRoute(
      new Request(`http://localhost:3000/api/workflows/${aliceWorkflowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Bob Malicious Edit" }),
      }),
      { params: Promise.resolve({ id: aliceWorkflowId }) },
    );
    expect(putRes.status).toBe(404);

    // D. DELETE ISOLATION: Bob cannot delete Alice's workflow
    const deleteAttempt = await WorkflowService.deleteWorkflow(aliceWorkflowId, USER_BOB);
    expect(deleteAttempt).toBe(false);

    // Via Route: Bob gets 404 when attempting DELETE
    const deleteRes = await deleteWorkflowRoute(
      new Request(`http://localhost:3000/api/workflows/${aliceWorkflowId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: aliceWorkflowId }) },
    );
    expect(deleteRes.status).toBe(404);

    // Verify Alice's workflow still exists and was not deleted or modified
    const aliceStillExists = await WorkflowService.getWorkflow(aliceWorkflowId, USER_ALICE);
    expect(aliceStillExists).not.toBeNull();
    expect(aliceStillExists?.name).toBe("Alice Highly Secret Workflow");

    // E. EXECUTE ISOLATION: Bob cannot execute Alice's workflow
    const execRes = await executeWorkflowRoute(
      new Request(`http://localhost:3000/api/workflows/${aliceWorkflowId}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
      { params: Promise.resolve({ id: aliceWorkflowId }) },
    );
    expect(execRes.status).toBe(404);
  });

  // ==========================================================================
  // Requirement 4: Both users see exactly seven shared starter templates
  // ==========================================================================
  it("4. Both users see exactly seven shared starter templates in the gallery", async () => {
    const aliceStarters = await TemplateService.getStarterTemplates();
    const bobStarters = await TemplateService.getStarterTemplates();

    expect(aliceStarters).toHaveLength(7);
    expect(bobStarters).toHaveLength(7);

    const aliceIds = aliceStarters.map((t) => t.id);
    const bobIds = bobStarters.map((t) => t.id);

    expect(aliceIds).toEqual(STARTER_TEMPLATE_IDS);
    expect(bobIds).toEqual(STARTER_TEMPLATE_IDS);
    expect(aliceIds).toEqual(bobIds);

    // Starter templates are never included in personal workflow results
    const aliceWorkflows = await WorkflowService.listWorkflows(USER_ALICE);
    for (const starterId of STARTER_TEMPLATE_IDS) {
      expect(aliceWorkflows.map((w) => w.id)).not.toContain(starterId);
    }
  });

  // ==========================================================================
  // Requirement 5: Cloning a starter creates one personal workflow for requesting user
  // ==========================================================================
  it("5. Cloning a starter creates one personal workflow owned strictly by the requesting user", async () => {
    // Bob clones Starter 01: API Quickstart
    const cloned = await TemplateService.cloneTemplate({
      templateId: "starter-01-api-quickstart",
      userId: USER_BOB,
      customName: "Bob's Cloned API Quickstart",
    });
    clonedWorkflowId = cloned.id;

    expect(cloned.id).toBeDefined();
    expect(cloned.id).not.toBe("starter-01-api-quickstart");
    expect(cloned.userId).toBe(USER_BOB);

    // Bob now sees exactly 1 workflow
    const bobWorkflows = await WorkflowService.listWorkflows(USER_BOB);
    expect(bobWorkflows).toHaveLength(1);
    expect(bobWorkflows[0].id).toBe(clonedWorkflowId);
    expect(bobWorkflows[0].name).toBe("Bob's Cloned API Quickstart");

    // Alice still sees 0 workflows
    const aliceWorkflows = await WorkflowService.listWorkflows(USER_ALICE);
    expect(aliceWorkflows).toHaveLength(0);

    // The canonical starter template was NOT mutated
    const canonicalStarter = await prisma.workflowTemplate.findUnique({
      where: { id: "starter-01-api-quickstart" },
    });
    expect(canonicalStarter).toBeDefined();
    expect(canonicalStarter?.name).toBe("01 — API Quickstart");
    expect(canonicalStarter?.userId).toBeNull();
    expect(canonicalStarter?.isOfficial).toBe(true);
  });

  // ==========================================================================
  // Requirement 6: Missing authentication never exposes private workflows
  // ==========================================================================
  it("6. Missing or invalid authentication never exposes private workflows", async () => {
    const aliceWf = await WorkflowService.createWorkflow(
      { name: "Alice Confidential Vault Workflow" },
      USER_ALICE,
    );
    aliceWorkflowId = aliceWf.id;

    // A. Unauthenticated listWorkflows returns empty array
    const unauthList1 = await WorkflowService.listWorkflows(null);
    expect(unauthList1).toEqual([]);

    const unauthList2 = await WorkflowService.listWorkflows(undefined);
    expect(unauthList2).toEqual([]);

    const unauthCount = await WorkflowService.countWorkflows(null);
    expect(unauthCount).toBe(0);

    // B. Unauthenticated getWorkflow returns null
    const unauthGet1 = await WorkflowService.getWorkflow(aliceWorkflowId, null);
    expect(unauthGet1).toBeNull();

    const unauthGet2 = await WorkflowService.getWorkflow(aliceWorkflowId, undefined);
    expect(unauthGet2).toBeNull();

    // C. API route rejects with 401 when requireAuthUser returns errorResponse
    vi.spyOn(authModule, "requireAuthUser").mockResolvedValue({
      userId: null,
      orgId: null,
      orgRole: null,
      errorResponse: NextResponse.json(
        { error: "Unauthorized: Authentication required" },
        { status: 401 },
      ),
    });

    const getRes = await getWorkflowsRoute();
    expect(getRes.status).toBe(401);

    const detailRes = await getWorkflowDetailRoute(
      new Request(`http://localhost:3000/api/workflows/${aliceWorkflowId}`),
      { params: Promise.resolve({ id: aliceWorkflowId }) },
    );
    expect(detailRes.status).toBe(401);

    const execRes = await executeWorkflowRoute(
      new Request(`http://localhost:3000/api/workflows/${aliceWorkflowId}/execute`, {
        method: "POST",
      }),
      { params: Promise.resolve({ id: aliceWorkflowId }) },
    );
    expect(execRes.status).toBe(401);
  });

  // ==========================================================================
  // Requirement 7: Legacy unowned workflows (userId: null) are never leaked
  // ==========================================================================
  it("7. Legacy database records with userId: null are never leaked to any user", async () => {
    // Count how many workflows in the database have userId: null
    const legacyCount = await prisma.workflow.count({ where: { userId: null } });
    expect(legacyCount).toBeGreaterThan(0); // There are ~1,807 legacy workflows

    // Neither Bob nor Alice receives any of those legacy workflows
    const bobWorkflows = await WorkflowService.listWorkflows(USER_BOB);
    expect(bobWorkflows).toHaveLength(0);

    const aliceWorkflows = await WorkflowService.listWorkflows(USER_ALICE);
    expect(aliceWorkflows).toHaveLength(0);

    // Any legacy workflow ID requested by Bob returns null (404)
    const sampleLegacy = await prisma.workflow.findFirst({ where: { userId: null } });
    if (sampleLegacy) {
      const readLegacy = await WorkflowService.getWorkflow(sampleLegacy.id, USER_BOB);
      expect(readLegacy).toBeNull();
    }
  });
});
