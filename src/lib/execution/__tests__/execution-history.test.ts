import { describe, it, expect, vi, beforeEach } from "vitest";
import { ErrorAnalyzer } from "../error-analyzer";
import { WorkflowAnalyticsService } from "../workflow-analytics";
import { ExecutionRecorder } from "../execution-recorder";

describe("Phase 19: Execution History & Persistence Test Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("1. ErrorAnalyzer Humanization Layer", () => {
    it("should humanize 401 unauthorized errors with clear fix suggestions", () => {
      const errorMsg = "HTTP 401 Unauthorized: Invalid API token provided";
      const analysis = ErrorAnalyzer.analyze(errorMsg, "http-request");

      expect(analysis.category).toBe("auth");
      expect(analysis.title).toContain("Authentication Failed");
      expect(analysis.explanation).toContain("invalid, revoked, or expired");
      expect(analysis.actionHint).toContain("Settings > Connections");
    });

    it("should humanize 429 rate limit errors", () => {
      const errorMsg = "HTTP 429 Rate limit exceeded. Retry in 60s";
      const analysis = ErrorAnalyzer.analyze(errorMsg, "openai");

      expect(analysis.category).toBe("rate_limit");
      expect(analysis.title).toContain("Rate Limit Exceeded");
      expect(analysis.actionHint).toContain("Delay node");
    });

    it("should humanize JSON syntax errors", () => {
      const errorMsg = "JSON_PARSE_ERROR: Unexpected token '}' in JSON at position 42";
      const analysis = ErrorAnalyzer.analyze(errorMsg, "code");

      expect(analysis.category).toBe("validation");
      expect(analysis.title).toContain("Invalid Data Payload Format");
      expect(analysis.actionHint).toContain("Transform node");
    });

    it("should provide fallback humanized analysis for unknown raw errors", () => {
      const errorMsg = "Database connection socket timed out after 5000ms";
      const analysis = ErrorAnalyzer.analyze(errorMsg, "custom");

      expect(analysis.category).toBe("system");
      expect(analysis.explanation).toBe(errorMsg);
      expect(analysis.actionHint).toBeDefined();
    });
  });

  describe("2. ExecutionRecorder API Safety", () => {
    it("should execute startExecution and completeExecution without error when DATABASE_URL is not set", async () => {
      await expect(
        ExecutionRecorder.startExecution({
          executionId: "exec-test-1",
          workflowId: "wf-1",
          workflowVersionId: "ver-1",
          workflowName: "Test Flow",
        }),
      ).resolves.not.toThrow();

      await expect(
        ExecutionRecorder.completeExecution("exec-test-1", { result: "ok" }, 150, {
          totalNodes: 1,
          successfulNodes: 1,
          failedNodes: 0,
        }),
      ).resolves.not.toThrow();
    });
  });

  describe("3. Workflow Analytics Service Calculations", () => {
    it("should return clean zero metrics when DATABASE_URL is not configured", async () => {
      const metrics = await WorkflowAnalyticsService.getWorkflowMetrics("wf-test-123");

      expect(metrics.totalExecutions).toBe(0);
      expect(metrics.successRate).toBe(100);
      expect(metrics.avgDurationMs).toBe(0);
      expect(metrics.totalAiTokens).toBe(0);
      expect(metrics.totalAiCost).toBe(0);
      expect(metrics.totalHttpRequests).toBe(0);
      expect(metrics.topFailingNode).toBeNull();
    });
  });
});
