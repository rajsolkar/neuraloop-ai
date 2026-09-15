import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolvePropertyPath } from "../expression";

export const IfExecutor: NodeExecutor = {
  definitionId: "if",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const condition = (config.condition as Record<string, unknown>) ?? {};

    const fieldPath = (condition.field as string) || (config.fieldPath as string) || "";
    let operator = (condition.operator as string) || (config.operator as string) || "equals";
    if (operator === ">") operator = "greater_than";
    if (operator === "<") operator = "less_than";
    if (operator === ">=") operator = "greater_than_or_equal";
    if (operator === "<=") operator = "less_than_or_equal";
    if (operator === "==" || operator === "=") operator = "equals";
    if (operator === "!=") operator = "not_equals";

    const targetValue = condition.value ?? config.targetValue ?? config.value ?? "";

    // Resolve property value from input or nodeOutputs
    const mergedData = { ...context.input, ...input, ...context.nodeOutputs };
    const actualValue = resolvePropertyPath(mergedData, fieldPath);

    let evaluatedResult = false;

    switch (operator) {
      case "equals":
        evaluatedResult = String(actualValue) === String(targetValue);
        break;
      case "not_equals":
        evaluatedResult = String(actualValue) !== String(targetValue);
        break;
      case "greater_than":
        evaluatedResult = Number(actualValue) > Number(targetValue);
        break;
      case "less_than":
        evaluatedResult = Number(actualValue) < Number(targetValue);
        break;
      case "greater_than_or_equal":
        evaluatedResult = Number(actualValue) >= Number(targetValue);
        break;
      case "less_than_or_equal":
        evaluatedResult = Number(actualValue) <= Number(targetValue);
        break;
      case "contains":
        evaluatedResult = String(actualValue ?? "").includes(String(targetValue));
        break;
      case "does_not_contain":
        evaluatedResult = !String(actualValue ?? "").includes(String(targetValue));
        break;
      case "is_empty":
        evaluatedResult = actualValue === undefined || actualValue === null || String(actualValue).trim() === "";
        break;
      case "is_not_empty":
        evaluatedResult = actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== "";
        break;
      default:
        evaluatedResult = false;
    }

    const selectedHandle = evaluatedResult ? "true" : "false";

    return {
      status: "success",
      output: {
        result: evaluatedResult,
        fieldPath,
        actualValue: actualValue as Record<string, unknown>,
        operator,
        targetValue: targetValue as Record<string, unknown>,
        selectedBranch: selectedHandle,
      },
      selectedHandle,
    };
  },
};
