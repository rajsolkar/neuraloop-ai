import type { NodeExecutionResult, NodeExecutor } from "../types";

export const EmailExecutor: NodeExecutor = {
  definitionId: "email",
  async execute(): Promise<NodeExecutionResult> {
    const smtpHost = process.env.SMTP_HOST;
    if (!smtpHost || !smtpHost.trim()) {
      return {
        status: "failed",
        error: "CREDENTIAL_NOT_CONFIGURED: SMTP / Email credentials are not configured on the server.",
      };
    }
    return {
      status: "failed",
      error: "EMAIL_REQUEST_FAILED: Email service requires active SMTP configuration.",
    };
  },
};
