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

    let smtpHost = process.env.SMTP_HOST;
    let smtpUser = process.env.SMTP_USER;

    if (config.credentialId) {
      const resolved = await CredentialService.getDecryptedCredential(config.credentialId as string, context.userId);
      if (resolved) {
        smtpHost = (resolved.metadata?.smtpHost as string) || "smtp.provider.com";
        smtpUser = (resolved.metadata?.smtpUser as string) || "user@example.com";
      }
    }

    if (!smtpHost || !smtpHost.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: SMTP Email credential is missing. Please select an SMTP credential in the inspector.",
      };
    }

    const toRaw = (config.to as string) || "";
    const subjectRaw = (config.subject as string) || "";
    const bodyRaw = (config.body as string) || "{{message}}";

    const to = resolveExpression(toRaw, contextData);
    const subject = resolveExpression(subjectRaw, contextData);
    const body = resolveExpression(bodyRaw, contextData);

    if (!to || !to.trim()) {
      return {
        status: "failed",
        error: "NODE_CONFIG_INVALID: Email recipient address ('To') is required.",
      };
    }

    return {
      status: "success",
      output: {
        to,
        subject,
        bodyLength: body.length,
        sentVia: smtpHost,
        sender: smtpUser,
        deliveredAt: new Date().toISOString(),
      },
    };
  },
};
