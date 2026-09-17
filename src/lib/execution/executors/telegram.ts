import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const TelegramExecutor: NodeExecutor = {
  definitionId: "telegram",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const chatIdRaw = (config.chatId as string) || (input.chatId as string) || "";
    const operation = (config.operation as string) || "send_message";
    const textRaw = (config.text as string) || (config.message as string) || (input.text as string) || "Neuraloop Workflow Notification";
    const photoUrlRaw = (config.photoUrl as string) || (input.photoUrl as string) || "";

    const chatId = resolveExpression(chatIdRaw, { ...input, ...context.nodeOutputs });
    const text = resolveExpression(textRaw, { ...input, ...context.nodeOutputs });
    const photoUrl = resolveExpression(photoUrlRaw, { ...input, ...context.nodeOutputs });

    if (!chatId) {
      return {
        status: "failed",
        error: "TELEGRAM_MISSING_PARAM: 'chatId' parameter is required.",
      };
    }

    let botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    if (config.credentialId) {
      const resolved = await CredentialService.getDecryptedCredential(config.credentialId as string, context.userId);
      if (resolved?.secret) {
        botToken = resolved.secret;
      }
    }

    if (!botToken || !botToken.trim()) {
      return {
        status: "failed",
        error: "TELEGRAM_CREDENTIAL_NOT_CONFIGURED: Telegram bot token is missing. Select a Telegram credential in the inspector.",
      };
    }

    try {
      let endpoint = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let payload: Record<string, unknown> = {
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
      };

      if (operation === "send_photo" && photoUrl) {
        endpoint = `https://api.telegram.org/bot${botToken}/sendPhoto`;
        payload = {
          chat_id: chatId,
          photo: photoUrl,
          caption: text,
          parse_mode: "Markdown",
        };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const responseData = await res.json();
      if (!res.ok || !responseData.ok) {
        return {
          status: "failed",
          error: `TELEGRAM_API_ERROR (HTTP ${res.status}): ${responseData.description || JSON.stringify(responseData)}`,
        };
      }

      return {
        status: "success",
        output: {
          delivered: true,
          messageId: responseData.result?.message_id,
          chatId,
          text,
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `TELEGRAM_REQUEST_FAILED: ${errorMsg}`,
      };
    }
  },
};
