import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolvePropertyPath } from "../expression";
import { resolveVariables } from "@/lib/variables/resolve-variable";

export const IfExecutor: NodeExecutor = {
  definitionId: "if",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const condition = (config.condition as Record<string, unknown>) ?? {};
    const mode = (condition.mode as string) || (config.mode as string) || "basic";

    const mergedData = { ...context.input, ...input, ...context.nodeOutputs };
    let evaluatedResult = false;
    let fieldPath = "";
    let operator = "equals";
    let targetValue = "";

    if (mode === "advanced") {
      const expr = (condition.expression as string) || (config.expression as string) || "";
      const resolvedExpr = resolveVariables(expr, mergedData);

      // Safe expression evaluation for contains(), >, <, ==, !=, &&, ||, startsWith
      try {
        if (resolvedExpr.includes("contains(")) {
          const match = resolvedExpr.match(/contains\(\s*['"]?([^'"]+)['"]?\s*,\s*['"]?([^'"]+)['"]?\s*\)/);
          if (match) {
            evaluatedResult = match[1].toLowerCase().includes(match[2].toLowerCase());
          }
        } else if (resolvedExpr.includes("&&")) {
          const parts = resolvedExpr.split("&&").map((p) => p.trim());
          evaluatedResult = parts.every((part) => evaluateSimpleExpression(part));
        } else if (resolvedExpr.includes("||")) {
          const parts = resolvedExpr.split("||").map((p) => p.trim());
          evaluatedResult = parts.some((part) => evaluateSimpleExpression(part));
        } else {
          evaluatedResult = evaluateSimpleExpression(resolvedExpr);
        }
      } catch {
        evaluatedResult = Boolean(resolvedExpr && resolvedExpr !== "false" && resolvedExpr !== "0");
      }
    } else {
      fieldPath = (condition.field as string) || (config.fieldPath as string) || "";
      operator = (condition.operator as string) || (config.operator as string) || "equals";

      if (operator === ">") operator = "greater_than";
      if (operator === "<") operator = "less_than";
      if (operator === ">=") operator = "greater_than_or_equal";
      if (operator === "<=") operator = "less_than_or_equal";
      if (operator === "==" || operator === "=") operator = "equals";
      if (operator === "!=") operator = "not_equals";

      const rawTarget = condition.value ?? config.targetValue ?? config.value ?? "";
      const rawSecond = condition.secondValue ?? config.secondValue ?? "";

      // Resolve actual left operand value
      let actualValue: unknown;
      if (fieldPath.includes("{{")) {
        actualValue = resolveVariables(fieldPath, mergedData);
      } else {
        actualValue = resolvePropertyPath(mergedData, fieldPath);
        if (actualValue === undefined && fieldPath in mergedData) {
          actualValue = mergedData[fieldPath];
        }
      }

      // Resolve right operands
      const resolvedTarget = resolveVariables(String(rawTarget), mergedData);
      const resolvedSecond = resolveVariables(String(rawSecond), mergedData);
      targetValue = resolvedTarget;

      switch (operator) {
        case "equals":
          evaluatedResult = String(actualValue ?? "").trim() === String(resolvedTarget).trim();
          break;
        case "not_equals":
          evaluatedResult = String(actualValue ?? "").trim() !== String(resolvedTarget).trim();
          break;
        case "greater_than":
          evaluatedResult = Number(actualValue) > Number(resolvedTarget);
          break;
        case "less_than":
          evaluatedResult = Number(actualValue) < Number(resolvedTarget);
          break;
        case "greater_than_or_equal":
          evaluatedResult = Number(actualValue) >= Number(resolvedTarget);
          break;
        case "less_than_or_equal":
          evaluatedResult = Number(actualValue) <= Number(resolvedTarget);
          break;
        case "contains":
          evaluatedResult = String(actualValue ?? "")
            .toLowerCase()
            .includes(String(resolvedTarget).toLowerCase());
          break;
        case "does_not_contain":
          evaluatedResult = !String(actualValue ?? "")
            .toLowerCase()
            .includes(String(resolvedTarget).toLowerCase());
          break;
        case "starts_with":
          evaluatedResult = String(actualValue ?? "")
            .toLowerCase()
            .startsWith(String(resolvedTarget).toLowerCase());
          break;
        case "ends_with":
          evaluatedResult = String(actualValue ?? "")
            .toLowerCase()
            .endsWith(String(resolvedTarget).toLowerCase());
          break;
        case "between": {
          const num = Number(actualValue);
          const min = Number(resolvedTarget);
          const max = Number(resolvedSecond);
          evaluatedResult = !isNaN(num) && num >= min && num <= max;
          break;
        }
        case "is_empty":
          evaluatedResult = actualValue === undefined || actualValue === null || String(actualValue).trim() === "";
          break;
        case "is_not_empty":
          evaluatedResult = actualValue !== undefined && actualValue !== null && String(actualValue).trim() !== "";
          break;
        case "is_true":
          evaluatedResult = String(actualValue).toLowerCase() === "true" || Boolean(actualValue) === true;
          break;
        case "is_false":
          evaluatedResult = String(actualValue).toLowerCase() === "false" || !actualValue;
          break;
        default:
          evaluatedResult = false;
      }
    }

    const selectedHandle = evaluatedResult ? "true" : "false";

    return {
      status: "success",
      output: {
        result: evaluatedResult,
        fieldPath,
        operator,
        targetValue,
        selectedBranch: selectedHandle,
      },
      selectedHandle,
    };
  },
};

function evaluateSimpleExpression(expr: string): boolean {
  if (expr.includes(">=")) {
    const [l, r] = expr.split(">=").map((s) => s.trim());
    return Number(l) >= Number(r);
  }
  if (expr.includes("<=")) {
    const [l, r] = expr.split("<=").map((s) => s.trim());
    return Number(l) <= Number(r);
  }
  if (expr.includes(">")) {
    const [l, r] = expr.split(">").map((s) => s.trim());
    return Number(l) > Number(r);
  }
  if (expr.includes("<")) {
    const [l, r] = expr.split("<").map((s) => s.trim());
    return Number(l) < Number(r);
  }
  if (expr.includes("==")) {
    const [l, r] = expr.split("==").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
    return l === r;
  }
  if (expr.includes("!=")) {
    const [l, r] = expr.split("!=").map((s) => s.trim().replace(/^['"]|['"]$/g, ""));
    return l !== r;
  }
  return Boolean(expr && expr !== "false" && expr !== "0");
}
