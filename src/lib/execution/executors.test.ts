import { describe, expect, it } from "vitest";
import { getExecutor } from "./executors/registry";
import { validateUrlForSsrf } from "./ssrf";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "./types";

function mockContext(): ExecutionContext {
  return {
    executionId: "exec-test-123",
    workflowId: "w-test-123",
    workflowVersionId: "ver-test-123",
    versionNumber: 1,
    input: { lead: { score: 95, name: "Raj" } },
    nodeOutputs: {},
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
  };
}

describe("Phase 4 Node Executors & SSRF Protection", () => {
  it("registers executors for all 10 node definitions", () => {
    const nodeDefs = [
      "manual-trigger",
      "webhook",
      "schedule",
      "http-request",
      "openai",
      "slack",
      "email",
      "if",
      "filter",
      "delay",
    ];

    for (const defId of nodeDefs) {
      expect(getExecutor(defId)).not.toBeNull();
    }
  });

  describe("SSRF Protection", () => {
    it("blocks localhost, loopback, and private IP addresses", () => {
      expect(validateUrlForSsrf("http://localhost/api").safe).toBe(false);
      expect(validateUrlForSsrf("http://127.0.0.1:8080/data").safe).toBe(false);
      expect(validateUrlForSsrf("http://10.0.0.1/admin").safe).toBe(false);
      expect(validateUrlForSsrf("http://192.168.1.1/router").safe).toBe(false);
      expect(validateUrlForSsrf("http://169.254.169.254/latest/meta-data").safe).toBe(false);
    });

    it("allows valid public HTTP and HTTPS URLs", () => {
      expect(validateUrlForSsrf("https://api.github.com/zen").safe).toBe(true);
      expect(validateUrlForSsrf("https://httpbin.org/get").safe).toBe(true);
    });
  });

  describe("Manual Trigger Executor", () => {
    it("returns trigger input payload", async () => {
      const executor = getExecutor("manual-trigger")!;
      const node = createWorkflowNode("manual-trigger", { x: 0, y: 0 });
      const ctx = mockContext();

      const result = await executor.execute(node, { custom: "data" }, ctx);
      expect(result.status).toBe("success");
      expect(result.output).toEqual({ custom: "data" });
    });
  });

  describe("IF Executor", () => {
    it("evaluates greater_than condition to TRUE branch", async () => {
      const executor = getExecutor("if")!;
      const node = createWorkflowNode("if", { x: 0, y: 0 });
      node.data.config = {
        condition: { field: "lead.score", operator: "greater_than", value: "80" },
      };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toBe(true);
      expect(result.selectedHandle).toBe("true");
    });

    it("evaluates less_than condition to FALSE branch", async () => {
      const executor = getExecutor("if")!;
      const node = createWorkflowNode("if", { x: 0, y: 0 });
      node.data.config = {
        condition: { field: "lead.score", operator: "less_than", value: "50" },
      };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toBe(false);
      expect(result.selectedHandle).toBe("false");
    });
  });

  describe("Filter Executor", () => {
    it("returns success if condition matches and skipped if condition fails", async () => {
      const executor = getExecutor("filter")!;
      const node = createWorkflowNode("filter", { x: 0, y: 0 });
      node.data.config = {
        condition: { field: "lead.name", operator: "equals", value: "Raj" },
      };

      const ctx = mockContext();
      const resMatch = await executor.execute(node, {}, ctx);
      expect(resMatch.status).toBe("success");

      ((node.data.config as Record<string, unknown>).condition as Record<string, unknown>).value = "OtherName";
      const resNoMatch = await executor.execute(node, {}, ctx);
      expect(resNoMatch.status).toBe("skipped");
    });
  });

  describe("Delay Executor", () => {
    it("executes bounded delay successfully", async () => {
      const executor = getExecutor("delay")!;
      const node = createWorkflowNode("delay", { x: 0, y: 0 });
      node.data.config = { duration: 1, unit: "seconds" };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);
      expect(result.status).toBe("success");
      expect(result.output?.requestedDuration).toBe(1);
    });
  });

  describe("Credential Guarded Executors", () => {
    it("returns CREDENTIAL_NOT_CONFIGURED error when server keys are missing", async () => {
      const openaiExec = getExecutor("openai")!;
      const slackExec = getExecutor("slack")!;
      const emailExec = getExecutor("email")!;

      const ctx = mockContext();

      const openaiRes = await openaiExec.execute(createWorkflowNode("openai", { x: 0, y: 0 }), {}, ctx);
      expect(openaiRes.status).toBe("failed");
      expect(openaiRes.error).toContain("CREDENTIAL_NOT_CONFIGURED");

      const slackRes = await slackExec.execute(createWorkflowNode("slack", { x: 0, y: 0 }), {}, ctx);
      expect(slackRes.status).toBe("failed");
      expect(slackRes.error).toContain("CREDENTIAL_NOT_CONFIGURED");

      const emailRes = await emailExec.execute(createWorkflowNode("email", { x: 0, y: 0 }), {}, ctx);
      expect(emailRes.status).toBe("failed");
      expect(emailRes.error).toContain("CREDENTIAL_NOT_CONFIGURED");
    });
  });
});
