import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { validateUrlForSsrf } from "../ssrf";
import { buildExecutionExpressionContext, resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";
import { TokenRefreshService } from "@/lib/oauth/token-refresh-service";

const MAX_PAYLOAD_BYTES = 5 * 1024 * 1024; // 5 MB Payload Ceiling

export const HttpRequestExecutor: NodeExecutor = {
  definitionId: "http-request",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const method = ((config.method as string) ?? "GET").toUpperCase();
    const rawUrl = (config.url as string) ?? "";
    const authType = (config.authType as string) || (config.credentialId ? "vault" : "none");
    const responseType = (config.responseType as string) || "auto";
    const responseKey = ((config.responseKey as string) || "").trim();

    const timeoutMs = Math.min(Math.max(Number(config.timeout) || 10000, 1000), 60000);
    const retryCount = Math.min(Math.max(Number(config.retryCount) || 0, 0), 5);
    const retryDelayMs = Math.min(Math.max(Number(config.retryDelay) || 1000, 100), 10000);

    let credentialData: Record<string, string> | null = null;
    const credentialId = (config.credentialId as string) || "";
    if (credentialId) {
      try {
        const resolved = await CredentialService.getDecryptedCredential(credentialId, context.userId);
        if (resolved?.secret) {
          credentialData = { secret: resolved.secret, apiKey: resolved.secret };
        }
      } catch (err) {
        console.warn("Vault credential retrieval warning in HttpRequestExecutor:", err);
      }
    }

    const baseContext = buildExecutionExpressionContext(context, input);
    const contextData: Record<string, unknown> = {
      ...baseContext,
      credential: credentialData || {},
    };

    // 2. Resolve target URL
    const url = resolveExpression(rawUrl, contextData);
    if (!url || !url.trim()) {
      return {
        status: "failed",
        error: "NODE_CONFIG_INVALID: HTTP URL is required.",
      };
    }

    // 3. SSRF URL Validation
    const ssrfCheck = validateUrlForSsrf(url);
    if (!ssrfCheck.safe) {
      return {
        status: "failed",
        error: `SSRF_BLOCKED: ${ssrfCheck.error}`,
      };
    }

    // 4. Assemble Request Headers & Auth Credentials
    const headersObj: Record<string, string> = {};

    // Auth Assembly
    const connectionId = (config.connectionId as string) || credentialId;
    if (authType === "oauth_connection" && connectionId) {
      try {
        const validToken = await TokenRefreshService.getValidAccessToken(connectionId, context.userId || undefined);
        if (validToken) {
          headersObj["Authorization"] = `Bearer ${validToken}`;
        }
      } catch (err) {
        return {
          status: "failed",
          error: `OAUTH_AUTH_FAILED: ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    } else if (authType === "vault" && credentialData?.secret) {
      headersObj["Authorization"] = `Bearer ${credentialData.secret}`;
    } else if (authType === "bearer") {
      const token = resolveExpression((config.bearerToken as string) || "", contextData);
      if (token) headersObj["Authorization"] = `Bearer ${token}`;
    } else if (authType === "basic") {
      const user = resolveExpression((config.basicUsername as string) || "", contextData);
      const pass = resolveExpression((config.basicPassword as string) || "", contextData);
      if (user || pass) {
        const credString = `${user}:${pass}`;
        const base64 = typeof Buffer !== "undefined"
          ? Buffer.from(credString).toString("base64")
          : btoa(credString);
        headersObj["Authorization"] = `Basic ${base64}`;
      }
    } else if (authType === "custom_header") {
      const name = resolveExpression((config.customHeaderName as string) || "", contextData);
      const val = resolveExpression((config.customHeaderValue as string) || "", contextData);
      if (name) headersObj[name] = val;
    }

    // User Custom Headers
    if (Array.isArray(config.headers)) {
      for (const h of config.headers as Array<{ key: string; value: string }>) {
        if (h.key) {
          headersObj[h.key] = resolveExpression(h.value ?? "", contextData);
        }
      }
    }

    // 5. Assemble Query Parameters
    let targetUrl = url;
    const queryParams: Array<{ key: string; value: string }> = Array.isArray(config.queryParams) ? [...config.queryParams] : [];

    if (authType === "api_key" && config.apiKeyIn === "query") {
      const keyName = resolveExpression((config.apiKeyName as string) || "api_key", contextData);
      const keyVal = resolveExpression((config.apiKeyValue as string) || credentialData?.secret || "", contextData);
      if (keyName) {
        queryParams.push({ key: keyName, value: keyVal });
      }
    } else if (authType === "api_key" && config.apiKeyIn !== "query") {
      const keyName = resolveExpression((config.apiKeyName as string) || "X-API-Key", contextData);
      const keyVal = resolveExpression((config.apiKeyValue as string) || credentialData?.secret || "", contextData);
      if (keyName) {
        headersObj[keyName] = keyVal;
      }
    }

    if (queryParams.length > 0) {
      try {
        const parsed = new URL(targetUrl);
        for (const q of queryParams) {
          if (q.key) {
            parsed.searchParams.append(q.key, resolveExpression(q.value ?? "", contextData));
          }
        }
        targetUrl = parsed.toString();
      } catch (err) {
        return {
          status: "failed",
          error: `HTTP_URL_INVALID: Could not parse URL '${targetUrl}': ${err instanceof Error ? err.message : String(err)}`,
        };
      }
    }

    // 6. Assemble Request Body
    let bodyPayload: string | undefined = undefined;
    const bodyType = (config.bodyType as string) || "none";

    if (method !== "GET" && method !== "HEAD") {
      if (bodyType === "json" && config.body) {
        bodyPayload = resolveExpression(config.body as string, contextData);
        if (!headersObj["content-type"] && !headersObj["Content-Type"]) {
          headersObj["Content-Type"] = "application/json";
        }
      } else if (bodyType === "form_data" && Array.isArray(config.formData) && config.formData.length > 0) {
        const formParams = new URLSearchParams();
        for (const f of config.formData as Array<{ key: string; value: string }>) {
          if (f.key) {
            formParams.append(f.key, resolveExpression(f.value ?? "", contextData));
          }
        }
        bodyPayload = formParams.toString();
        if (!headersObj["content-type"] && !headersObj["Content-Type"]) {
          headersObj["Content-Type"] = "application/x-www-form-urlencoded";
        }
      } else if (bodyType === "raw" && (config.rawBody || config.body)) {
        bodyPayload = resolveExpression((config.rawBody as string) || (config.body as string), contextData);
      }
    }

    // 7. Retry Loop with Timeout & 5 MB Payload Ceiling Protection
    let attemptsLeft = 1 + retryCount;
    let lastError = "";
    let lastResult: NodeExecutionResult | null = null;

    while (attemptsLeft > 0) {
      attemptsLeft--;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      const startTime = Date.now();

      try {
        const response = await fetch(targetUrl, {
          method,
          headers: headersObj,
          body: bodyPayload,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const duration = Date.now() - startTime;
        const contentType = response.headers.get("content-type") || "";

        // Check Content-Length header payload ceiling before reading stream
        const contentLengthHeader = response.headers.get("content-length");
        if (contentLengthHeader && parseInt(contentLengthHeader, 10) > MAX_PAYLOAD_BYTES) {
          return {
            status: "failed",
            error: `HTTP_PAYLOAD_TOO_LARGE: Response size exceeds maximum allowed 5 MB ceiling limit (${contentLengthHeader} bytes)`,
          };
        }

        const rawText = await response.text();
        if (rawText.length > MAX_PAYLOAD_BYTES) {
          return {
            status: "failed",
            error: `HTTP_PAYLOAD_TOO_LARGE: Response string size exceeds 5 MB ceiling limit (${rawText.length} bytes)`,
          };
        }

        let responseData: unknown = rawText;
        if (responseType === "json") {
          try {
            responseData = JSON.parse(rawText);
          } catch {
            responseData = rawText;
          }
        } else if (responseType === "auto") {
          if (contentType.includes("application/json") || rawText.trim().startsWith("{") || rawText.trim().startsWith("[")) {
            try {
              responseData = JSON.parse(rawText);
            } catch {
              responseData = rawText;
            }
          }
        }

        const outputData: Record<string, unknown> = {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData,
          duration,
        };

        if (responseKey) {
          outputData[responseKey] = responseData;
        }

        if (!response.ok) {
          const is5xx = response.status >= 500 && response.status < 600;
          lastError = `HTTP_REQUEST_FAILED: Returned status code ${response.status}`;
          lastResult = {
            status: "failed",
            error: lastError,
            output: outputData,
            metrics: {
              url: targetUrl,
              method,
              statusCode: response.status,
              responseTime: duration,
              responseSize: rawText.length,
            },
          };

          if (is5xx && attemptsLeft > 0) {
            await new Promise((res) => setTimeout(res, retryDelayMs));
            continue;
          }
          return lastResult!;
        }

        return {
          status: "success",
          output: outputData,
          metrics: {
            url: targetUrl,
            method,
            statusCode: response.status,
            responseTime: duration,
            responseSize: rawText.length,
          },
        };
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const errorMsg = err instanceof Error ? err.message : String(err);
        const isTimeout = err instanceof Error && err.name === "AbortError";
        lastError = isTimeout
          ? `HTTP_TIMEOUT: Request timed out after ${timeoutMs}ms`
          : `HTTP_REQUEST_FAILED: ${errorMsg}`;

        lastResult = {
          status: "failed",
          error: lastError,
        };

        if (attemptsLeft > 0) {
          await new Promise((res) => setTimeout(res, retryDelayMs));
          continue;
        }
      }
    }

    return lastResult ?? {
      status: "failed",
      error: lastError || "HTTP_REQUEST_FAILED: Request failed after retries.",
    };
  },
};
