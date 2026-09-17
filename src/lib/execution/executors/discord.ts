import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const DiscordExecutor: NodeExecutor = {
  definitionId: "discord",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    let webhookUrl = (config.webhookUrl as string) || (input.webhookUrl as string) || "";
    const operation = (config.operation as string) || "send_message";
    const contentRaw = (config.content as string) || (config.message as string) || (input.content as string) || "Neuraloop Event Notification";

    if (config.credentialId) {
      const resolved = await CredentialService.getDecryptedCredential(config.credentialId as string, context.userId);
      if (resolved?.secret) {
        webhookUrl = resolved.secret;
      }
    }

    if (!webhookUrl || !webhookUrl.trim()) {
      return {
        status: "failed",
        error: "DISCORD_CREDENTIAL_NOT_CONFIGURED: Discord webhook URL is missing. Select a Discord credential in the inspector.",
      };
    }

    const content = resolveExpression(contentRaw, { ...input, ...context.nodeOutputs });

    try {
      let payload: Record<string, unknown> = { content };

      if (operation === "send_embed") {
        const embedTitleRaw = (config.embedTitle as string) || "Neuraloop Event Alert";
        const embedDescRaw = (config.embedDescription as string) || content;
        const embedTitle = resolveExpression(embedTitleRaw, { ...input, ...context.nodeOutputs });
        const embedDescription = resolveExpression(embedDescRaw, { ...input, ...context.nodeOutputs });

        payload = {
          embeds: [
            {
              title: embedTitle,
              description: embedDescription,
              color: 3796756, // #39ff14 Neon Green
              timestamp: new Date().toISOString(),
              footer: { text: "Neuraloop Automation Engine v2.0" },
            },
          ],
        };
      }

      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok && res.status !== 204) {
        const errorText = await res.text();
        return {
          status: "failed",
          error: `DISCORD_WEBHOOK_FAILED (HTTP ${res.status}): ${errorText.substring(0, 200)}`,
        };
      }

      return {
        status: "success",
        output: {
          delivered: true,
          operation,
          content,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `DISCORD_REQUEST_FAILED: ${errorMsg}`,
      };
    }
  },
};
