import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";

export const AIExecutor: NodeExecutor = {
  definitionId: "ai",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const rawCredentialId = (config.credentialId as string) || (config.credential_id as string) || "";
    const credentialId = rawCredentialId.trim();

    // CRITICAL SECURITY MANDATE: Fail if missing credential. NO FALLBACK TO OPENAI_API_KEY.
    if (!credentialId) {
      return {
        status: "failed",
        error: "AI credential is required.",
      };
    }

    // Step 1: Load & decrypt secret key from Credential Vault
    let secret = "";
    let providerName = (config.provider as string) || "openai";
    try {
      const cred = await CredentialService.getDecryptedCredential(
        credentialId,
        context.userId || undefined,
      );
      if (!cred || !cred.secret) {
        return {
          status: "failed",
          error: "Selected AI credential could not be found or decrypted.",
        };
      }
      secret = cred.secret.trim();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `Credential retrieval failed: ${msg}`,
      };
    }

    if (!secret) {
      return {
        status: "failed",
        error: "AI credential secret is empty.",
      };
    }

    // Step 2: Prepare inputs & expressions
    const contextData = {
      input: context.input,
      steps: context.nodeOutputs,
      trigger: context.input,
      ...input,
    };

    const rawPrompt = (config.prompt as string) || "Hello";
    const prompt = resolveExpression(rawPrompt, contextData);

    const rawSystemPrompt = (config.systemPrompt as string) || "";
    const systemPrompt = rawSystemPrompt ? resolveExpression(rawSystemPrompt, contextData) : "";

    const model = (config.model as string) || "gpt-4o-mini";
    const temperature = typeof config.temperature === "number" ? config.temperature : 0.7;
    const maxTokens = typeof config.maxTokens === "number" ? config.maxTokens : 1000;

    let cleanProvider = providerName.toLowerCase().trim();
    if (cleanProvider.includes("claude") || cleanProvider.includes("anthropic")) cleanProvider = "claude";
    else if (cleanProvider.includes("gemini")) cleanProvider = "gemini";
    else cleanProvider = "openai";

    try {
      let textOutput = "";
      let inputTokens: number | undefined;
      let outputTokens: number | undefined;

      switch (cleanProvider) {
        case "claude": {
          const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": secret,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: maxTokens,
              temperature,
              ...(systemPrompt ? { system: systemPrompt } : {}),
              messages: [{ role: "user", content: prompt }],
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(`Claude API error (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data)}`);
          }

          textOutput = data.content?.[0]?.text || "";
          inputTokens = data.usage?.input_tokens;
          outputTokens = data.usage?.output_tokens;
          break;
        }

        case "gemini": {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(secret)}`;
          const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
              generationConfig: {
                temperature,
                maxOutputTokens: maxTokens,
              },
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(`Gemini API error (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data)}`);
          }

          textOutput = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          inputTokens = data.usageMetadata?.promptTokenCount;
          outputTokens = data.usageMetadata?.candidatesTokenCount;
          break;
        }

        case "openai":
        default: {
          const res = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${secret}`,
            },
            body: JSON.stringify({
              model,
              messages: [
                ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
                { role: "user", content: prompt },
              ],
              temperature,
              max_tokens: maxTokens,
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            throw new Error(`OpenAI API error (HTTP ${res.status}): ${data.error?.message || JSON.stringify(data)}`);
          }

          textOutput = data.choices?.[0]?.message?.content || "";
          inputTokens = data.usage?.prompt_tokens;
          outputTokens = data.usage?.completion_tokens;
          break;
        }
      }

      return {
        status: "success",
        output: {
          text: textOutput,
          provider: cleanProvider,
          model,
          usage: {
            inputTokens,
            outputTokens,
          },
        },
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: msg,
      };
    }
  },
};
