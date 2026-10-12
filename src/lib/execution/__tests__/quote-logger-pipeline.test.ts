import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { getExecutor } from "../executors/registry";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "../types";
import { resolveExpression, resolveValue, buildExecutionExpressionContext } from "../expression";
import { TemplateCloner } from "@/lib/templates/template-cloner";
import { STARTER_TEMPLATES } from "@/lib/templates/starter-templates";
import { CredentialService } from "@/lib/security/credential-service";

describe("Starter 06: API-to-Sheets Quote Logger Pipeline Test Suite", () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = process.env.GOOGLE_API_KEY;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.GOOGLE_API_KEY = "AIzaSyTestKey123";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalApiKey !== undefined) {
      process.env.GOOGLE_API_KEY = originalApiKey;
    } else {
      delete process.env.GOOGLE_API_KEY;
    }
  });

  function createPipelineContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
    return {
      executionId: "exec-quote-pipeline-1",
      workflowId: "wf-quote-pipeline-1",
      workflowVersionId: "ver-quote-pipeline-1",
      versionNumber: 1,
      input: {},
      nodeOutputs: {
        "node-trigger-1": { startedAt: "2026-10-12T12:00:00.000Z" },
        "node-http-1": {
          status: 200,
          statusText: "OK",
          headers: { "content-type": "application/json" },
          data: {
            id: 288,
            quote: "Float like a butterfly, sting like a bee.",
            author: "Muhammad Ali",
          },
          quoteData: {
            id: 288,
            quote: "Float like a butterfly, sting like a bee.",
            author: "Muhammad Ali",
          },
          duration: 120,
        },
      },
      nodeInputs: {},
      nodeStatuses: {
        "node-trigger-1": "success",
        "node-http-1": "success",
      },
      metadata: {
        nodeTypes: {
          "node-trigger-1": "manual-trigger",
          "node-http-1": "http-request",
        },
      },
      ...overrides,
    };
  }

  describe("1. Transform Node (Format Row Data) Execution", () => {
    it("resolves {{$timestamp}} and {{$steps.node-http-1.data.quote}} into a real JavaScript Array", async () => {
      const transformExecutor = getExecutor("transform")!;
      expect(transformExecutor).toBeDefined();

      const node = createWorkflowNode("transform", { x: 680, y: 160 });
      node.id = "node-transform-1";
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: '["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "{{$steps.node-http-1.data.author}}"]',
      };

      const ctx = createPipelineContext();
      const result = await transformExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output).toBeDefined();

      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow).toHaveLength(3);

      // Verify no unresolved literal interpolation templates remain
      expect(typeof formattedRow[0]).toBe("string");
      expect(formattedRow[0]).not.toContain("{{");
      expect(formattedRow[0]).not.toContain("$timestamp");
      expect(new Date(formattedRow[0] as string).getTime()).not.toBeNaN();

      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");

      // Verify both output.formattedRow and output.result.formattedRow are populated
      expect((result.output?.result as Record<string, unknown>).formattedRow).toEqual(formattedRow);
    });

    it("resolves steps without $ prefix ({{timestamp}} and {{steps.node-http-1.data.quote}})", async () => {
      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: '["{{timestamp}}", "{{steps.node-http-1.data.quote}}", "{{steps.node-http-1.data.author}}"]',
      };

      const ctx = createPipelineContext();
      const result = await transformExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");
    });

    it("resolves cloned node IDs containing UUIDs (e.g. n-cloned-03a81d27-016d-4807-a715-325e46...)", async () => {
      const clonedHttpId = "n-cloned-03a81d27-016d-4807-a715-325e46abcdef";
      const clonedTransformId = "n-cloned-98765432-1234-5678-abcd-ef0123456789";

      const ctx = createPipelineContext({
        nodeOutputs: {
          [clonedHttpId]: {
            status: 200,
            data: {
              id: 288,
              quote: "Float like a butterfly, sting like a bee.",
              author: "Muhammad Ali",
            },
          },
        },
      });

      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.id = clonedTransformId;
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: `["{{$timestamp}}", "{{$steps.${clonedHttpId}.data.quote}}", "{{$steps.${clonedHttpId}.data.author}}"]`,
      };

      const result = await transformExecutor.execute(node, {}, ctx);
      expect(result.status).toBe("success");
      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");
    });

    it("resolves nested response properties including quoteData and direct data fallback", async () => {
      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: '["{{$steps.node-http-1.quoteData.quote}}", "{{$steps.node-http-1.quote}}", "{{$steps.node-http-1.output.data.author}}"]',
      };

      const ctx = createPipelineContext();
      const result = await transformExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[0]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");
    });

    it("handles quotes containing nested double quotes and special characters safely", async () => {
      const complexQuote = 'Ali proclaimed: "I am the greatest!" with 100% confidence & passion.';
      const ctx = createPipelineContext({
        nodeOutputs: {
          "node-http-1": {
            data: {
              id: 288,
              quote: complexQuote,
              author: "Muhammad Ali",
            },
          },
        },
      });

      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: '["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "{{$steps.node-http-1.data.author}}"]',
      };

      const result = await transformExecutor.execute(node, {}, ctx);
      expect(result.status).toBe("success");
      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[1]).toBe(complexQuote);
      expect(formattedRow[2]).toBe("Muhammad Ali");
    });

    it("supports single-quoted JS array templates e.g. ['{{$timestamp}}', '{{$steps.node-http-1.data.quote}}']", async () => {
      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: "['{{$timestamp}}', '{{$steps.node-http-1.data.quote}}', '{{$steps.node-http-1.data.author}}']",
      };

      const ctx = createPipelineContext();
      const result = await transformExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");
    });

    it("supports value passed as a native JavaScript Array in config", async () => {
      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: ["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "{{$steps.node-http-1.data.author}}"],
      };

      const ctx = createPipelineContext();
      const result = await transformExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      const formattedRow = result.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");
    });

    it("preserves primitive types (number, boolean) for exact expressions", async () => {
      const transformExecutor = getExecutor("transform")!;
      const node = createWorkflowNode("transform", { x: 0, y: 0 });
      node.data.config = {
        operation: "add_field",
        key: "quoteId",
        value: "{{$steps.node-http-1.data.id}}",
      };

      const ctx = createPipelineContext();
      const result = await transformExecutor.execute(node, {}, ctx);

      expect(result.status).toBe("success");
      expect(result.output?.quoteId).toBe(288);
      expect(typeof result.output?.quoteId).toBe("number");
    });
  });

  describe("2. End-to-End Pipeline Execution: HTTP -> Transform -> Google Sheets", () => {
    it("passes resolved formattedRow array to Google Sheets and appends a single 1D row", async () => {
      let capturedRequestBody: Record<string, unknown> | null = null;
      let capturedRequestUrl: string | null = null;

      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        capturedRequestUrl = url;
        if (init?.body) {
          capturedRequestBody = JSON.parse(init.body as string);
        }
        return new Response(
          JSON.stringify({
            spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
            tableRange: "Sheet1!A1:C1",
            updates: {
              spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
              updatedRange: "Sheet1!A2:C2",
              updatedRows: 1,
              updatedColumns: 3,
              updatedCells: 3,
            },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      // 1. Execute Transform Node
      const transformExecutor = getExecutor("transform")!;
      const transformNode = createWorkflowNode("transform", { x: 680, y: 160 });
      transformNode.id = "node-transform-1";
      transformNode.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: '["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "{{$steps.node-http-1.data.author}}"]',
      };

      const initialCtx = createPipelineContext();
      const transformResult = await transformExecutor.execute(transformNode, {}, initialCtx);
      expect(transformResult.status).toBe("success");

      // 2. Prepare Context for Google Sheets Node with Transform Output
      const sheetsCtx: ExecutionContext = {
        ...initialCtx,
        nodeOutputs: {
          ...initialCtx.nodeOutputs,
          "node-transform-1": transformResult.output as Record<string, unknown>,
        },
        nodeStatuses: {
          ...initialCtx.nodeStatuses,
          "node-transform-1": "success",
        },
        metadata: {
          nodeTypes: {
            "node-trigger-1": "manual-trigger",
            "node-http-1": "http-request",
            "node-transform-1": "transform",
          },
        },
      };

      // 3. Execute Google Sheets Node
      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 980, y: 160 });
      sheetsNode.id = "node-sheets-1";
      sheetsNode.data.config = {
        spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: "{{$steps.node-transform-1.formattedRow}}",
      };

      const sheetsResult = await sheetsExecutor.execute(sheetsNode, {}, sheetsCtx);

      expect(sheetsResult.status).toBe("success");
      expect(sheetsResult.output?.appended).toBe(true);
      expect(sheetsResult.output?.updatedRows).toBe(1);

      // Verify Google Sheets received exactly one 1D row wrapped in values: [ [ col1, col2, col3 ] ]
      expect(capturedRequestBody).not.toBeNull();
      const values = ((capturedRequestBody as unknown) as { values: unknown[][] }).values;
      expect(Array.isArray(values)).toBe(true);
      expect(values).toHaveLength(1); // Exactly 1 row appended

      const row = values[0];
      expect(Array.isArray(row)).toBe(true);
      expect(row).toHaveLength(3);

      // Verify columns: Col 0 = timestamp, Col 1 = quote, Col 2 = author
      expect(typeof row[0]).toBe("string");
      expect(row[0]).not.toContain("{{");
      expect(row[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(row[2]).toBe("Muhammad Ali");

      // Verify output.rowValues returned by executor
      expect(sheetsResult.output?.rowValues).toEqual(row);
    });

    it("passes row values using steps.node-transform-1.formattedRow without $ prefix", async () => {
      let capturedRequestBody: { values?: unknown[][] } | null = null;

      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.body) {
          capturedRequestBody = JSON.parse(init.body as string);
        }
        return new Response(
          JSON.stringify({
            updates: { updatedRange: "Sheet1!A2:C2", updatedRows: 1, updatedCells: 3 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const initialCtx = createPipelineContext();
      const sheetsCtx: ExecutionContext = {
        ...initialCtx,
        nodeOutputs: {
          ...initialCtx.nodeOutputs,
          "node-transform-1": {
            operation: "add_field",
            formattedRow: ["2026-10-12T12:00:00.000Z", "Stay hungry, stay foolish.", "Steve Jobs"],
          },
        },
      };

      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 980, y: 160 });
      sheetsNode.data.config = {
        spreadsheetId: "test-sheet-id",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: "{{steps.node-transform-1.formattedRow}}",
      };

      const sheetsResult = await sheetsExecutor.execute(sheetsNode, {}, sheetsCtx);
      expect(sheetsResult.status).toBe("success");

      const values = (capturedRequestBody as { values?: unknown[][] } | null)?.values || [];
      expect(values).toHaveLength(1);
      expect(values[0]).toEqual(["2026-10-12T12:00:00.000Z", "Stay hungry, stay foolish.", "Steve Jobs"]);
    });

    it("handles direct array expression in Google Sheets rowValues config", async () => {
      let capturedRequestBody: { values?: unknown[][] } | null = null;

      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.body) {
          capturedRequestBody = JSON.parse(init.body as string);
        }
        return new Response(
          JSON.stringify({
            updates: { updatedRange: "Sheet1!A2:C2", updatedRows: 1, updatedCells: 3 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const sheetsCtx = createPipelineContext();
      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 980, y: 160 });
      sheetsNode.data.config = {
        spreadsheetId: "test-sheet-id",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: '["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "LOGGED"]',
      };

      const sheetsResult = await sheetsExecutor.execute(sheetsNode, {}, sheetsCtx);
      expect(sheetsResult.status).toBe("success");

      const values = (capturedRequestBody as { values?: unknown[][] } | null)?.values || [];
      expect(values).toHaveLength(1);
      expect(values[0][1]).toBe("Float like a butterfly, sting like a bee.");
      expect(values[0][2]).toBe("LOGGED");
    });

    it("runs cloned Starter 06 workflow end-to-end with TemplateCloner remapped node IDs", async () => {
      let capturedRequestBody: { values?: unknown[][] } | null = null;

      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        if (init?.body) {
          capturedRequestBody = JSON.parse(init.body as string);
        }
        return new Response(
          JSON.stringify({
            updates: { updatedRange: "Sheet1!A2:C2", updatedRows: 1, updatedCells: 3 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      // 1. Clone Starter 06 template using TemplateCloner
      const starter06 = STARTER_TEMPLATES[5];
      expect(starter06.id).toBe("starter-06-api-to-sheets-pipeline");
      const clonedWorkflow = TemplateCloner.cloneGraph(starter06.definition, "My Cloned Quote Pipeline");

      // Verify node IDs were remapped to n-cloned-...
      const httpNode = clonedWorkflow.nodes.find((n) => n.data.definitionId === "http-request")!;
      const transformNode = clonedWorkflow.nodes.find((n) => n.data.definitionId === "transform")!;
      const sheetsNode = clonedWorkflow.nodes.find((n) => n.data.definitionId === "google-sheets")!;

      expect(httpNode.id).toMatch(/^n-cloned-/);
      expect(transformNode.id).toMatch(/^n-cloned-/);
      expect(sheetsNode.id).toMatch(/^n-cloned-/);

      // Verify TemplateCloner remapped the references inside configs
      const transformVal = String((transformNode.data.config as Record<string, unknown>).value);
      expect(transformVal).toContain(httpNode.id);
      expect(transformVal).not.toContain("node-http-1");

      const sheetsRowValues = String((sheetsNode.data.config as Record<string, unknown>).rowValues);
      expect(sheetsRowValues).toContain(transformNode.id);
      expect(sheetsRowValues).not.toContain("node-transform-1");

      // 2. Simulate execution: HTTP node returns response
      const executionCtx: ExecutionContext = {
        executionId: "exec-cloned-pipeline",
        workflowId: "wf-cloned-pipeline",
        workflowVersionId: "ver-cloned-pipeline",
        versionNumber: 1,
        input: {},
        nodeOutputs: {
          [httpNode.id]: {
            status: 200,
            data: {
              id: 288,
              quote: "Float like a butterfly, sting like a bee.",
              author: "Muhammad Ali",
            },
            quoteData: {
              id: 288,
              quote: "Float like a butterfly, sting like a bee.",
              author: "Muhammad Ali",
            },
          },
        },
        nodeInputs: {},
        nodeStatuses: {
          [httpNode.id]: "success",
        },
        metadata: {
          nodeTypes: {
            [httpNode.id]: "http-request",
            [transformNode.id]: "transform",
            [sheetsNode.id]: "google-sheets",
          },
        },
      };

      // 3. Execute cloned Transform node
      const transformExecutor = getExecutor("transform")!;
      const transformResult = await transformExecutor.execute(transformNode, {}, executionCtx);
      expect(transformResult.status).toBe("success");

      const formattedRow = transformResult.output?.formattedRow as unknown[];
      expect(Array.isArray(formattedRow)).toBe(true);
      expect(formattedRow[1]).toBe("Float like a butterfly, sting like a bee.");
      expect(formattedRow[2]).toBe("Muhammad Ali");

      // 4. Update execution context with Transform output
      executionCtx.nodeOutputs[transformNode.id] = transformResult.output as Record<string, unknown>;
      executionCtx.nodeStatuses[transformNode.id] = "success";

      // 5. Execute cloned Google Sheets node
      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsResult = await sheetsExecutor.execute(sheetsNode, {}, executionCtx);
      expect(sheetsResult.status).toBe("success");

      // Verify Google Sheets received the resolved array from the cloned transform node
      const values = (capturedRequestBody as { values?: unknown[][] } | null)?.values || [];
      expect(values).toHaveLength(1);
      expect(values[0]).toHaveLength(3);
      expect(values[0][1]).toBe("Float like a butterfly, sting like a bee.");
      expect(values[0][2]).toBe("Muhammad Ali");
    });

    it("authenticates via CredentialService and appends row to Google Sheets", async () => {
      delete process.env.GOOGLE_API_KEY;

      vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
        secret: "ya29.a0AxM35-mock-oauth-token",
        metadata: null,
      });

      let capturedAuthHeader: string | null = null;
      globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init?: RequestInit) => {
        capturedAuthHeader = (init?.headers as Record<string, string>)?.["Authorization"] || null;
        return new Response(
          JSON.stringify({
            updates: { updatedRange: "Sheet1!A2:C2", updatedRows: 1, updatedCells: 3 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      });

      const sheetsCtx: ExecutionContext = {
        executionId: "exec-cred-test",
        workflowId: "wf-cred-test",
        workflowVersionId: "ver-cred-test",
        versionNumber: 1,
        input: {},
        nodeOutputs: {
          "node-transform-1": {
            operation: "add_field",
            formattedRow: ["2026-10-12T12:00:00.000Z", "Float like a butterfly", "Muhammad Ali"],
          },
        },
        nodeInputs: {},
        nodeStatuses: {},
        metadata: {},
      };

      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 0, y: 0 });
      sheetsNode.data.config = {
        credentialId: "cred-google-oauth-123",
        spreadsheetId: "test-sheet-id",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: "{{$steps.node-transform-1.formattedRow}}",
      };

      const result = await sheetsExecutor.execute(sheetsNode, {}, sheetsCtx);
      expect(result.status).toBe("success");
      expect(capturedAuthHeader).toBe("Bearer ya29.a0AxM35-mock-oauth-token");
      expect(result.output?.rowValues).toEqual(["2026-10-12T12:00:00.000Z", "Float like a butterfly", "Muhammad Ali"]);
    });
  });

  describe("3. Unit Tests: Expression Resolution & Property Path Lookups", () => {
    it("resolveExpression correctly replaces {{$steps...}} and {{steps...}} in text strings", () => {
      const ctx = createPipelineContext();
      const exprCtx = buildExecutionExpressionContext(ctx);

      const template = "Quote #{{$steps.node-http-1.data.id}}: {{$steps.node-http-1.data.quote}} by {{$steps.node-http-1.data.author}}";
      const resolved = resolveExpression(template, exprCtx);

      expect(resolved).toBe("Quote #288: Float like a butterfly, sting like a bee. by Muhammad Ali");
    });

    it("resolveValue preserves types for exact expressions", () => {
      const ctx = createPipelineContext();
      const exprCtx = buildExecutionExpressionContext(ctx);

      expect(resolveValue("{{$steps.node-http-1.data.id}}", exprCtx)).toBe(288);
      expect(resolveValue("{{$steps.node-http-1.data.quote}}", exprCtx)).toBe("Float like a butterfly, sting like a bee.");
      expect(typeof resolveValue("{{$timestamp}}", exprCtx)).toBe("string");
    });

    it("resolveValue recursively resolves nested objects", () => {
      const ctx = createPipelineContext();
      const exprCtx = buildExecutionExpressionContext(ctx);

      const inputObj = {
        id: "{{$steps.node-http-1.data.id}}",
        author: "{{$steps.node-http-1.data.author}}",
        meta: {
          timestamp: "{{$timestamp}}",
          quote: "{{$steps.node-http-1.data.quote}}",
        },
      };

      const resolved = resolveValue(inputObj, exprCtx) as typeof inputObj;
      expect(resolved.id).toBe(288);
      expect(resolved.author).toBe("Muhammad Ali");
      expect(resolved.meta.quote).toBe("Float like a butterfly, sting like a bee.");
      expect(typeof resolved.meta.timestamp).toBe("string");
    });
  });

  describe("4. Regression Suite: Quote Logger Variable Interpolation & Empty Row Rejection", () => {
    it("fails with GOOGLE_SHEETS_EMPTY_ROW when quote and author resolve to empty strings with only timestamp", async () => {
      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 0, y: 0 });
      sheetsNode.data.config = {
        spreadsheetId: "test-sheet-id",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: '["{{$steps.nonexistent.quote}}", "{{$steps.nonexistent.author}}", "{{$timestamp}}"]',
      };

      const ctx = createPipelineContext();
      const result = await sheetsExecutor.execute(sheetsNode, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("GOOGLE_SHEETS_EMPTY_ROW");
      expect(result.error).toContain("Row values contain only empty strings or timestamps");
    });

    it("fails with GOOGLE_SHEETS_EMPTY_ROW when configured rowValues expression resolves to empty string", async () => {
      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 0, y: 0 });
      sheetsNode.data.config = {
        spreadsheetId: "test-sheet-id",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: "{{$steps.node-transform-missing.formattedRow}}",
      };

      const ctx = createPipelineContext();
      const result = await sheetsExecutor.execute(sheetsNode, {}, ctx);

      expect(result.status).toBe("failed");
      expect(result.error).toContain("GOOGLE_SHEETS_EMPTY_ROW");
    });

    it("resolves steps.node-http-1.quote and quote directly because dataSub is unpacked", () => {
      const ctx = createPipelineContext();
      const exprCtx = buildExecutionExpressionContext(ctx);

      // Direct access without .data prefix
      expect(resolveValue("{{$steps.node-http-1.quote}}", exprCtx)).toBe("Float like a butterfly, sting like a bee.");
      expect(resolveValue("{{steps.node-http-1.author}}", exprCtx)).toBe("Muhammad Ali");
      expect(resolveValue("{{quote}}", exprCtx)).toBe("Float like a butterfly, sting like a bee.");
      expect(resolveValue("{{author}}", exprCtx)).toBe("Muhammad Ali");
    });

    it("resolves steps.node-transform-1.result.data.quote when Transform output nests result.data", () => {
      const ctx = createPipelineContext({
        nodeOutputs: {
          "node-transform-1": {
            operation: "add_field",
            result: {
              data: {
                quote: "Simplicity is the ultimate sophistication.",
                author: "Leonardo da Vinci",
              },
            },
          },
        },
      });
      const exprCtx = buildExecutionExpressionContext(ctx);

      expect(resolveValue("{{steps.node-transform-1.result.data.quote}}", exprCtx)).toBe("Simplicity is the ultimate sophistication.");
      expect(resolveValue("{{$steps.node-transform-1.result.data.author}}", exprCtx)).toBe("Leonardo da Vinci");
      // Also works with unpacked shortcuts
      expect(resolveValue("{{steps.node-transform-1.quote}}", exprCtx)).toBe("Simplicity is the ultimate sophistication.");
    });

    it("end-to-end full row verification asserts Google Sheets receives valid quote, author, and timestamp", async () => {
      let appendedValues: unknown[][] = [];
      globalThis.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
        if (url.includes("sheets.googleapis.com")) {
          const body = JSON.parse(init?.body as string);
          appendedValues = body.values || [];
          return new Response(
            JSON.stringify({
              updates: { updatedRange: "Sheet1!A2:C2", updatedRows: 1, updatedCells: 3 },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        return new Response(JSON.stringify({ error: "not found" }), { status: 404 });
      });

      // 1. Transform executes with real HTTP output in context
      const transformExecutor = getExecutor("transform")!;
      const transformNode = createWorkflowNode("transform", { x: 680, y: 160 });
      transformNode.id = "node-transform-1";
      transformNode.data.config = {
        operation: "add_field",
        key: "formattedRow",
        value: '["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "{{$steps.node-http-1.data.author}}"]',
      };

      const pipelineCtx = createPipelineContext();
      // Simulate root input having an empty data field (test run trigger payload)
      const transformInput = { data: {} };
      const transformRes = await transformExecutor.execute(transformNode, transformInput, pipelineCtx);
      expect(transformRes.status).toBe("success");

      // 2. Pass transform output to Sheets node
      pipelineCtx.nodeOutputs["node-transform-1"] = transformRes.output as Record<string, unknown>;
      pipelineCtx.nodeStatuses["node-transform-1"] = "success";

      const sheetsExecutor = getExecutor("google-sheets")!;
      const sheetsNode = createWorkflowNode("google-sheets", { x: 980, y: 160 });
      sheetsNode.data.config = {
        spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
        sheetName: "Sheet1",
        operation: "append_row",
        rowValues: "{{steps.node-transform-1.formattedRow}}",
      };

      const sheetsRes = await sheetsExecutor.execute(sheetsNode, {}, pipelineCtx);
      expect(sheetsRes.status).toBe("success");
      expect(sheetsRes.output?.appended).toBe(true);

      // 3. Verify appended row contains API quote, author, and ISO timestamp
      expect(appendedValues).toHaveLength(1);
      const row = appendedValues[0];
      expect(row).toHaveLength(3);

      // Column 0: Timestamp
      expect(typeof row[0]).toBe("string");
      expect(row[0]).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      // Column 1: Quote (non-empty, exactly from HTTP node)
      expect(row[1]).toBe("Float like a butterfly, sting like a bee.");

      // Column 2: Author (non-empty, exactly from HTTP node)
      expect(row[2]).toBe("Muhammad Ali");
    });
  });
});
