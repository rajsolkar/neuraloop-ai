import type { WorkflowNode } from "@/types/workflow";
import type { NodeExecutionResult, NodeExecutor } from "../types";

export const WebhookExecutor: NodeExecutor = {
  definitionId: "webhook",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    return {
      status: "success",
      output: {
        trigger: "webhook",
        path: (config.path as string) || "/webhook/endpoint",
        timestamp: new Date().toISOString(),
        ...input,
      },
    };
  },
};
