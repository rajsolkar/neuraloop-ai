import type { WorkflowNode } from "@/types/workflow";
import type { NodeExecutionResult, NodeExecutor } from "../types";

export const ScheduleExecutor: NodeExecutor = {
  definitionId: "schedule",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    return {
      status: "success",
      output: {
        trigger: "schedule",
        frequency: (config.frequency as string) || "daily",
        timestamp: new Date().toISOString(),
        ...input,
      },
    };
  },
};
