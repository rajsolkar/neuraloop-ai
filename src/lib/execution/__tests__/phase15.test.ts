import { describe, expect, it } from "vitest";
import { getExecutor } from "../executors/registry";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import { resolveExpression } from "../expression";
import type { ExecutionContext } from "../types";

function mockContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    executionId: "exec-phase15-123",
    workflowId: "w-phase15-123",
    workflowVersionId: "ver-phase15-123",
    versionNumber: 1,
    input: { triggerData: { name: "Neuraloop", status: "active" } },
    nodeOutputs: {
      "node-prev": { summary: "Success summary", items: ["a", "b", "c"] },
    },
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
    ...overrides,
  };
}

describe("Phase 15: Workflow Intelligence & Integrations", () => {
  describe("Executor Registry Coverage", () => {
    it("registers executors for all 19 node definitions including Phase 15 nodes", () => {
      const all19Defs = [
        "manual-trigger",
        "webhook",
        "schedule",
        "http-request",
        "ai",
        "slack",
        "email",
        "code",
        "webhook-response",
        "if",
        "filter",
        "set-variable",
        "delay",
        "telegram",
        "discord",
        "google-sheets",
        "loop",
        "switch",
        "merge",
      ];

      for (const defId of all19Defs) {
        const executor = getExecutor(defId);
        expect(executor).not.toBeNull();
        expect(executor?.definitionId).toBe(defId);
      }
    });
  });

  describe("Loop Executor", () => {
    it("iterates over an array input and outputs item metadata", async () => {
      const executor = getExecutor("loop")!;
      const node = createWorkflowNode("loop", { x: 0, y: 0 });
      node.data.config = { arrayInput: ["apple", "banana", "cherry"] };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.totalItems).toBe(3);
      expect(result.output?.items).toEqual(["apple", "banana", "cherry"]);
    });

    it("handles JSON string inputs gracefully", async () => {
      const executor = getExecutor("loop")!;
      const node = createWorkflowNode("loop", { x: 0, y: 0 });
      node.data.config = { arrayInput: '["item1", "item2"]' };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.totalItems).toBe(2);
      expect(result.output?.items).toEqual(["item1", "item2"]);
    });
  });

  describe("Switch Executor", () => {
    it("routes execution to case_1 when condition matches", async () => {
      const executor = getExecutor("switch")!;
      const node = createWorkflowNode("switch", { x: 0, y: 0 });
      node.data.config = {
        cases: [
          { id: "case_1", label: "case_1", fieldPath: "status", operator: "equals", value: "active" },
          { id: "case_2", label: "case_2", fieldPath: "status", operator: "equals", value: "pending" },
        ],
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { status: "active" }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.matchedBranch).toBe("case_1");
    });

    it("falls back to default handle when no cases match", async () => {
      const executor = getExecutor("switch")!;
      const node = createWorkflowNode("switch", { x: 0, y: 0 });
      node.data.config = {
        cases: [
          { id: "case_1", label: "case_1", fieldPath: "status", operator: "equals", value: "archived" },
        ],
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { status: "active" }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.matchedBranch).toBe("default");
    });
  });

  describe("Merge Executor", () => {
    it("merges input payloads with 'combine' strategy", async () => {
      const executor = getExecutor("merge")!;
      const node = createWorkflowNode("merge", { x: 0, y: 0 });
      node.data.config = { mode: "combine" };

      const ctx = mockContext();
      const result = await executor.execute(node, { branchA: { keyA: "dataA" }, branchB: { keyB: 123 } }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toEqual({ keyA: "dataA", keyB: 123 });
    });

    it("merges array outputs with 'append' strategy", async () => {
      const executor = getExecutor("merge")!;
      const node = createWorkflowNode("merge", { x: 0, y: 0 });
      node.data.config = { mode: "append" };

      const ctx = mockContext();
      const result = await executor.execute(node, { arr1: [1, 2], arr2: [3, 4] }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.mergedItems).toEqual([1, 2, 3, 4]);
    });
  });

  describe("Telegram Executor", () => {
    it("returns failed status if missing bot credential and no explicit bot token", async () => {
      const executor = getExecutor("telegram")!;
      const node = createWorkflowNode("telegram", { x: 0, y: 0 });
      node.data.config = { chatId: "123456", message: "Hello Telegram" };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Telegram bot token is missing");
    });
  });

  describe("Discord Executor", () => {
    it("returns failed status if missing Discord webhook URL", async () => {
      const executor = getExecutor("discord")!;
      const node = createWorkflowNode("discord", { x: 0, y: 0 });
      node.data.config = { content: "Hello Discord" };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("Discord webhook URL is missing");
    });
  });

  describe("Google Sheets Executor", () => {
    it("returns failed status if missing spreadsheet ID", async () => {
      const executor = getExecutor("google-sheets")!;
      const node = createWorkflowNode("google-sheets", { x: 0, y: 0 });
      node.data.config = { operation: "read_rows", range: "Sheet1!A1:B10" };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("spreadsheetId");
    });
  });

  describe("Variable Picker & Expression Evaluation", () => {
    it("evaluates trigger input expressions", () => {
      const ctx = mockContext();
      const evaluated = resolveExpression("Hello {{input.triggerData.name}}!", { input: ctx.input });
      expect(evaluated).toBe("Hello Neuraloop!");
    });

    it("evaluates step output expressions", () => {
      const ctx = mockContext();
      const evaluated = resolveExpression("Summary: {{steps.node-prev.output.summary}}", {
        steps: {
          "node-prev": {
            output: ctx.nodeOutputs["node-prev"],
          },
        },
      });
      expect(evaluated).toBe("Summary: Success summary");
    });
  });
});
