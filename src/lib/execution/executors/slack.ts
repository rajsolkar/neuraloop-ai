import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { buildExecutionExpressionContext, resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const SlackExecutor: NodeExecutor = {
  definitionId: "slack",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const contextData = buildExecutionExpressionContext(context, input);

    let slackToken = process.env.SLACK_BOT_TOKEN;

    if (config.credentialId) {
      const resolved = await CredentialService.getDecryptedCredential(config.credentialId as string, context.userId);
      if (resolved?.secret) {
        slackToken = resolved.secret;
      }
    }

    if (!slackToken || !slackToken.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: Slack bot token is missing. Please select a Slack credential in the inspector.",
      };
    }

    const channelRaw = (config.channel as string) || "#general";
    const messageRaw = (config.message as string) || (config.text as string) || "{{message}}";
    const channel = resolveExpression(channelRaw, contextData);
    let message = resolveExpression(messageRaw, contextData);
    if (!message || !message.trim()) {
      message = "Neuraloop Workflow Notification";
    }

    try {
      const res = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${slackToken}`,
        },
        body: JSON.stringify({
          channel,
          text: message,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        return {
          status: "failed",
          error: `SLACK_REQUEST_FAILED: ${data.error || "Failed to post message to Slack"}`,
        };
      }

      return {
        status: "success",
        output: {
          channel,
          ts: data.ts,
          message,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `SLACK_REQUEST_FAILED: ${errorMsg}`,
      };
    }
  },
};
