import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const GoogleSheetsExecutor: NodeExecutor = {
  definitionId: "google-sheets",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const spreadsheetIdRaw = (config.spreadsheetId as string) || (input.spreadsheetId as string) || "";
    const sheetNameRaw = (config.sheetName as string) || (input.sheetName as string) || "Sheet1";
    const rangeRaw = (config.range as string) || (input.range as string) || "A1:Z100";
    const operation = (config.operation as string) || "read_rows";
    const rowValuesRaw = (config.rowValues as string) || (input.rowValues as string) || "";

    const spreadsheetId = resolveExpression(spreadsheetIdRaw, { ...input, ...context.nodeOutputs });
    const sheetName = resolveExpression(sheetNameRaw, { ...input, ...context.nodeOutputs });
    const range = resolveExpression(rangeRaw, { ...input, ...context.nodeOutputs });
    const rowValues = resolveExpression(rowValuesRaw, { ...input, ...context.nodeOutputs });

    if (!spreadsheetId) {
      return {
        status: "failed",
        error: "GOOGLE_SHEETS_MISSING_PARAM: 'spreadsheetId' is required in node configuration.",
      };
    }

    let apiKeyOrToken = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SHEETS_TOKEN || "";
    if (config.credentialId) {
      const resolved = await CredentialService.getDecryptedCredential(config.credentialId as string, context.userId);
      if (resolved?.secret) {
        apiKeyOrToken = resolved.secret;
      }
    }

    if (!apiKeyOrToken || !apiKeyOrToken.trim()) {
      return {
        status: "failed",
        error: "GOOGLE_SHEETS_CREDENTIAL_NOT_CONFIGURED: Google Sheets API key or access token is missing. Please select a credential.",
      };
    }

    try {
      if (operation === "append_row") {
        let valuesArray: unknown[] = [];
        if (rowValues) {
          try {
            valuesArray = JSON.parse(rowValues);
            if (!Array.isArray(valuesArray)) valuesArray = [rowValues];
          } catch {
            valuesArray = rowValues.split(",").map((s) => s.trim());
          }
        } else if (Array.isArray(input.rowValues)) {
          valuesArray = input.rowValues;
        } else {
          valuesArray = [new Date().toISOString(), "Neuraloop Execution", JSON.stringify(input)];
        }

        const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED&key=${apiKeyOrToken}`;
        const res = await fetch(appendUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKeyOrToken.startsWith("ya29.") || apiKeyOrToken.startsWith("Bearer ")
              ? { Authorization: `Bearer ${apiKeyOrToken.replace("Bearer ", "")}` }
              : {}),
          },
          body: JSON.stringify({
            values: [valuesArray],
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          return {
            status: "failed",
            error: `GOOGLE_SHEETS_APPEND_FAILED (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data)}`,
          };
        }

        return {
          status: "success",
          output: {
            appended: true,
            spreadsheetId,
            sheetName,
            updatedRange: data.updates?.updatedRange,
            updatedRows: data.updates?.updatedRows || 1,
            rowValues: valuesArray,
          },
        };
      } else {
        // Default: read_rows
        const fullRange = `${sheetName}!${range}`;
        const readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(fullRange)}?key=${apiKeyOrToken}`;
        const res = await fetch(readUrl, {
          method: "GET",
          headers: {
            ...(apiKeyOrToken.startsWith("ya29.") || apiKeyOrToken.startsWith("Bearer ")
              ? { Authorization: `Bearer ${apiKeyOrToken.replace("Bearer ", "")}` }
              : {}),
          },
        });

        const data = await res.json();
        if (!res.ok) {
          return {
            status: "failed",
            error: `GOOGLE_SHEETS_READ_FAILED (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data)}`,
          };
        }

        const rows: unknown[][] = data.values || [];
        return {
          status: "success",
          output: {
            spreadsheetId,
            sheetName,
            range: data.range,
            totalRows: rows.length,
            rows,
            header: rows.length > 0 ? rows[0] : [],
          },
        };
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `GOOGLE_SHEETS_REQUEST_FAILED: ${errorMsg}`,
      };
    }
  },
};
