import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";

export const CodeExecutor: NodeExecutor = {
  definitionId: "code",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    try {
      const config = (node.data.config as Record<string, unknown>) ?? {};
      const codeSnippet = (config.code as string) || "return { success: true };";

      const injectedInput = context.input || input;
      const injectedSteps = context.nodeOutputs || {};

      const fn = new Function("input", "steps", "context", codeSnippet);
      const result = await fn(injectedInput, injectedSteps, {
        input: injectedInput,
        steps: injectedSteps,
        metadata: context.metadata,
      });

      let formattedOutput: Record<string, unknown>;
      if (result !== null && typeof result === "object" && !Array.isArray(result)) {
        formattedOutput = result as Record<string, unknown>;
      } else {
        formattedOutput = { result };
      }

      return {
        status: "success",
        output: formattedOutput,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `Code Node Execution Error: ${errorMsg}`,
      };
    }
  },
};
