import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoogleSheetsExecutor } from "../executors/google-sheets";
import { GoogleSheetsConfigSchema } from "@/lib/workflow/config-schemas";
import { CredentialService, encryptSecret } from "@/lib/security/credential-service";
import { prisma } from "@/lib/prisma";
import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext } from "../types";

describe("Google Sheets Executor Unit Test Suite", () => {
  const dummyContext: ExecutionContext = {
    workflowId: "wf-1",
    workflowVersionId: "ver-1",
    versionNumber: 1,
    executionId: "exec-1",
    userId: "user-1",
    input: {},
    nodeInputs: {},
    nodeOutputs: {},
    nodeStatuses: {},
    metadata: {},
  };

  const createSheetsNode = (config: Record<string, unknown>): WorkflowNode => ({
    id: "node-gs-1",
    type: "neuraloop-node",
    position: { x: 0, y: 0 },
    data: {
      label: "Google Sheets Test",
      description: "Google Sheets Test Node",
      definitionId: "google-sheets",
      category: "action",
      config,
    },
  });

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_SHEETS_TOKEN;
  });

  it("1. Config Schema Validation", () => {
    const validConfig = GoogleSheetsConfigSchema.parse({
      credentialId: "cred-123",
      spreadsheetId: "sheet-abc-123",
      sheetName: "Sheet1",
      range: "A1:C10",
      operation: "read_rows",
      rowValues: '["Val1", "Val2"]',
    });

    expect(validConfig.spreadsheetId).toBe("sheet-abc-123");
    expect(validConfig.operation).toBe("read_rows");

    const defaultConfig = GoogleSheetsConfigSchema.parse({});
    expect(defaultConfig.sheetName).toBe("Sheet1");
    expect(defaultConfig.range).toBe("A1:Z100");
    expect(defaultConfig.operation).toBe("read_rows");
  });

  it("2. Missing Spreadsheet ID Error", async () => {
    const node = createSheetsNode({ credentialId: "cred-123" });
    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_MISSING_PARAM");
  });

  it("3. Missing Credential Error", async () => {
    const node = createSheetsNode({ spreadsheetId: "sheet-123" });
    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_CREDENTIAL_NOT_CONFIGURED");
  });

  it("4. Read Rows Success with API Key", async () => {
    process.env.GOOGLE_API_KEY = "AIzaSyTestKey123";
    const node = createSheetsNode({
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      sheetName: "Sheet1",
      range: "A1:C2",
      operation: "read_rows",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      expect(urlStr).toContain("key=AIzaSyTestKey123");
      expect(urlStr).toContain("Sheet1");
      return {
        ok: true,
        status: 200,
        json: async () => ({
          range: "Sheet1!A1:C2",
          values: [
            ["Name", "Email", "Status"],
            ["Raj", "raj@example.com", "Active"],
          ],
        }),
      } as Response;
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("success");
    expect(result.output?.rowCount).toBe(2);
    expect(result.output?.totalRows).toBe(2);
    expect(result.output?.header).toEqual(["Name", "Email", "Status"]);
    expect(result.output?.rows).toHaveLength(2);
  });

  it("5. Read Rows Success with OAuth Access Token Credential", async () => {
    const node = createSheetsNode({
      credentialId: "cred-oauth-1",
      spreadsheetId: "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
      sheetName: "DataSheet",
      range: "A1:B5",
      operation: "read_rows",
    });

    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "ya29.a0AxM35-test-oauth-token",
      metadata: null,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      expect(urlStr).not.toContain("key=");
      const headers = init?.headers as Record<string, string>;
      expect(headers?.["Authorization"]).toBe("Bearer ya29.a0AxM35-test-oauth-token");

      return {
        ok: true,
        status: 200,
        json: async () => ({
          range: "DataSheet!A1:B5",
          values: [
            ["Item", "Price"],
            ["Widget A", "$10"],
          ],
        }),
      } as Response;
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("success");
    expect(result.output?.sheetName).toBe("DataSheet");
    expect(result.output?.totalRows).toBe(2);
  });

  it("6. Append Row Success with Variable Resolution", async () => {
    const node = createSheetsNode({
      credentialId: "cred-oauth-1",
      spreadsheetId: "{{input.sheetId}}",
      sheetName: "Leads",
      operation: "append_row",
      rowValues: '["{{input.name}}", "{{input.email}}", "{{steps.ai.status}}"]',
    });

    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "ya29.test-token",
      metadata: null,
    });

    let postedBody: any = null;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_url: string | URL | Request, init?: RequestInit) => {
      postedBody = JSON.parse(init?.body as string);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          spreadsheetId: "sheet-target-99",
          updates: {
            updatedRange: "Leads!A4:C4",
            updatedRows: 1,
            updatedCells: 3,
          },
        }),
      } as Response;
    });

    const input = {
      sheetId: "sheet-target-99",
      name: "John Doe",
      email: "john@example.com",
    };

    const contextWithStepOutputs: ExecutionContext = {
      ...dummyContext,
      nodeOutputs: {
        ai: { status: "QUALIFIED" },
      },
    };

    const result = await GoogleSheetsExecutor.execute(node, input, contextWithStepOutputs);

    expect(result.status).toBe("success");
    expect(result.output?.appended).toBe(true);
    expect(result.output?.updatedRange).toBe("Leads!A4:C4");
    expect(postedBody?.values?.[0]).toEqual(["John Doe", "john@example.com", "QUALIFIED"]);
  });

  it("7. Google API Error Handling (Read Failure)", async () => {
    process.env.GOOGLE_API_KEY = "AIzaInvalidKey";
    const node = createSheetsNode({
      spreadsheetId: "non-existent-sheet",
      sheetName: "Sheet1",
      operation: "read_rows",
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: { message: "Requested entity was not found." },
        }),
      } as Response;
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_READ_FAILED (HTTP 404)");
    expect(result.error).toContain("Requested entity was not found.");
  });

  it("8. Google API Error Handling (Append Failure)", async () => {
    process.env.GOOGLE_API_KEY = "AIzaInvalidKey";
    const node = createSheetsNode({
      spreadsheetId: "restricted-sheet",
      sheetName: "Sheet1",
      operation: "append_row",
      rowValues: '["Test"]',
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return {
        ok: false,
        status: 403,
        json: async () => ({
          error: { message: "The caller does not have permission" },
        }),
      } as Response;
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_APPEND_FAILED (HTTP 403)");
    expect(result.error).toContain("caller does not have permission");
  });

  it("9. Authorization Boundary: Rejection of ID-Only Lookup without User/Org Context", async () => {
    const unauthenticatedContext: ExecutionContext = {
      ...dummyContext,
      userId: null,
      organizationId: null,
    };

    const node = createSheetsNode({
      credentialId: "cred-unauth-1",
      spreadsheetId: "sheet-target-1",
    });

    const findFirstSpy = vi.spyOn(prisma.credential, "findFirst");

    const directLookup = await CredentialService.getDecryptedCredential("cred-unauth-1", null, null);
    expect(directLookup).toBeNull();
    // Verify no DB query was executed without authorization context
    expect(findFirstSpy).not.toHaveBeenCalled();

    const result = await GoogleSheetsExecutor.execute(node, {}, unauthenticatedContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_CREDENTIAL_NOT_CONFIGURED");
  });

  it("10. Authorization Boundary: Strict Cross-User Isolation Prevents Access", async () => {
    const attackingUserContext: ExecutionContext = {
      ...dummyContext,
      userId: "user-attacker",
      organizationId: null,
    };

    const node = createSheetsNode({
      credentialId: "cred-victim",
      spreadsheetId: "sheet-target-1",
    });

    const findFirstSpy = vi.spyOn(prisma.credential, "findFirst").mockResolvedValue(null);

    const result = await GoogleSheetsExecutor.execute(node, {}, attackingUserContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_CREDENTIAL_NOT_CONFIGURED");

    // Must query with strict authorization condition and never bare { where: { id } }
    expect(findFirstSpy).toHaveBeenCalledWith({
      where: {
        id: "cred-victim",
        OR: [{ userId: "user-attacker" }],
      },
    });
  });

  it("11. Authorization Boundary: Organization Workspace Credential Access Allowed", async () => {
    const orgMemberContext: ExecutionContext = {
      ...dummyContext,
      userId: "user-member",
      organizationId: "org-engineering",
    };

    const encrypted = encryptSecret("ya29.org-shared-token");
    const findFirstSpy = vi.spyOn(prisma.credential, "findFirst").mockResolvedValue({
      id: "cred-org-shared",
      userId: "user-admin",
      organizationId: "org-engineering",
      name: "Org Google Sheet Token",
      provider: "google-sheets",
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      metadata: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        range: "Sheet1!A1:B2",
        values: [["Col1", "Col2"]],
      }),
    } as Response);

    const node = createSheetsNode({
      credentialId: "cred-org-shared",
      spreadsheetId: "sheet-target-1",
      sheetName: "Sheet1",
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, orgMemberContext);
    expect(result.status).toBe("success");
    expect(findFirstSpy).toHaveBeenCalledWith({
      where: {
        id: "cred-org-shared",
        OR: [{ organizationId: "org-engineering" }, { userId: "user-member" }],
      },
    });
  });

  it("12. Credential Lookup Error Handling: Connection Pool Timeout Gracefully Handled", async () => {
    const poolTimeoutError = new Error(
      "Timed out fetching a new connection from the connection pool. Current connection pool timeout: 10, connection limit: 5.",
    );
    vi.spyOn(CredentialService, "getDecryptedCredential").mockRejectedValue(poolTimeoutError);

    const node = createSheetsNode({
      credentialId: "cred-pool-exhausted",
      spreadsheetId: "sheet-target-1",
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_REQUEST_FAILED");
    expect(result.error).toContain("Timed out fetching a new connection from the connection pool");
  });

  it("13. Concurrent Credential Lookup & Execution Behavior", async () => {
    const encrypted = encryptSecret("ya29.concurrent-test-token");
    vi.spyOn(prisma.credential, "findFirst").mockResolvedValue({
      id: "cred-concurrent",
      userId: "user-1",
      organizationId: null,
      name: "Concurrent Test Token",
      provider: "google-sheets",
      encryptedValue: encrypted.encryptedValue,
      iv: encrypted.iv,
      metadata: null,
      lastUsedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        range: "Sheet1!A1:B2",
        values: [["Row1"]],
      }),
    } as Response);

    const nodes = Array.from({ length: 5 }, (_, i) =>
      createSheetsNode({
        credentialId: "cred-concurrent",
        spreadsheetId: `sheet-${i}`,
      }),
    );

    const results = await Promise.all(
      nodes.map((node) => GoogleSheetsExecutor.execute(node, {}, dummyContext)),
    );

    expect(results).toHaveLength(5);
    results.forEach((res) => {
      expect(res.status).toBe("success");
    });
  });

  it("14. Service Account Credential Token Exchange Handling", async () => {
    const { generateKeyPairSync } = await import("crypto");
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const serviceAccountJson = JSON.stringify({
      type: "service_account",
      project_id: "test-project",
      client_email: "test-sa@test-project.iam.gserviceaccount.com",
      private_key: privateKey,
    });

    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: serviceAccountJson,
      metadata: null,
    });

    let tokenExchangeRequested = false;
    let sheetsApiAuthorized = false;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = String(url);
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        tokenExchangeRequested = true;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: "ya29.minted-service-account-token",
            expires_in: 3600,
            token_type: "Bearer",
          }),
        } as Response;
      }

      if (urlStr.includes("sheets.googleapis.com")) {
        const authHeader = (init?.headers as Record<string, string>)?.[
          "Authorization"
        ];
        if (authHeader === "Bearer ya29.minted-service-account-token") {
          sheetsApiAuthorized = true;
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            range: "Sheet1!A1:B1",
            values: [["HeaderA", "HeaderB"]],
          }),
        } as Response;
      }

      return { ok: false, status: 400, json: async () => ({}) } as Response;
    });

    const node = createSheetsNode({
      credentialId: "cred-sa-1",
      spreadsheetId: "test-sa-sheet",
      sheetName: "Sheet1",
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("success");
    expect(tokenExchangeRequested).toBe(true);
    expect(sheetsApiAuthorized).toBe(true);
    expect(result.output?.totalRows).toBe(1);
  });

  it("15. Service Account Rejects Failed Token Exchange Without Treating as API Key", async () => {
    const { generateKeyPairSync } = await import("crypto");
    const { privateKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    const serviceAccountJson = JSON.stringify({
      type: "service_account",
      project_id: "test-project",
      client_email: "test-sa@test-project.iam.gserviceaccount.com",
      private_key: privateKey,
    });

    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: serviceAccountJson,
      provider: "google-sheets-service-account",
      metadata: null,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async (url: string | URL | Request) => {
      const urlStr = String(url);
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return {
          ok: false,
          status: 401,
          json: async () => ({
            error: "invalid_client",
            error_description: "The OAuth client was not found.",
          }),
        } as Response;
      }
      // If executor tried to call sheets API with API key, it would reach here
      return { ok: true, status: 200, json: async () => ({ values: [] }) } as Response;
    });

    const node = createSheetsNode({
      credentialId: "cred-sa-fail",
      spreadsheetId: "test-sa-sheet",
      sheetName: "Sheet1",
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_AUTH_FAILED");
    expect(result.error).toContain("The OAuth client was not found");
  });

  it("16. Service Account Provider Rejects Non-JSON Value Without Silent API Key Fallback", async () => {
    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "not-a-valid-json-string",
      provider: "google-sheets-service-account",
      metadata: null,
    });

    const node = createSheetsNode({
      credentialId: "cred-sa-invalid",
      spreadsheetId: "test-sa-sheet",
      sheetName: "Sheet1",
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_AUTH_FAILED");
    expect(result.error).toContain("not valid JSON");
  });

  it("17. Accurate Google Sheets API Error Reporting (HTTP 404 Entity Not Found)", async () => {
    vi.spyOn(CredentialService, "getDecryptedCredential").mockResolvedValue({
      secret: "ya29.valid-oauth-token",
      provider: "google-sheets",
      metadata: null,
    });

    vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      return {
        ok: false,
        status: 404,
        json: async () => ({
          error: {
            code: 404,
            message: "Requested entity was not found.",
            status: "NOT_FOUND",
          },
        }),
      } as Response;
    });

    const node = createSheetsNode({
      credentialId: "cred-oauth-1",
      spreadsheetId: "1r9vcPd3hB9rqE45m3F7MymOUGhXAl1ssdcnP7pBlq7k",
      sheetName: "Sheet1",
    });

    const result = await GoogleSheetsExecutor.execute(node, {}, dummyContext);
    expect(result.status).toBe("failed");
    expect(result.error).toContain("GOOGLE_SHEETS_READ_FAILED (HTTP 404)");
    expect(result.error).toContain("Requested entity was not found.");
  });
});

