import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";

export const MergeExecutor: NodeExecutor = {
  definitionId: "merge",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const mode = (config.mode as "append" | "combine" | "overwrite") || "combine";

    let mergedResult: unknown = {};

    if (mode === "append") {
      const itemsList: unknown[] = [];
      Object.entries(input).forEach(([_, val]) => {
        if (Array.isArray(val)) {
          itemsList.push(...val);
        } else {
          itemsList.push(val);
        }
      });
      mergedResult = { mergedItems: itemsList, count: itemsList.length };
    } else if (mode === "overwrite") {
      const entries = Object.entries(input);
      if (entries.length > 0) {
        const lastEntry = entries[entries.length - 1][1];
        mergedResult = typeof lastEntry === "object" && lastEntry !== null ? lastEntry : { data: lastEntry };
      } else {
        mergedResult = input;
      }
    } else {
      let combined: Record<string, unknown> = {};
      Object.values(input).forEach((val) => {
        if (typeof val === "object" && val !== null && !Array.isArray(val)) {
          combined = { ...combined, ...(val as Record<string, unknown>) };
        }
      });
      mergedResult = Object.keys(combined).length > 0 ? combined : input;
    }

    return {
      status: "success",
      output: {
        mode,
        result: mergedResult,
        ...(typeof mergedResult === "object" && mergedResult !== null ? (mergedResult as Record<string, unknown>) : {}),
      },
    };
  },
};
