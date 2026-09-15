import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";

export const OpenAiExecutor: NodeExecutor = {
  definitionId: "openai",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: OPENAI_API_KEY environment variable is not set on the server.",
      };
    }

    const model = (config.model as string) || "gpt-4o-mini";
    const promptRaw = (config.prompt as string) || "";
    const prompt = resolveExpression(promptRaw, { ...input, ...context.nodeOutputs });
    const temperature = typeof config.temperature === "number" ? config.temperature : 0.7;
    const maxTokens = typeof config.maxTokens === "number" ? config.maxTokens : 1000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout limit

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content: prompt }],
          temperature,
          max_tokens: maxTokens,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!res.ok) {
        const errorData = await res.text();
        return {
          status: "failed",
          error: `OPENAI_REQUEST_FAILED: HTTP ${res.status} - ${errorData}`,
        };
      }

      const data = await res.json();
      const text = data?.choices?.[0]?.message?.content || "";

      return {
        status: "success",
        output: {
          model,
          text,
          usage: data?.usage,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `OPENAI_REQUEST_FAILED: ${errorMsg}`,
      };
    }
  },
};
