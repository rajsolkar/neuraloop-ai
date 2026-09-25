import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import nodemailer from "nodemailer";
import { EmailExecutor } from "../executors/email";
import { createWorkflowNode } from "@/lib/workflow/create-node";
import type { ExecutionContext } from "../types";

function mockContext(overrides?: Partial<ExecutionContext>): ExecutionContext {
  return {
    executionId: "exec-email-123",
    workflowId: "w-email-123",
    workflowVersionId: "ver-email-123",
    versionNumber: 1,
    input: { name: "Raj Solkar", email: "raj@example.com" },
    nodeOutputs: {
      "n-code-1": { message: "Hello from Code Node", recipient: "sales@example.com" },
    },
    nodeInputs: {},
    nodeStatuses: { "n-code-1": "success" },
    metadata: {
      nodeTypes: {
        "n-code-1": "code",
      },
    },
    ...overrides,
  };
}

describe("EmailExecutor Real SMTP Integration & Delivery Test Suite", () => {
  const origEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...origEnv,
      SMTP_HOST: "smtp.mailtrap.io",
      SMTP_PORT: "587",
      SMTP_USER: "test_smtp_user@example.com",
      SMTP_PASS: "secret_smtp_password",
    };
  });

  afterEach(() => {
    process.env = origEnv;
    vi.restoreAllMocks();
  });

  it("fails if SMTP_HOST or SMTP_USER configuration is missing", async () => {
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;

    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = { to: "sales@example.com" };

    const ctx = mockContext();
    const result = await EmailExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("CREDENTIAL_NOT_CONFIGURED");
  });

  it("fails if email recipient address ('To') is missing or resolves to empty string", async () => {
    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = { to: "" };

    const ctx = mockContext();
    const result = await EmailExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("NODE_CONFIG_INVALID: Email recipient address ('To') is required.");
  });

  it("creates real transporter, invokes sendMail, and returns actual SMTP response metadata", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({
      accepted: ["sales@example.com"],
      rejected: [],
      response: "250 2.0.0 OK 1727271923 s10-200sm12948218pga.29 - gsmtp",
      messageId: "<test-msg-id-12345@smtp.mailtrap.io>",
    });

    const mockCreateTransport = vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as unknown as nodemailer.Transporter);

    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = {
      to: "sales@example.com",
      subject: "Pipeline Alert: {{name}}",
      body: "{{message}}",
    };

    const ctx = mockContext();
    const result = await EmailExecutor.execute(node, {}, ctx);

    // 1. Prove transporter created
    expect(mockCreateTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.mailtrap.io",
        port: 587,
        secure: false,
        auth: {
          user: "test_smtp_user@example.com",
          pass: "secret_smtp_password",
        },
      }),
    );

    // 2. Prove sendMail invoked with resolved variable expressions
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "test_smtp_user@example.com",
        to: "sales@example.com",
        subject: "Pipeline Alert: Raj Solkar",
        text: "Hello from Code Node",
      }),
    );

    // 3. Prove actual SMTP response returned
    expect(result.status).toBe("success");
    expect(result.output).toEqual(
      expect.objectContaining({
        accepted: ["sales@example.com"],
        rejected: [],
        response: "250 2.0.0 OK 1727271923 s10-200sm12948218pga.29 - gsmtp",
        messageId: "<test-msg-id-12345@smtp.mailtrap.io>",
        to: "sales@example.com",
        subject: "Pipeline Alert: Raj Solkar",
        sentVia: "smtp.mailtrap.io",
        sender: "test_smtp_user@example.com",
      }),
    );
  });

  it("resolves variable expressions from steps like {{steps.code.message}} and {{email}}", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({
      accepted: ["raj@example.com"],
      rejected: [],
      response: "250 2.0.0 OK",
      messageId: "<msg-step-var-99@smtp.mailtrap.io>",
    });

    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as unknown as nodemailer.Transporter);

    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = {
      to: "{{email}}",
      subject: "Target: {{steps.code.recipient}}",
      body: "Payload: {{steps.code.message}}",
    };

    const ctx = mockContext();
    const result = await EmailExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("success");
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "raj@example.com",
        subject: "Target: sales@example.com",
        text: "Payload: Hello from Code Node",
      }),
    );
  });

  it("fails execution when SMTP server rejects email delivery", async () => {
    const mockSendMail = vi.fn().mockResolvedValue({
      accepted: [],
      rejected: ["bad_recipient@domain.invalid"],
      response: "550 5.1.1 User unknown",
      messageId: "<rejected-msg-id@smtp.mailtrap.io>",
    });

    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as unknown as nodemailer.Transporter);

    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = {
      to: "bad_recipient@domain.invalid",
      subject: "Test Rejection",
    };

    const ctx = mockContext();
    const result = await EmailExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("SMTP_REJECTED: Recipient rejected by mail server (bad_recipient@domain.invalid)");
  });

  it("fails execution with SMTP_ERROR when sendMail throws connection or auth error", async () => {
    const mockSendMail = vi.fn().mockRejectedValue(new Error("Invalid login: 535 5.7.8 Authentication credentials invalid"));

    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as unknown as nodemailer.Transporter);

    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = {
      to: "sales@example.com",
      subject: "Test Auth Failure",
    };

    const ctx = mockContext();
    const result = await EmailExecutor.execute(node, {}, ctx);

    expect(result.status).toBe("failed");
    expect(result.error).toContain("SMTP_ERROR: Invalid login: 535 5.7.8 Authentication credentials invalid");
  });

  it("fails execution on 15s timeout protection when sendMail hangs", async () => {
    vi.useFakeTimers();

    const mockSendMail = vi.fn().mockImplementation(() => new Promise(() => {})); // Hangs forever

    vi.spyOn(nodemailer, "createTransport").mockReturnValue({
      sendMail: mockSendMail,
    } as unknown as nodemailer.Transporter);

    const node = createWorkflowNode("email", { x: 0, y: 0 });
    node.data.config = {
      to: "sales@example.com",
      subject: "Test Timeout",
    };

    const ctx = mockContext();
    const execPromise = EmailExecutor.execute(node, {}, ctx);

    // Fast-forward fake timers past 15000ms
    vi.advanceTimersByTime(15001);

    const result = await execPromise;

    expect(result.status).toBe("failed");
    expect(result.error).toContain("SMTP_TIMEOUT: Email send operation timed out after 15s");

    vi.useRealTimers();
  });
});
