import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  limitWebhook,
  limitAiGeneration,
  limitWorkflowExecution,
  limitAuthSensitiveRoute,
  createRateLimitResponse,
} from "../rate-limit";
import { checkPayloadSize } from "../payload-limit";
import { checkExecutionConcurrency } from "../concurrency-limit";
import { securityMetrics } from "../security-metrics";
import { prisma } from "@/lib/prisma";

describe("Phase 11: Production Abuse Protection & Rate Limiting Test Suite", () => {
  beforeEach(() => {
    securityMetrics.resetMetrics();
  });

  describe("1. Security Metrics Utilities", () => {
    it("should accurately track rate limit hits, payload rejections, and concurrency rejections", () => {
      expect(securityMetrics.getMetrics()).toEqual({
        rateLimitHits: 0,
        payloadRejections: 0,
        concurrencyRejections: 0,
        lastEventTimestamp: null,
      });

      securityMetrics.recordRateLimitHit();
      securityMetrics.recordPayloadRejection();
      securityMetrics.recordConcurrencyRejection();

      const metrics = securityMetrics.getMetrics();
      expect(metrics.rateLimitHits).toBe(1);
      expect(metrics.payloadRejections).toBe(1);
      expect(metrics.concurrencyRejections).toBe(1);
      expect(metrics.lastEventTimestamp).not.toBeNull();

      securityMetrics.resetMetrics();
      expect(securityMetrics.getMetrics().rateLimitHits).toBe(0);
    });
  });

  describe("2. Local Fallback Mode (Unconfigured Upstash Credentials)", () => {
    it("should safely allow traffic without crashing when Upstash Redis env vars are missing", async () => {
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;

      const req = new Request("http://localhost:3000/api/webhooks/wf_test", { method: "POST" });

      const webhookRes = await limitWebhook(req, "wf_test");
      expect(webhookRes.success).toBe(true);

      const aiGenRes = await limitAiGeneration(req, "user_123");
      expect(aiGenRes.success).toBe(true);

      const wfExecRes = await limitWorkflowExecution(req, "user_123");
      expect(wfExecRes.success).toBe(true);

      const authRes = await limitAuthSensitiveRoute(req, "user_123");
      expect(authRes.success).toBe(true);
    });
  });

  describe("3. Standard HTTP 429 Response Formats", () => {
    it("should construct valid 429 response with required headers and JSON body", async () => {
      const response = createRateLimitResponse({
        success: false,
        limit: 60,
        remaining: 0,
        reset: Date.now() + 30000,
        retryAfter: 30,
      });

      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBe("30");
      expect(response.headers.get("X-RateLimit-Limit")).toBe("60");
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");

      const body = await response.json();
      expect(body).toEqual({ error: "RATE_LIMIT_EXCEEDED" });
    });
  });

  describe("4. Payload Size Protection (1 MB Cap)", () => {
    it("should accept payloads within the 1 MB size limit", async () => {
      const smallPayload = JSON.stringify({ event: "order_created", items: [1, 2, 3] });
      const req = new Request("http://localhost:3000/api/webhooks/wf_123", {
        method: "POST",
        body: smallPayload,
        headers: { "content-length": String(Buffer.byteLength(smallPayload)) },
      });

      const result = await checkPayloadSize(req, 1024 * 1024);
      expect(result.valid).toBe(true);
      expect(result.response).toBeUndefined();
    });

    it("should reject payloads exceeding Content-Length header limit with 413", async () => {
      const oversizedBytes = 2 * 1024 * 1024; // 2 MB
      const req = new Request("http://localhost:3000/api/webhooks/wf_123", {
        method: "POST",
        headers: { "content-length": String(oversizedBytes) },
      });

      const result = await checkPayloadSize(req, 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.response).toBeDefined();
      expect(result.response?.status).toBe(413);

      const body = await result.response?.json();
      expect(body).toEqual({ error: "PAYLOAD_TOO_LARGE" });
      expect(securityMetrics.getMetrics().payloadRejections).toBe(1);
    });

    it("should reject payload bodies larger than 1 MB even if Content-Length is missing", async () => {
      const largeString = "x".repeat(1.5 * 1024 * 1024); // 1.5 MB
      const req = new Request("http://localhost:3000/api/webhooks/wf_123", {
        method: "POST",
        body: largeString,
      });

      const result = await checkPayloadSize(req, 1024 * 1024);
      expect(result.valid).toBe(false);
      expect(result.response?.status).toBe(413);
      expect(securityMetrics.getMetrics().payloadRejections).toBe(1);
    });
  });

  describe("5. Execution Concurrency Protection (Max 5 Active Executions)", () => {
    it("should allow execution when active execution count is under the limit (5)", async () => {
      const countSpy = vi.spyOn(prisma.workflowExecution, "count").mockResolvedValueOnce(3);

      const result = await checkExecutionConcurrency("user_active_123", 5);
      expect(result.allowed).toBe(true);
      expect(result.activeCount).toBe(3);

      countSpy.mockRestore();
    });

    it("should reject execution with 429 when active execution count is >= 5", async () => {
      const countSpy = vi.spyOn(prisma.workflowExecution, "count").mockResolvedValueOnce(5);

      const result = await checkExecutionConcurrency("user_busy_123", 5);
      expect(result.allowed).toBe(false);
      expect(result.activeCount).toBe(5);
      expect(result.response?.status).toBe(429);

      const body = await result.response?.json();
      expect(body.error).toBe("CONCURRENCY_LIMIT_EXCEEDED");
      expect(securityMetrics.getMetrics().concurrencyRejections).toBe(1);

      countSpy.mockRestore();
    });
  });
});
