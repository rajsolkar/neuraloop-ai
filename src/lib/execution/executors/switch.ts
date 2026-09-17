import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";

interface SwitchCaseRule {
  id: string;
  label: string;
  fieldPath: string;
  operator: "equals" | "not_equals" | "contains" | "greater_than" | "less_than" | "is_true" | "is_false";
  value: string;
}

export const SwitchExecutor: NodeExecutor = {
  definitionId: "switch",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const cases = (config.cases as SwitchCaseRule[]) || [
      { id: "case_1", label: "case_1", fieldPath: "priority", operator: "equals", value: "high" },
      { id: "case_2", label: "case_2", fieldPath: "priority", operator: "equals", value: "medium" },
    ];

    let matchedCaseId = "default";
    let matchedCaseLabel = "default";

    for (const rule of cases) {
      const fieldValue = input[rule.fieldPath] ?? input.value ?? input;
      const targetVal = rule.value;
      let matched = false;

      switch (rule.operator) {
        case "equals":
          matched = String(fieldValue).toLowerCase() === String(targetVal).toLowerCase();
          break;
        case "not_equals":
          matched = String(fieldValue).toLowerCase() !== String(targetVal).toLowerCase();
          break;
        case "contains":
          matched = String(fieldValue).toLowerCase().includes(String(targetVal).toLowerCase());
          break;
        case "greater_than":
          matched = Number(fieldValue) > Number(targetVal);
          break;
        case "less_than":
          matched = Number(fieldValue) < Number(targetVal);
          break;
        case "is_true":
          matched = Boolean(fieldValue) === true;
          break;
        case "is_false":
          matched = Boolean(fieldValue) === false;
          break;
      }

      if (matched) {
        matchedCaseId = rule.id || rule.label;
        matchedCaseLabel = rule.label || rule.id;
        break;
      }
    }

    return {
      status: "success",
      output: {
        matchedBranch: matchedCaseId,
        matchedLabel: matchedCaseLabel,
        input,
      },
    };
  },
};
