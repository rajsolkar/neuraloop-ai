import { describe, expect, it } from "vitest";
import { getExecutor } from "../executors/registry";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "../types";

function mockContext(): ExecutionContext {
  return {
    executionId: "exec-transform-123",
    workflowId: "w-transform-123",
    workflowVersionId: "ver-transform-123",
    versionNumber: 1,
    input: {
      user: { name: "Raj Solkar", email: "raj@example.com", phone: "9999999999" },
    },
    nodeOutputs: {
      "node-ai-1": { text: "AI Evaluation Summary Output" },
    },
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
  };
}

describe("Phase 16: Smart Transform Node Test Suite", () => {
  it("registers TransformExecutor in EXECUTOR_REGISTRY", () => {
    const executor = getExecutor("transform");
    expect(executor).not.toBeNull();
    expect(executor?.definitionId).toBe("transform");
  });

  describe("Field Operations", () => {
    it("add_field: appends key-value pair with resolved expression", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "aiSummary",
        value: "{{steps.node-ai-1.output.text}}",
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { status: "pending" }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.aiSummary).toBe("AI Evaluation Summary Output");
      expect(result.output?.status).toBe("pending");
    });

    it("remove_field: removes specified property key", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "remove_field",
        targetPath: "secretToken",
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { secretToken: "12345", name: "Raj" }, ctx);

      expect(result.status).toBe("success");
      expect((result.output?.result as Record<string, unknown>).secretToken).toBeUndefined();
      expect((result.output?.result as Record<string, unknown>).name).toBe("Raj");
    });

    it("rename_field: renames target key to new key", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "rename_field",
        targetPath: "name",
        newKey: "fullName",
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { name: "Raj" }, ctx);

      expect(result.status).toBe("success");
      expect((result.output?.result as Record<string, unknown>).fullName).toBe("Raj");
      expect((result.output?.result as Record<string, unknown>).name).toBeUndefined();
    });

    it("keep_fields: retains only specified keys (Filter Fields)", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "keep_fields",
        targetPath: "name, email",
      };

      const ctx = mockContext();
      const result = await executor.execute(
        node,
        { name: "Raj", email: "raj@gmail.com", phone: "9999999999" },
        ctx,
      );

      expect(result.status).toBe("success");
      expect(result.output?.result).toEqual({ name: "Raj", email: "raj@gmail.com" });
    });

    it("set_default_values: populates fallback values for missing keys", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "set_default_values",
        defaultValues: [{ key: "email", value: "unknown@example.com" }],
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { name: "Raj" }, ctx);

      expect(result.status).toBe("success");
      expect((result.output?.result as Record<string, unknown>).email).toBe("unknown@example.com");
      expect((result.output?.result as Record<string, unknown>).name).toBe("Raj");
    });
  });

  describe("JSON Operations", () => {
    it("merge_objects: merges input payload with additional object sources", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "merge_objects",
        mergeSources: ['{"role": "admin"}'],
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { name: "Raj" }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toEqual({ name: "Raj", role: "admin" });
    });

    it("flatten_json: flattens nested object structures into dot notation", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = { operation: "flatten_json" };

      const ctx = mockContext();
      const result = await executor.execute(node, { user: { address: { city: "SF" } } }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toEqual({ "user.address.city": "SF" });
    });

    it("extract_nested: extracts target property paths", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "extract_nested",
        extractPaths: ["input.user.email"],
      };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toEqual({ email: "raj@example.com" });
    });

    it("json_parse_stringify: parses JSON string into object", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "json_parse_stringify",
        jsonMode: "parse",
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { data: '{"parsedKey": "value"}' }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.result).toEqual({ parsedKey: "value" });
    });
  });

  describe("String, Date, & Math Operations", () => {
    it("string_format: converts string to uppercase", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "string_format",
        stringOp: "uppercase",
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { text: "neuraloop" }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.text).toBe("NEURALOOP");
    });

    it("date_format: returns ISO date string", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "date_format",
        dateFormat: "iso",
      };

      const ctx = mockContext();
      const result = await executor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.isoString).toBeDefined();
    });

    it("math_operation: performs addition computation", async () => {
      const executor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "math_operation",
        mathOp: "add",
        operand: 10,
      };

      const ctx = mockContext();
      const result = await executor.execute(node, { value: 90 }, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.value).toBe(100);
    });
  });
});
