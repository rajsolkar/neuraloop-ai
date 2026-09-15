import type { WorkflowNode } from "@/types/workflow";
import type { NodeExecutionResult, NodeExecutor } from "../types";

export const ManualTriggerExecutor: NodeExecutor = {
  definitionId: "manual-trigger",
  async execute(
    _node: WorkflowNode,
    input: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const payload = input && Object.keys(input).length > 0 ? input : { source: "manual", timestamp: new Date().toISOString() };
    return {
      status: "success",
      output: payload,
    };
  },
};
