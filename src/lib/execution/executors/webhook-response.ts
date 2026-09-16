import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";

export const WebhookResponseExecutor: NodeExecutor = {
  definitionId: "webhook-response",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    try {
      const config = (node.data.config as Record<string, unknown>) ?? {};
      const statusCode = Number(config.statusCode) || 200;
      const rawHeaders = (config.headers as Array<{ key: string; value: string }>) ?? [];
      const bodyType = (config.bodyType as string) || "json";
      const rawBody = (config.body as string) || "";

      const contextData = {
        input: context.input,
        steps: context.nodeOutputs,
        metadata: context.metadata,
        ...input,
      };

      const resolvedHeaders: Record<string, string> = {};
      for (const item of rawHeaders) {
        if (item.key) {
          resolvedHeaders[item.key] = resolveExpression(item.value || "", contextData);
        }
      }

      const resolvedBodyStr = resolveExpression(rawBody, contextData);
      let parsedBody: unknown = resolvedBodyStr;

      if (bodyType === "json" && resolvedBodyStr.trim()) {
        try {
          parsedBody = JSON.parse(resolvedBodyStr);
        } catch {
          parsedBody = resolvedBodyStr;
        }
      }

      return {
        status: "success",
        output: {
          statusCode,
          headers: resolvedHeaders,
          body: parsedBody as Record<string, unknown>,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `Webhook Response Execution Error: ${errorMsg}`,
      };
    }
  },
};
