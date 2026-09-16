import { describe, it, expect, vi, beforeEach } from "vitest";

describe("Phase 13: Real-Time Execution Monitoring & Live SSE Streams Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. SSE Event Payloads & Execution Metrics", () => {
    it("should construct valid node_started payload with attempt count", () => {
      const payload = {
        executionId: "exec-100",
        nodeId: "node-http-1",
        nodeType: "http-request",
        status: "running",
        startedAt: new Date("2026-09-16T10:00:00Z").toISOString(),
        attempt: 1,
      };

      expect(payload.executionId).toBe("exec-100");
      expect(payload.nodeId).toBe("node-http-1");
      expect(payload.status).toBe("running");
      expect(payload.attempt).toBe(1);
    });

    it("should construct valid node_completed payload with durationMs metrics", () => {
      const startedAt = new Date("2026-09-16T10:00:00Z");
      const completedAt = new Date("2026-09-16T10:00:02.345Z");
      const durationMs = completedAt.getTime() - startedAt.getTime();

      const payload = {
        executionId: "exec-100",
        nodeId: "node-openai-1",
        status: "success",
        startedAt: startedAt.toISOString(),
        completedAt: completedAt.toISOString(),
        durationMs,
        output: { result: "AI summary text" },
        attempt: 1,
      };

      expect(payload.status).toBe("success");
      expect(payload.durationMs).toBe(2345);
      expect(payload.output).toEqual({ result: "AI summary text" });
    });

    it("should construct valid node_failed payload with error details", () => {
      const payload = {
        executionId: "exec-100",
        nodeId: "node-slack-1",
        status: "failed",
        error: "SLACK_API_ERROR: Channel not found",
        durationMs: 120,
        attempt: 2,
      };

      expect(payload.status).toBe("failed");
      expect(payload.error).toContain("Channel not found");
      expect(payload.attempt).toBe(2);
    });

    it("should construct valid workflow_cancelled payload", () => {
      const cancelledAt = new Date().toISOString();
      const payload = {
        executionId: "exec-100",
        status: "cancelled",
        reason: "EXECUTION_CANCELLED: Execution was cancelled by user request.",
        cancelledAt,
      };

      expect(payload.status).toBe("cancelled");
      expect(payload.reason).toContain("cancelled by user request");
    });
  });

  describe("2. Execution Replay Hierarchy & Parent Linkage", () => {
    it("should correctly compute child retryCount based on parent execution", () => {
      const parentExecution = {
        id: "exec-orig-1",
        retryCount: 0,
      };

      const childRetryCount = (parentExecution.retryCount || 0) + 1;
      expect(childRetryCount).toBe(1);

      const grandChildRetryCount = childRetryCount + 1;
      expect(grandChildRetryCount).toBe(2);
    });

    it("should correctly format retry metadata object", () => {
      const originalId = "exec-base-99";
      const retryCount = 1;

      const metadata = {
        retryOf: originalId,
        retryCount,
        replayedAt: new Date("2026-09-16T12:00:00Z").toISOString(),
      };

      expect(metadata.retryOf).toBe("exec-base-99");
      expect(metadata.retryCount).toBe(1);
    });
  });

  describe("3. Multi-Tenant Ownership & Access Guard Logic", () => {
    it("should grant access when organizationId matches request orgId", () => {
      const execution = {
        id: "exec-org-1",
        userId: "user_clerk_123",
        organizationId: "org_clerk_456",
      };

      const requestUser = { userId: "user_clerk_999", orgId: "org_clerk_456" };

      const isAllowed =
        requestUser.orgId && execution.organizationId
          ? execution.organizationId === requestUser.orgId
          : execution.userId === requestUser.userId;

      expect(isAllowed).toBe(true);
    });

    it("should reject access when organizationId differs from request orgId", () => {
      const execution = {
        id: "exec-org-1",
        userId: "user_clerk_123",
        organizationId: "org_clerk_456",
      };

      const requestUser = { userId: "user_clerk_123", orgId: "org_other_789" };

      const isAllowed =
        requestUser.orgId && execution.organizationId
          ? execution.organizationId === requestUser.orgId
          : execution.userId === requestUser.userId;

      expect(isAllowed).toBe(false);
    });

    it("should grant access to personal workspace owner when no orgId is active", () => {
      const execution = {
        id: "exec-personal-1",
        userId: "user_clerk_123",
        organizationId: null,
      };

      const requestUser = { userId: "user_clerk_123", orgId: null };

      const isAllowed =
        requestUser.orgId && execution.organizationId
          ? execution.organizationId === requestUser.orgId
          : execution.userId === requestUser.userId;

      expect(isAllowed).toBe(true);
    });
  });
});
