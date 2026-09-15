import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { validateUrlForSsrf } from "../ssrf";
import { resolveExpression } from "../expression";

export const HttpRequestExecutor: NodeExecutor = {
  definitionId: "http-request",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const rawUrl = (config.url as string) ?? "";
    const method = ((config.method as string) ?? "GET").toUpperCase();

    // Resolve template expressions in URL
    const url = resolveExpression(rawUrl, { ...context.input, ...input, ...context.nodeOutputs });

    if (!url || !url.trim()) {
      return {
        status: "failed",
        error: "NODE_CONFIG_INVALID: HTTP URL is required.",
      };
    }

    // SSRF URL Validation
    const ssrfCheck = validateUrlForSsrf(url);
    if (!ssrfCheck.safe) {
      return {
        status: "failed",
        error: `SSRF_BLOCKED: ${ssrfCheck.error}`,
      };
    }

    // Prepare headers
    const headersObj: Record<string, string> = {};
    if (Array.isArray(config.headers)) {
      for (const h of config.headers as Array<{ key: string; value: string }>) {
        if (h.key) {
          headersObj[h.key] = resolveExpression(h.value ?? "", { ...input, ...context.nodeOutputs });
        }
      }
    }

    // Prepare Query Params
    let targetUrl = url;
    if (Array.isArray(config.queryParams) && config.queryParams.length > 0) {
      const parsed = new URL(targetUrl);
      for (const q of config.queryParams as Array<{ key: string; value: string }>) {
        if (q.key) {
          parsed.searchParams.append(
            q.key,
            resolveExpression(q.value ?? "", { ...input, ...context.nodeOutputs }),
          );
        }
      }
      targetUrl = parsed.toString();
    }

    // Prepare body
    let bodyPayload: string | undefined = undefined;
    if (method !== "GET" && config.bodyType === "json" && config.body) {
      bodyPayload = resolveExpression(config.body as string, { ...input, ...context.nodeOutputs });
      if (!headersObj["content-type"] && !headersObj["Content-Type"]) {
        headersObj["Content-Type"] = "application/json";
      }
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout limit

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

      let responseData: unknown;
      if (contentType.includes("application/json")) {
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          status: "failed",
          error: `HTTP_REQUEST_FAILED: Returned status code ${response.status}`,
          output: {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            data: responseData as Record<string, unknown>,
            duration,
          },
        };
      }

      return {
        status: "success",
        output: {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          data: responseData as Record<string, unknown>,
          duration,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          status: "failed",
          error: "HTTP_TIMEOUT: Request timed out after 10000ms",
        };
      }
      return {
        status: "failed",
        error: `HTTP_REQUEST_FAILED: ${errorMsg}`,
      };
    }
  },
};
