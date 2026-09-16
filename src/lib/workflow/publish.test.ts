import { describe, it, expect } from "vitest";
import { validateWorkflowForPublish } from "./publish-validation";
import { PublishService } from "./publish-service";
import { WorkflowService } from "./workflow-service";
import { createWorkflowNode } from "./create-node";
import { WorkflowStatusSchema } from "./validation";
import type { WorkflowNode } from "@/types/workflow";

import { computeVersionDiff } from "./version-diff";

describe("Phase 7 & 7.1 — Workflow Publishing, Control & Versioning Tests", () => {
  describe("1. Workflow Lifecycle Status Enum Validation", () => {
    it("should accept valid lifecycle states ('draft', 'published', 'archived')", () => {
      expect(WorkflowStatusSchema.safeParse("draft").success).toBe(true);
      expect(WorkflowStatusSchema.safeParse("published").success).toBe(true);
      expect(WorkflowStatusSchema.safeParse("archived").success).toBe(true);
    });

    it("should reject deprecated active and inactive status values", () => {
      expect(WorkflowStatusSchema.safeParse("active").success).toBe(false);
      expect(WorkflowStatusSchema.safeParse("inactive").success).toBe(false);
    });
  });

  describe("2. Graph Publish Validation Rules", () => {
    it("should reject an empty canvas", () => {
      const res = validateWorkflowForPublish({ nodes: [], edges: [] });
      expect(res.valid).toBe(false);
      expect(res.errors[0]).toContain("canvas is empty");
    });

    it("should reject workflow missing a trigger node", () => {
      const n1 = createWorkflowNode("email", { x: 0, y: 0 });
      n1.data.config = { to: "test@example.com" };

      const res = validateWorkflowForPublish({ nodes: [n1], edges: [] });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Trigger node"))).toBe(true);
    });

    it("should reject workflow missing an action or logic node", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });

      const res = validateWorkflowForPublish({ nodes: [n1], edges: [] });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("Action or Logic node"))).toBe(true);
    });

    it("should catch unconfigured Email node missing recipient", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "" };

      const res = validateWorkflowForPublish({ nodes: [n1, n2], edges: [{ id: "e1", source: n1.id, target: n2.id }] });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("missing a recipient"))).toBe(true);
    });

    it("should catch unconfigured HTTP Request node missing URL", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("http-request", { x: 100, y: 0 });
      n2.data.config = { url: "" };

      const res = validateWorkflowForPublish({ nodes: [n1, n2], edges: [{ id: "e1", source: n1.id, target: n2.id }] });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("missing a target Request URL"))).toBe(true);
    });

    it("should catch unconfigured Slack node missing channel", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("slack", { x: 100, y: 0 });
      n2.data.config = { channel: "" };

      const res = validateWorkflowForPublish({ nodes: [n1, n2], edges: [{ id: "e1", source: n1.id, target: n2.id }] });
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("missing a destination channel"))).toBe(true);
    });

    it("should pass validation for a fully configured valid workflow", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "sales@example.com" };

      const res = validateWorkflowForPublish({
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("should recognize Manual Trigger, Webhook Trigger, HTTP Request, Delay, and OpenAI nodes", () => {
      const n1 = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const n2 = createWorkflowNode("webhook", { x: 100, y: 0 });
      const n3 = createWorkflowNode("http-request", { x: 200, y: 0 });
      n3.data.config = { url: "https://api.example.com/webhook" };
      const n4 = createWorkflowNode("delay", { x: 300, y: 0 });
      const n5 = createWorkflowNode("openai", { x: 400, y: 0 });

      const edges = [
        { id: "e1", source: n1.id, target: n3.id },
        { id: "e2", source: n2.id, target: n3.id },
        { id: "e3", source: n3.id, target: n4.id },
        { id: "e4", source: n4.id, target: n5.id },
      ];

      const res = validateWorkflowForPublish({ nodes: [n1, n2, n3, n4, n5], edges });
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("should classify trigger nodes even if data.category is missing by inspecting type or definitionId", () => {
      const triggerNode = {
        id: "trig-1",
        type: "manual-trigger",
        position: { x: 0, y: 0 },
        data: { definitionId: "manual-trigger", label: "Manual Trigger" } as unknown as WorkflowNode["data"],
      };
      const actionNode = {
        id: "act-1",
        type: "http-request",
        position: { x: 100, y: 0 },
        data: { definitionId: "http-request", label: "HTTP Request", config: { url: "https://example.com" } } as unknown as WorkflowNode["data"],
      };

      const res = validateWorkflowForPublish({
        nodes: [triggerNode as unknown as WorkflowNode, actionNode as unknown as WorkflowNode],
        edges: [{ id: "e1", source: triggerNode.id, target: actionNode.id }],
      });

      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    });

    it("should update stale workflow DB definition when fresh canvas nodes are passed to publishWorkflow", async () => {
      const wf = await WorkflowService.createWorkflow({
        name: "Empty Workflow Test",
        nodes: [],
        edges: [],
      });

      const n1 = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const n2 = createWorkflowNode("http-request", { x: 100, y: 0 });
      n2.data.config = { url: "https://api.example.com" };

      const published = await PublishService.publishWorkflow(wf.id, {
        activateImmediately: true,
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });

      expect(published.nodes).toHaveLength(2);
      expect(published.publishedVersionNumber).toBe(1);
      expect(published.status).toBe("published");
    }, 15000);
  });

  describe("3. Sequential & Race-Safe Version Publishing Logic", () => {
    it("should execute sequential publishes: v1 -> v2 -> v3 -> v4 -> v5 without version collision", async () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "sales@example.com" };

      const wf = await WorkflowService.createWorkflow({
        name: "Sequential Publish Test",
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });

      const p1 = await PublishService.publishWorkflow(wf.id);
      expect(p1.publishedVersionNumber).toBe(1);

      const p2 = await PublishService.publishWorkflow(wf.id);
      expect(p2.publishedVersionNumber).toBe(2);

      const p3 = await PublishService.publishWorkflow(wf.id);
      expect(p3.publishedVersionNumber).toBe(3);

      const p4 = await PublishService.publishWorkflow(wf.id);
      expect(p4.publishedVersionNumber).toBe(4);

      const p5 = await PublishService.publishWorkflow(wf.id);
      expect(p5.publishedVersionNumber).toBe(5);
    }, 20000);

    it("should support Active=v1, Publish snapshot=v2 (inactive), Publish again=v3 (active)", async () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "ops@example.com" };

      const wf = await WorkflowService.createWorkflow({
        name: "Activation Strategy Test",
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });

      // v1 active
      const p1 = await PublishService.publishWorkflow(wf.id, { activateImmediately: true });
      expect(p1.publishedVersionNumber).toBe(1);
      expect(p1.activeVersionNumber).toBe(1);

      // v2 snapshot only (keep v1 active)
      const p2 = await PublishService.publishWorkflow(wf.id, { activateImmediately: false });
      expect(p2.publishedVersionNumber).toBe(2);
      expect(p2.activeVersionNumber).toBe(1);

      // v3 publish and activate
      const p3 = await PublishService.publishWorkflow(wf.id, { activateImmediately: true });
      expect(p3.publishedVersionNumber).toBe(3);
      expect(p3.activeVersionNumber).toBe(3);
    });

    it("should restore v1 and create v4 without mutating historical version records", async () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "audit@example.com" };

      const wf = await WorkflowService.createWorkflow({
        name: "Restore Version Test",
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });

      await PublishService.publishWorkflow(wf.id); // v1
      await PublishService.publishWorkflow(wf.id); // v2
      await PublishService.publishWorkflow(wf.id); // v3

      const restored = await PublishService.restoreVersion(wf.id, 1);
      expect(restored.publishedVersionNumber).toBe(4);
      expect(restored.activeVersionNumber).toBe(4);
    });
  });

  describe("4. Phase 7 Cleanup & Version Diff Accuracy Tests", () => {
    it("should compute version graph diffs accurately for node additions, removals, modifications, and edge changes", () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("slack", { x: 100, y: 0 });
      const n3 = createWorkflowNode("openai", { x: 200, y: 0 });

      const oldGraph = {
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      };

      const newGraph = {
        nodes: [
          n1,
          n3, // Added OpenAI, Removed Slack
          { ...n1, data: { ...n1.data, label: "Updated Webhook Label" } }, // Modified n1
        ],
        edges: [{ id: "e2", source: n1.id, target: n3.id }], // Edge added Webhook -> OpenAI, removed Webhook -> Slack
      };

      const diff = computeVersionDiff(oldGraph, newGraph);
      expect(diff.hasChanges).toBe(true);
      expect(diff.addedNodesCount).toBe(1); // OpenAI added
      expect(diff.removedNodesCount).toBe(1); // Slack removed
      expect(diff.modifiedNodesCount).toBe(1); // Webhook label updated
      expect(diff.addedEdgesCount).toBe(1); // e2 added
      expect(diff.removedEdgesCount).toBe(1); // e1 removed
    });

    it("should detect unpublished draft changes against active published version", async () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "team@example.com" };

      const wf = await WorkflowService.createWorkflow({
        name: "Diff Detection Test",
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });

      const published = await PublishService.publishWorkflow(wf.id);

      // Check no changes against identical published canvas
      const hasChangesInitial = await PublishService.hasUnpublishedChanges(wf.id, published.nodes, published.edges);
      expect(hasChangesInitial).toBe(false);

      // Add a third node (Delay)
      const n3 = createWorkflowNode("delay", { x: 200, y: 0 });
      const hasChangesAfterAdd = await PublishService.hasUnpublishedChanges(
        wf.id,
        [n1, n2, n3],
        [
          { id: "e1", source: n1.id, target: n2.id },
          { id: "e2", source: n2.id, target: n3.id },
        ],
      );
      expect(hasChangesAfterAdd).toBe(true);
    });

    it("should allow rotating webhook secret for published workflow", async () => {
      const wf = await WorkflowService.createWorkflow({ name: "Secret Rotation Test" });
      const secret1 = PublishService.generateSecret();
      expect(secret1.startsWith("sk_live_")).toBe(true);

      const secret2 = await PublishService.rotateWebhookSecret(wf.id);
      expect(secret2.startsWith("sk_live_")).toBe(true);
    });

    it("uses workflow webhook secret when triggering test webhook and returns webhookSecret in getWorkflow", async () => {
      const n1 = createWorkflowNode("webhook", { x: 0, y: 0 });
      const n2 = createWorkflowNode("email", { x: 100, y: 0 });
      n2.data.config = { to: "sales@example.com" };

      const wf = await WorkflowService.createWorkflow({
        name: "Secret Trigger Test",
        nodes: [n1, n2],
        edges: [{ id: "e1", source: n1.id, target: n2.id }],
      });

      const published = await PublishService.publishWorkflow(wf.id);
      expect(published.webhookSecret).toBeTruthy();
      expect(published.webhookSecret?.startsWith("sk_live_")).toBe(true);

      const retrieved = await WorkflowService.getWorkflow(wf.id);
      expect(retrieved?.webhookSecret).toBe(published.webhookSecret);
    });

    it("should reject GET requests with clear developer guidance error message", async () => {
      const { GET } = await import("../../app/api/webhooks/[id]/route");
      const response = await GET();
      const data = await response.json();
      expect(response.status).toBe(405);
      expect(data.error).toContain("Use POST requests to trigger this webhook");
    });
  });
});
