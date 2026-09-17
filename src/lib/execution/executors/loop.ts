import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";

export const LoopExecutor: NodeExecutor = {
  definitionId: "loop",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const arrayPath = (config.arrayPath as string) || "items";
    const rawArrayInput = config.arrayInput || input[arrayPath] || input.items || input;

    let items: unknown[] = [];
    if (Array.isArray(rawArrayInput)) {
      items = rawArrayInput;
    } else if (typeof rawArrayInput === "object" && rawArrayInput !== null) {
      items = Object.values(rawArrayInput as Record<string, unknown>);
    } else if (typeof rawArrayInput === "string") {
      try {
        const parsed = JSON.parse(rawArrayInput);
        if (Array.isArray(parsed)) items = parsed;
      } catch {
        items = [rawArrayInput];
      }
    } else if (rawArrayInput !== undefined && rawArrayInput !== null) {
      items = [rawArrayInput];
    }

    const totalItems = items.length;
    const currentIndex = 0;
    const currentItem = totalItems > 0 ? items[0] : null;

    return {
      status: "success",
      output: {
        items,
        totalItems,
        currentIndex,
        item: currentItem,
        loop: {
          item: currentItem,
          currentIndex,
          totalItems,
        },
      },
    };
  },
};
