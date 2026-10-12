import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { buildExecutionExpressionContext, resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const TelegramExecutor: NodeExecutor = {
  definitionId: "telegram",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const contextData = buildExecutionExpressionContext(context, input);

    // 1. Prevent duplicate dispatch if node already delivered in current execution run
    const prevOutput = context.nodeOutputs[node.id] as Record<string, unknown> | undefined;
    if (context.nodeStatuses[node.id] === "success" && prevOutput?.delivered) {
      return {
        status: "success",
        output: prevOutput,
      };
    }

    const chatIdRaw =
      (config.chatId as string) ||
      (config.chat_id as string) ||
      (config.chatID as string) ||
      (config.channelId as string) ||
      (config.target as string) ||
      (input.chatId as string) ||
      (input.chat_id as string) ||
      "";
    const operation = (config.operation as string) || "send_message";
    const textRaw =
      (config.text as string) ||
      (config.message as string) ||
      (input.text as string) ||
      "{{message}}";
    const photoUrlRaw = (config.photoUrl as string) || (input.photoUrl as string) || "";

    const chatId = resolveExpression(chatIdRaw, contextData);

    // 2. Resolve expression with observable missing placeholders
    const missingVars: string[] = [];
    let text = resolveExpression(textRaw, contextData, {
      observableMissing: true,
      onMissing: (path) => missingVars.push(path),
    });

    // Check if required upstream step payload is missing (e.g. AI failed or returned incomplete JSON)
    const isUpstreamStepRef = textRaw.includes("steps.") || textRaw.includes("$steps.");
    if (isUpstreamStepRef && missingVars.some((v) => v.includes("steps.") || v.includes("$steps."))) {
      const missingStepVars = missingVars.filter((v) => v.includes("steps.") || v.includes("$steps."));
      return {
        status: "failed",
        error: `TELEGRAM_MISSING_PAYLOAD: Required upstream step output '${missingStepVars.join(", ")}' was not available. Telegram dispatch aborted to prevent sending unresolved placeholders.`,
      };
    }

    if (text.includes("[Missing: steps.") || text.includes("[Missing: $steps.")) {
      return {
        status: "failed",
        error: "TELEGRAM_MISSING_PAYLOAD: Message text contains unresolved upstream step placeholders. Dispatch aborted.",
      };
    }

    if (!text || !text.trim()) {
      return {
        status: "failed",
        error: "TELEGRAM_EMPTY_MESSAGE: Message text is empty after expression resolution.",
      };
    }

    // 3. Telegram 4096 character limit safeguard
    const MAX_TELEGRAM_LENGTH = 4096;
    let isTruncated = false;
    if (text.length > MAX_TELEGRAM_LENGTH) {
      const notice = "\n\n[Message truncated to 4096 chars for Telegram limit]";
      text = text.slice(0, MAX_TELEGRAM_LENGTH - notice.length) + notice;
      isTruncated = true;
    }

    const photoUrl = resolveExpression(photoUrlRaw, contextData);

    if (!chatId) {
      return {
        status: "failed",
        error: "TELEGRAM_MISSING_PARAM: 'chatId' parameter is required.",
      };
    }

    let botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    if (config.credentialId) {
      const resolved = await CredentialService.getDecryptedCredential(
        config.credentialId as string,
        context.userId,
        context.organizationId,
      );
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

      let res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      let responseData = await res.json();

      // 4. Markdown Entity Error Fallback:
      // If Markdown parsing fails due to unescaped symbols in AI output, retry as clean plain text
      if (
        !res.ok &&
        payload.parse_mode &&
        (responseData.description?.includes("can't parse entities") ||
          responseData.description?.includes("entity"))
      ) {
        delete payload.parse_mode;
        res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        responseData = await res.json();
      }

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
          isTruncated,
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
