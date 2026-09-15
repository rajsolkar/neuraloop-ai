import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolvePropertyPath } from "../expression";

export const FilterExecutor: NodeExecutor = {
  definitionId: "filter",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const condition = (config.condition as Record<string, unknown>) ?? {};

    const fieldPath = (condition.field as string) || "";
    const operator = (condition.operator as string) || "equals";
    const targetValue = condition.value ?? "";

    const mergedData = { ...context.input, ...input, ...context.nodeOutputs };
    const actualValue = resolvePropertyPath(mergedData, fieldPath);

    let passesFilter = false;

    switch (operator) {
      case "equals":
        passesFilter = String(actualValue) === String(targetValue);
        break;
      case "not_equals":
        passesFilter = String(actualValue) !== String(targetValue);
        break;
      case "contains":
        passesFilter = String(actualValue ?? "").includes(String(targetValue));
        break;
      case "is_not_empty":
        passesFilter = actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== "";
        break;
      default:
        passesFilter = String(actualValue) === String(targetValue);
    }

    if (!passesFilter) {
      return {
        status: "skipped",
        output: { passesFilter: false, actualValue: actualValue as Record<string, unknown>, fieldPath },
      };
    }

    return {
      status: "success",
      output: { passesFilter: true, actualValue: actualValue as Record<string, unknown>, fieldPath },
    };
  },
};
