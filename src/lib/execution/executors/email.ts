import nodemailer from "nodemailer";
import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { buildExecutionExpressionContext, resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const EmailExecutor: NodeExecutor = {
  definitionId: "email",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const contextData = buildExecutionExpressionContext(context, input);

    let smtpHost = (config.smtpHost as string) || process.env.SMTP_HOST || "";
    let smtpPort = Number(config.smtpPort) || Number(process.env.SMTP_PORT) || 587;
    let smtpUser = (config.smtpUser as string) || process.env.SMTP_USER || "";
    let smtpPass = (config.smtpPass as string) || process.env.SMTP_PASS || process.env.SMTP_PASSWORD || "";

    if (config.credentialId) {
      try {
        const resolved = await CredentialService.getDecryptedCredential(
          config.credentialId as string,
          context.userId || undefined,
        );
        if (resolved) {
          if (resolved.secret) smtpPass = resolved.secret;
          if (resolved.metadata?.smtpHost) smtpHost = resolved.metadata.smtpHost as string;
          if (resolved.metadata?.smtpPort) smtpPort = Number(resolved.metadata.smtpPort);
          if (resolved.metadata?.smtpUser) smtpUser = resolved.metadata.smtpUser as string;
          if (resolved.metadata?.smtpPass) smtpPass = resolved.metadata.smtpPass as string;
        }
      } catch (err) {
        console.warn("Vault credential retrieval error in EmailExecutor:", err);
      }
    }

    if (!smtpHost || !smtpHost.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: SMTP host is missing. Configure SMTP_HOST or attach a Vault credential.",
      };
    }

    if (!smtpUser || !smtpUser.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: SMTP user email is missing. Configure SMTP_USER or attach a Vault credential.",
      };
    }

    const toRaw = (config.to as string) || "";
    const ccRaw = (config.cc as string) || "";
    const bccRaw = (config.bcc as string) || "";
    const subjectRaw = (config.subject as string) || "";
    const bodyRaw = (config.body as string) || "{{message}}";

    const to = resolveExpression(toRaw, contextData);
    const cc = ccRaw ? resolveExpression(ccRaw, contextData) : undefined;
    const bcc = bccRaw ? resolveExpression(bccRaw, contextData) : undefined;
    const subject = resolveExpression(subjectRaw || "Neuraloop Workflow Alert", contextData);
    const body = resolveExpression(bodyRaw, contextData);

    if (!to || !to.trim()) {
      return {
        status: "failed",
        error: "NODE_CONFIG_INVALID: Email recipient address ('To') is required.",
      };
    }

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
      });

      const sendPromise = transporter.sendMail({
        from: smtpUser,
        to,
        ...(cc ? { cc } : {}),
        ...(bcc ? { bcc } : {}),
        subject,
        text: body,
        ...(body.includes("<") && body.includes(">") ? { html: body } : {}),
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("SMTP_TIMEOUT: Email send operation timed out after 15s")),
          15000,
        ),
      );

      const info = await Promise.race([sendPromise, timeoutPromise]);

      if (info.rejected && Array.isArray(info.rejected) && info.rejected.length > 0 && info.accepted.length === 0) {
        return {
          status: "failed",
          error: `SMTP_REJECTED: Recipient rejected by mail server (${info.rejected.join(", ")})`,
          output: {
            accepted: info.accepted,
            rejected: info.rejected,
            response: info.response,
            messageId: info.messageId,
          },
        };
      }

      return {
        status: "success",
        output: {
          accepted: info.accepted,
          rejected: info.rejected,
          response: info.response,
          messageId: info.messageId,
          to,
          subject,
          sentVia: smtpHost,
          sender: smtpUser,
          deliveredAt: new Date().toISOString(),
        },
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `SMTP_ERROR: ${errorMsg}`,
      };
    }
  },
};
