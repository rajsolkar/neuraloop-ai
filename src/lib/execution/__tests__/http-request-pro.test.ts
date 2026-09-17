import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getExecutor } from "../executors/registry";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "../types";

function mockContext(): ExecutionContext {
  return {
    executionId: "exec-http-123",
    workflowId: "w-http-123",
    workflowVersionId: "ver-http-123",
    versionNumber: 1,
    input: {
      user: { name: "Raj Solkar", email: "raj@example.com" },
    },
    nodeOutputs: {
      "node-ai-1": { text: "AI Generated Output" },
    },
    nodeInputs: {},
    nodeStatuses: {},
    metadata: {},
  };
}

describe("Phase 17: HTTP Request Pro Test Suite", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("registers HttpRequestExecutor in EXECUTOR_REGISTRY", () => {
    const executor = getExecutor("http-request");
    expect(executor).not.toBeNull();
    expect(executor?.definitionId).toBe("http-request");
  });

  it("fails execution when URL is missing or empty", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = { url: "" };

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("NODE_CONFIG_INVALID");
  });

  it("blocks SSRF attempts to 127.0.0.1 or localhost", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = { url: "http://127.0.0.1:8080/admin" };

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("SSRF_BLOCKED");
  });

  it("executes GET request with bearer auth and parses auto JSON response", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = {
      method: "GET",
      url: "https://api.github.com/zen",
      authType: "bearer",
      bearerToken: "test_token_secret",
      responseType: "auto",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: () => Promise.resolve(JSON.stringify({ message: "Design for simplicity." })),
    } as Response);

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(result.output?.status).toBe(200);
    expect(result.output?.data).toEqual({ message: "Design for simplicity." });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.github.com/zen",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test_token_secret",
        }),
      }),
    );
  });

  it("maps custom responseKey output (Save Response As)", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = {
      method: "GET",
      url: "https://api.stripe.com/v1/customers",
      responseKey: "products",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: () => Promise.resolve(JSON.stringify([{ id: "prod_1" }, { id: "prod_2" }])),
    } as Response);

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(result.output?.data).toEqual([{ id: "prod_1" }, { id: "prod_2" }]);
    expect(result.output?.products).toEqual([{ id: "prod_1" }, { id: "prod_2" }]);
  });

  it("formats form_data body and sets application/x-www-form-urlencoded header", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = {
      method: "POST",
      url: "https://httpbin.org/post",
      bodyType: "form_data",
      formData: [
        { key: "name", value: "{{input.user.name}}" },
        { key: "email", value: "{{input.user.email}}" },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-type": "application/json" }),
      text: () => Promise.resolve(JSON.stringify({ form: { name: "Raj Solkar", email: "raj@example.com" } })),
    } as Response);

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://httpbin.org/post",
      expect.objectContaining({
        method: "POST",
        body: "name=Raj+Solkar&email=raj%40example.com",
        headers: expect.objectContaining({
          "Content-Type": "application/x-www-form-urlencoded",
        }),
      }),
    );
  });

  it("handles Basic Auth credentials encoding", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = {
      method: "GET",
      url: "https://api.example.com/data",
      authType: "basic",
      basicUsername: "admin",
      basicPassword: "secretpassword",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: () => Promise.resolve("OK"),
    } as Response);

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    const expectedBase64 = Buffer.from("admin:secretpassword").toString("base64");
    expect(globalThis.fetch).toHaveBeenCalledWith(
      "https://api.example.com/data",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: `Basic ${expectedBase64}`,
        }),
      }),
    );
  });

  it("blocks response exceeding 5 MB payload ceiling", async () => {
    const executor = getExecutor("http-request")!;
    const node = createWorkflowNode("http-request", { x: 0, y: 0 });
    node.data.config = {
      method: "GET",
      url: "https://largefile.com/download",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-length": "6291456" }), // 6 MB
      text: () => Promise.resolve("a".repeat(6 * 1024 * 1024)),
    } as Response);

    const ctx = mockContext();
    const result = await executor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("HTTP_PAYLOAD_TOO_LARGE");
  });
});
