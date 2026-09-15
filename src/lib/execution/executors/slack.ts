import type { NodeExecutionResult, NodeExecutor } from "../types";

export const SlackExecutor: NodeExecutor = {
  definitionId: "slack",
  async execute(): Promise<NodeExecutionResult> {
    const slackToken = process.env.SLACK_BOT_TOKEN;
    if (!slackToken || !slackToken.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: SLACK_BOT_TOKEN environment variable is not set on the server.",
      };
    }
    return {
      status: "failed",
      error: "SLACK_REQUEST_FAILED: Slack integration requires server-side bot connection.",
    };
  },
};
