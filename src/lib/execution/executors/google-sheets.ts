import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression, resolveValue, buildExecutionExpressionContext } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";
import { exchangeServiceAccountToken } from "@/lib/security/service-account";

export const GoogleSheetsExecutor: NodeExecutor = {
  definitionId: "google-sheets",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const exprContext = buildExecutionExpressionContext(context, input);

    const config = (node.data.config as Record<string, unknown>) ?? {};
    const spreadsheetIdRaw = (config.spreadsheetId as string) || (input.spreadsheetId as string) || "";
    const sheetNameRaw = (config.sheetName as string) || (input.sheetName as string) || "Sheet1";
    const rangeRaw = (config.range as string) || (input.range as string) || "A1:Z100";
    const operation = (config.operation as string) || "read_rows";
    const rowValuesRaw = config.rowValues ?? input.rowValues ?? "";

    const spreadsheetId = resolveExpression(spreadsheetIdRaw, exprContext);
    const sheetName = resolveExpression(sheetNameRaw, exprContext);
    const range = resolveExpression(rangeRaw, exprContext);
    const resolvedRowValues = resolveValue(rowValuesRaw, exprContext);

    if (!spreadsheetId || !spreadsheetId.trim()) {
      return {
        status: "failed",
        error: "GOOGLE_SHEETS_MISSING_PARAM: 'spreadsheetId' is required in node configuration.",
      };
    }

    let secretStr = "";
    let credProvider = "";
    const credentialId = (config.credentialId as string) || (input.credentialId as string) || "";
    if (credentialId) {
      try {
        const resolved = await CredentialService.getDecryptedCredential(
          credentialId,
          context.userId,
          context.organizationId,
        );
        if (resolved?.secret) {
          secretStr = resolved.secret.trim();
          credProvider = (resolved.provider || "").toLowerCase().trim();
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: "failed",
          error: `GOOGLE_SHEETS_REQUEST_FAILED: Credential retrieval failed - ${msg}`,
        };
      }
    }

    if (!secretStr) {
      secretStr = (process.env.GOOGLE_SHEETS_TOKEN || process.env.GOOGLE_API_KEY || "").trim();
    }

    if (!secretStr) {
      return {
        status: "failed",
        error: "GOOGLE_SHEETS_CREDENTIAL_NOT_CONFIGURED: Google Sheets API key or access token is missing. Please select a valid credential.",
      };
    }

    // Determine authentication mode (API Key vs Bearer Access Token vs Service Account)
    let apiKey: string | null = null;
    let accessToken: string | null = null;
    let isServiceAccount =
      credProvider === "google-sheets-service-account" ||
      credProvider === "google-service-account";
    let serviceAccountAuthError: string | null = null;

    if (secretStr.startsWith("{")) {
      try {
        const parsed = JSON.parse(secretStr);
        if (parsed.access_token || parsed.accessToken) {
          accessToken = (parsed.access_token || parsed.accessToken) as string;
        }
        if (parsed.api_key || parsed.apiKey) {
          apiKey = (parsed.api_key || parsed.apiKey) as string;
        }
        if (parsed.client_email && parsed.private_key) {
          isServiceAccount = true;
          const tokenRes = await exchangeServiceAccountToken({
            client_email: String(parsed.client_email),
            private_key: String(parsed.private_key),
          });
          if (tokenRes.success && tokenRes.accessToken) {
            accessToken = tokenRes.accessToken;
          } else {
            serviceAccountAuthError = tokenRes.error || "Token exchange failed";
          }
        } else if (isServiceAccount) {
          serviceAccountAuthError = "Service account JSON is missing required 'client_email' or 'private_key' field.";
        }
        if (parsed.secret) {
          const subSecret = String(parsed.secret).trim();
          if (subSecret.startsWith("AIza")) apiKey = subSecret;
          else if (subSecret.startsWith("Bearer ")) accessToken = subSecret.replace(/^Bearer\s+/i, "");
          else accessToken = subSecret;
        }
      } catch (err: unknown) {
        if (isServiceAccount) {
          serviceAccountAuthError = `Malformed service account JSON: ${err instanceof Error ? err.message : String(err)}`;
        }
      }
    } else if (isServiceAccount) {
      serviceAccountAuthError = "Credential value is not valid JSON.";
    }

    if (isServiceAccount && !accessToken) {
      return {
        status: "failed",
        error: `GOOGLE_SHEETS_AUTH_FAILED: Google Service Account authentication failed. ${serviceAccountAuthError || "Unable to acquire OAuth token."}`,
      };
    }

    if (!apiKey && !accessToken) {
      if (secretStr.startsWith("AIza")) {
        apiKey = secretStr;
      } else if (secretStr.startsWith("Bearer ")) {
        accessToken = secretStr.replace(/^Bearer\s+/i, "").trim();
      } else if (secretStr.startsWith("ya29.")) {
        accessToken = secretStr.trim();
      } else {
        apiKey = secretStr;
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (accessToken) {
      headers["Authorization"] = `Bearer ${accessToken.replace(/^Bearer\s+/i, "")}`;
    }

    try {
      if (operation === "append_row") {
        const hasConfiguredRowValues = Boolean(
          typeof config.rowValues === "string" ? config.rowValues.trim() : config.rowValues,
        );

        if (
          hasConfiguredRowValues &&
          (resolvedRowValues === "" ||
            resolvedRowValues === null ||
            resolvedRowValues === undefined ||
            (Array.isArray(resolvedRowValues) && resolvedRowValues.length === 0))
        ) {
          return {
            status: "failed",
            error: "GOOGLE_SHEETS_EMPTY_ROW: Configured rowValues expression resolved to empty value.",
          };
        }

        let valuesArray: unknown[] = [];
        if (Array.isArray(resolvedRowValues)) {
          if (resolvedRowValues.length === 1 && Array.isArray(resolvedRowValues[0])) {
            valuesArray = resolvedRowValues[0];
          } else {
            valuesArray = resolvedRowValues;
          }
        } else if (resolvedRowValues && typeof resolvedRowValues === "object") {
          valuesArray = Object.values(resolvedRowValues as Record<string, unknown>);
        } else if (typeof resolvedRowValues === "string" && resolvedRowValues.trim()) {
          const trimmed = resolvedRowValues.trim();
          if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
              valuesArray = JSON.parse(trimmed);
            } catch {
              valuesArray = trimmed.split(",").map((s) => s.trim());
            }
          } else if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
            try {
              const obj = JSON.parse(trimmed);
              valuesArray = Object.values(obj);
            } catch {
              valuesArray = [trimmed];
            }
          } else {
            valuesArray = trimmed.split(",").map((s) => s.trim());
          }
        } else if (Array.isArray(input.rowValues)) {
          valuesArray = input.rowValues;
        } else if (Array.isArray(input.rows)) {
          valuesArray = input.rows;
        } else if (input.body || input.text || input.message) {
          valuesArray = [input.body || input.text || input.message];
        } else {
          valuesArray = [new Date().toISOString(), "Neuraloop Execution", JSON.stringify(input)];
        }

        if (!Array.isArray(valuesArray)) {
          valuesArray = [valuesArray];
        } else if (valuesArray.length === 1 && Array.isArray(valuesArray[0])) {
          valuesArray = valuesArray[0];
        }

        const isIsoTimestamp = (val: unknown): boolean =>
          typeof val === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val.trim());

        const nonTimestampNonEmptyValues = valuesArray.filter((v) => {
          if (v === null || v === undefined) return false;
          const s = String(v).trim();
          if (!s) return false;
          if (isIsoTimestamp(s)) return false;
          return true;
        });

        const isRowEmpty =
          valuesArray.length === 0 ||
          valuesArray.every((v) => v === null || v === undefined || String(v).trim() === "") ||
          (hasConfiguredRowValues && valuesArray.length > 1 && nonTimestampNonEmptyValues.length === 0);

        if (isRowEmpty) {
          console.warn(
            `[GoogleSheetsExecutor] Rejected empty row: spreadsheetId=${spreadsheetId}, sheetName=${sheetName}, rowLength=${valuesArray.length}, nonTimestampCount=${nonTimestampNonEmptyValues.length}`,
          );
          return {
            status: "failed",
            error:
              "GOOGLE_SHEETS_EMPTY_ROW: Row values contain only empty strings or timestamps with no payload data. Please verify expression mappings.",
          };
        }

        console.log(
          `[GoogleSheetsExecutor] append_row: spreadsheetId=${spreadsheetId}, sheetName=${sheetName}, rowLength=${valuesArray.length}, nonTimestampCount=${nonTimestampNonEmptyValues.length}, valueTypes=${JSON.stringify(valuesArray.map((v) => typeof v))}`,
        );

        let appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(sheetName)}:append?valueInputOption=USER_ENTERED`;
        if (apiKey && !accessToken) {
          appendUrl += `&key=${encodeURIComponent(apiKey)}`;
        }

        const res = await fetch(appendUrl, {
          method: "POST",
          headers,
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
            updatedRange: data.updates?.updatedRange || `${sheetName}!A1`,
            updatedRows: data.updates?.updatedRows || 1,
            updatedCells: data.updates?.updatedCells || valuesArray.length,
            rowValues: valuesArray,
          },
        };
      } else {
        // Default: read_rows
        const fullRange = range ? `${sheetName}!${range}` : sheetName;
        let readUrl = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${encodeURIComponent(fullRange)}`;
        if (apiKey && !accessToken) {
          readUrl += `?key=${encodeURIComponent(apiKey)}`;
        }

        const res = await fetch(readUrl, {
          method: "GET",
          headers,
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
            range: data.range || fullRange,
            totalRows: rows.length,
            rowCount: rows.length,
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
