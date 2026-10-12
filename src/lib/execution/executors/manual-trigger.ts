import type { WorkflowNode } from "@/types/workflow";
import type { NodeExecutionResult, NodeExecutor } from "../types";

export const ManualTriggerExecutor: NodeExecutor = {
  definitionId: "manual-trigger",
  async execute(
    _node: WorkflowNode,
    input: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const config = (_node.data?.config as Record<string, unknown>) || {};
    const defaultPayload = (config.defaultPayload as Record<string, unknown>) || {};
    const hasInput = input && Object.keys(input).length > 0;

    const payload = hasInput
      ? input
      : Object.keys(defaultPayload).length > 0
      ? { ...defaultPayload, source: "manual", timestamp: new Date().toISOString() }
      : { source: "manual", timestamp: new Date().toISOString() };

    return {
      status: "success",
      output: payload,
    };
  },
};
