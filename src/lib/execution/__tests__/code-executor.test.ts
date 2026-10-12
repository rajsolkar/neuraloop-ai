import { describe, expect, it } from "vitest";
import { CodeExecutor } from "../executors/code";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "../types";

function mockContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    executionId: "exec-code-test",
    workflowId: "w-code-test",
    workflowVersionId: "ver-code-test",
    versionNumber: 1,
    input: { name: "Raj", company: "Neuraloop" },
    nodeOutputs: {
      "node-webhook": { topic: "AI Automation" },
    },
    nodeInputs: {},
    nodeStatuses: { "node-webhook": "success" },
    metadata: {
      nodeTypes: { "node-webhook": "webhook" },
    },
    ...overrides,
  };
}

describe("Code Node Security & Sandbox Isolation Audit Suite", () => {
  it("executes legitimate user code and returns structured output", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: `return { name: input.name, greeting: "Hello " + input.name, topic: steps["node-webhook"].topic };`,
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(result.output).toEqual({
      name: "Raj",
      greeting: "Hello Raj",
      topic: "AI Automation",
    });
  });

  it("blocks process.env access and prevents environment secret leakage", async () => {
    process.env.OPENAI_API_KEY = "CRITICAL_OPENAI_SECRET";
    process.env.DATABASE_URL = "postgres://admin:password@localhost:5432/db";

    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return { env: process.env };",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("process is not defined");
  });

  it("blocks process.exit() from shutting down the application", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "process.exit(1);",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("process is not defined");
  });

  it("blocks require('fs') and prevents filesystem access", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return require('fs').readFileSync('package.json', 'utf8');",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("require is not defined");
  });

  it("blocks require('child_process') and prevents shell command execution", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return require('child_process').execSync('whoami');",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("require is not defined");
  });

  it("blocks require('net') and network socket creation", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return require('net').connect(80, '127.0.0.1');",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("require is not defined");
  });

  it("blocks fetch() to local loopback (127.0.0.1)", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return fetch('http://127.0.0.1');",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("fetch is not defined");
  });

  it("blocks fetch() to localhost", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return fetch('http://localhost');",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("fetch is not defined");
  });

  it("terminates infinite loop while(true) {} with CPU timeout", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "while(true) {}",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("CODE_TIMEOUT: Code execution timed out (CPU limit 2s exceeded).");
  });

  it("blocks excessive payload allocations (>1MB limit)", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return Array(200000).fill({ data: 'massive payload content string' });",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("CODE_OUTPUT_EXCEEDED: Code node output exceeds 1MB limit.");
  });

  it("catches user-thrown runtime errors gracefully", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "throw new Error('Custom validation failed in code snippet');",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Custom validation failed in code snippet");
  });

  it("catches JavaScript syntax errors gracefully", async () => {
    const node = createWorkflowNode("code", { x: 0, y: 0 });
    node.data.config = {
      code: "return { invalid syntax --- }",
    };

    const ctx = mockContext();
    const result = await CodeExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("Unexpected");
  });
});
