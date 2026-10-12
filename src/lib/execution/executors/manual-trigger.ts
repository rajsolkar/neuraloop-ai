import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";

export const ManualTriggerExecutor: NodeExecutor = {
  definitionId: "manual-trigger",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context?: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data?.config as Record<string, unknown>) || {};
    const defaultPayload = (config.defaultPayload as Record<string, unknown>) || {};

    const candidateInput =
      input && Object.keys(input).length > 0
        ? input
        : context?.input && Object.keys(context.input).length > 0
        ? context.input
        : Object.keys(defaultPayload).length > 0
        ? defaultPayload
        : {};

    const payload = {
      source: "manual",
      timestamp: new Date().toISOString(),
      ...defaultPayload,
      ...candidateInput,
    };

    return {
      status: "success",
      output: payload,
    };
  },
};
