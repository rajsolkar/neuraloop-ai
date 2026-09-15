import type { WorkflowNode } from "@/types/workflow";
import type { NodeExecutionResult, NodeExecutor } from "../types";

export const DelayExecutor: NodeExecutor = {
  definitionId: "delay",
  async execute(
    node: WorkflowNode,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const durationInput = typeof config.duration === "number" ? config.duration : 5;
    const unit = (config.unit as string) || "seconds";

    let delayMs = durationInput * 1000;
    if (unit === "minutes") delayMs = durationInput * 60 * 1000;
    if (unit === "hours") delayMs = durationInput * 60 * 60 * 1000;

    // Bound maximum delay in in-process dev to 5000ms max
    const actualDelay = Math.min(delayMs, 5000);

    await new Promise((resolve) => setTimeout(resolve, actualDelay));

    return {
      status: "success",
      output: {
        requestedDuration: durationInput,
        unit,
        delayMs: actualDelay,
      },
    };
  },
};
