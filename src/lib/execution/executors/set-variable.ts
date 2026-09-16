import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";

export const SetVariableExecutor: NodeExecutor = {
  definitionId: "set-variable",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    try {
      const config = (node.data.config as Record<string, unknown>) ?? {};
      const variablesList = (config.variables as Array<{ key: string; value: string }>) ?? [];

      const contextData = {
        input: context.input,
        steps: context.nodeOutputs,
        metadata: context.metadata,
        ...input,
      };

      const variables: Record<string, unknown> = {};

      for (const item of variablesList) {
        if (!item.key || !item.key.trim()) continue;
        const key = item.key.trim();
        const rawVal = item.value ?? "";
        const resolvedVal = resolveExpression(String(rawVal), contextData);

        try {
          if (
            (resolvedVal.startsWith("{") && resolvedVal.endsWith("}")) ||
            (resolvedVal.startsWith("[") && resolvedVal.endsWith("]"))
          ) {
            variables[key] = JSON.parse(resolvedVal);
          } else {
            variables[key] = resolvedVal;
          }
        } catch {
          variables[key] = resolvedVal;
        }
      }

      return {
        status: "success",
        output: {
          variables,
          ...variables,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `Set Variable Execution Error: ${errorMsg}`,
      };
    }
  },
};
