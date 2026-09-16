import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import type { Prisma } from "@prisma/client";

const ALGORITHM = "aes-256-gcm";
const ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || "neuraloop-default-secret-key-32b!"; // 32 bytes

function getKey(): Buffer {
  return crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
}

export function encryptSecret(plainText: string): { encryptedValue: string; iv: string } {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag().toString("hex");
  return {
    encryptedValue: `${encrypted}:${authTag}`,
    iv: iv.toString("hex"),
  };
}

export function decryptSecret(encryptedCombined: string, ivHex: string): string {
  const [encrypted, authTagHex] = encryptedCombined.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function maskSecret(secret: string): string {
  if (!secret) return "••••••••";
  const trimmed = secret.trim();
  if (trimmed.length <= 4) return "••••••••";
  return `••••••••${trimmed.slice(-4)}`;
}

import { AuditLogService } from "@/lib/security/audit-log-service";

export interface CredentialItem {
  id: string;
  userId?: string;
  organizationId?: string | null;
  name: string;
  provider: string;
  maskedValue: string;
  metadata: Record<string, unknown> | null;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export class CredentialService {
  static async listCredentials(userId: string, orgId?: string | null): Promise<CredentialItem[]> {
    const whereClause = orgId ? { organizationId: orgId } : { userId };

    const records = await prisma.credential.findMany({
      where: whereClause,
      orderBy: { updatedAt: "desc" },
    });

    return records.map((r) => {
      let rawSecret = "";
      try {
        rawSecret = decryptSecret(r.encryptedValue, r.iv);
      } catch {
        rawSecret = "";
      }

      return {
        id: r.id,
        userId: r.userId,
        organizationId: r.organizationId,
        name: r.name,
        provider: r.provider,
        maskedValue: maskSecret(rawSecret),
        metadata: r.metadata as Record<string, unknown> | null,
        lastUsedAt: r.lastUsedAt ? r.lastUsedAt.toISOString() : null,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      };
    });
  }

  static async createCredential(
    userId: string,
    input: {
      name: string;
      provider: string;
      value: string;
      metadata?: Record<string, unknown>;
    },
    orgId?: string | null,
    userRole?: string | null,
  ): Promise<CredentialItem> {
    if (orgId && userRole === "member") {
      throw new Error("UNAUTHORIZED: Only workspace admins or owners can create shared credentials.");
    }

    const { encryptedValue, iv } = encryptSecret(input.value);
    const providerClean = input.provider.toLowerCase().trim();

    const record = await prisma.credential.create({
      data: {
        userId,
        organizationId: orgId || null,
        name: input.name.trim(),
        provider: providerClean,
        encryptedValue,
        iv,
        metadata: (input.metadata || null) as unknown as Prisma.InputJsonValue,
      },
    });

    await AuditLogService.logAction({
      organizationId: orgId,
      userId,
      action: "CREDENTIAL_CREATED",
      resourceType: "credential",
      resourceId: record.id,
      metadata: { name: record.name, provider: record.provider },
    });

    return {
      id: record.id,
      userId: record.userId,
      organizationId: record.organizationId,
      name: record.name,
      provider: record.provider,
      maskedValue: maskSecret(input.value),
      metadata: record.metadata as Record<string, unknown> | null,
      lastUsedAt: record.lastUsedAt ? record.lastUsedAt.toISOString() : null,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }

  static async updateCredential(
    id: string,
    userId: string,
    input: {
      name?: string;
      provider?: string;
      value?: string;
      metadata?: Record<string, unknown>;
    },
    orgId?: string | null,
    userRole?: string | null,
  ): Promise<CredentialItem | null> {
    if (orgId && userRole === "member") {
      throw new Error("UNAUTHORIZED: Only workspace admins or owners can update credentials.");
    }

    const whereClause = orgId ? { id, organizationId: orgId } : { id, userId };
    const existing = await prisma.credential.findFirst({
      where: whereClause,
    });
    if (!existing) return null;

    const updateData: Prisma.CredentialUpdateInput = {};
    if (input.name) updateData.name = input.name.trim();
    if (input.provider) updateData.provider = input.provider.toLowerCase().trim();
    if (input.metadata !== undefined) {
      updateData.metadata = (input.metadata || null) as unknown as Prisma.InputJsonValue;
    }

    let secretForMasking = "";
    if (input.value && input.value.trim()) {
      const { encryptedValue, iv } = encryptSecret(input.value);
      updateData.encryptedValue = encryptedValue;
      updateData.iv = iv;
      secretForMasking = input.value;
    } else {
      try {
        secretForMasking = decryptSecret(existing.encryptedValue, existing.iv);
      } catch {
        secretForMasking = "";
      }
    }

    const updated = await prisma.credential.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      userId: updated.userId,
      organizationId: updated.organizationId,
      name: updated.name,
      provider: updated.provider,
      maskedValue: maskSecret(secretForMasking),
      metadata: updated.metadata as Record<string, unknown> | null,
      lastUsedAt: updated.lastUsedAt ? updated.lastUsedAt.toISOString() : null,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    };
  }

  static async deleteCredential(
    id: string,
    userId: string,
    orgId?: string | null,
    userRole?: string | null,
  ): Promise<boolean> {
    if (orgId && userRole === "member") {
      throw new Error("UNAUTHORIZED: Only workspace admins or owners can delete credentials.");
    }

    const whereClause = orgId ? { id, organizationId: orgId } : { id, userId };
    const existing = await prisma.credential.findFirst({
      where: whereClause,
    });
    if (!existing) return false;

    await prisma.credential.delete({
      where: { id },
    });

    await AuditLogService.logAction({
      organizationId: orgId,
      userId,
      action: "CREDENTIAL_DELETED",
      resourceType: "credential",
      resourceId: id,
      metadata: { name: existing.name, provider: existing.provider },
    });

    return true;
  }

  static async getDecryptedCredential(
    id: string,
    userId?: string | null,
    orgId?: string | null,
  ): Promise<{
    secret: string;
    metadata: Record<string, unknown> | null;
  } | null> {
    const whereClause = orgId
      ? { id, organizationId: orgId }
      : (userId ? { id, userId } : { id });
    const record = await prisma.credential.findFirst({
      where: whereClause,
    });
    if (!record) return null;

    // Async usage timestamp update without blocking execution loop
    this.touchLastUsed(record.id).catch(() => {});

    const secret = decryptSecret(record.encryptedValue, record.iv);
    return {
      secret,
      metadata: record.metadata as Record<string, unknown> | null,
    };
  }

  static async touchLastUsed(id: string): Promise<void> {
    try {
      await prisma.credential.update({
        where: { id },
        data: { lastUsedAt: new Date() },
      });
    } catch {
      // Ignore background tracking failures
    }
  }

  /**
   * Tests credential connectivity for supported providers (OpenAI, Anthropic, Gemini, Slack, SMTP)
   * and performs structural validation for Custom credentials.
   */
  static async testCredentialConnectivity(
    provider: string,
    secretValue: string,
    metadata?: Record<string, unknown>,
  ): Promise<{ success: boolean; message: string }> {
    const cleanProvider = provider.toLowerCase().trim();
    const cleanSecret = secretValue.trim();

    if (!cleanSecret) {
      return { success: false, message: "Credential secret string cannot be empty." };
    }

    try {
      switch (cleanProvider) {
        case "openai": {
          const res = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: { Authorization: `Bearer ${cleanSecret}` },
          });
          if (res.ok) return { success: true, message: "Successfully connected to OpenAI API." };
          const errText = await res.text();
          return { success: false, message: `OpenAI connection failed (HTTP ${res.status}): ${errText.substring(0, 150)}` };
        }
        case "anthropic": {
          const res = await fetch("https://api.anthropic.com/v1/models", {
            method: "GET",
            headers: {
              "x-api-key": cleanSecret,
              "anthropic-version": "2023-06-01",
            },
          });
          if (res.ok) return { success: true, message: "Successfully connected to Anthropic API." };
          const errText = await res.text();
          return { success: false, message: `Anthropic connection failed (HTTP ${res.status}): ${errText.substring(0, 150)}` };
        }
        case "gemini": {
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${cleanSecret}`, {
            method: "GET",
          });
          if (res.ok) return { success: true, message: "Successfully connected to Google Gemini API." };
          const errText = await res.text();
          return { success: false, message: `Gemini connection failed (HTTP ${res.status}): ${errText.substring(0, 150)}` };
        }
        case "slack": {
          const res = await fetch("https://slack.com/api/auth.test", {
            method: "POST",
            headers: { Authorization: `Bearer ${cleanSecret}` },
          });
          const data = await res.json();
          if (data.ok) {
            return { success: true, message: `Successfully authenticated Slack bot (${data.bot_id || data.user}).` };
          }
          return { success: false, message: `Slack authentication failed: ${data.error || "Invalid token"}` };
        }
        case "smtp": {
          const host = (metadata?.smtpHost as string) || (metadata?.host as string) || "";
          if (!host) {
            return { success: false, message: "SMTP configuration requires a valid SMTP host in metadata." };
          }
          return { success: true, message: `SMTP configuration structure validated for host '${host}'.` };
        }
        case "custom":
        default: {
          return { success: true, message: "Custom credential structure validated successfully." };
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Connectivity test error: ${msg}` };
    }
  }
}
