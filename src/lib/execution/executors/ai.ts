import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { buildExecutionExpressionContext, resolveExpression } from "../expression";
import { CredentialService } from "@/lib/security/credential-service";
import { WorkflowMemoryService } from "@/lib/ai/workflow-memory";

export const AIExecutor: NodeExecutor = {
  definitionId: "ai",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const providerName = ((config.provider as string) || "openai").toLowerCase().trim();

    let cleanProvider = "openai";
    if (providerName.includes("claude") || providerName.includes("anthropic")) {
      cleanProvider = "claude";
    } else if (providerName.includes("gemini")) {
      cleanProvider = "gemini";
    }

    const rawCredentialId = (config.credentialId as string) || (config.credential_id as string) || "";
    const credentialId = rawCredentialId.trim();

    let secret = "";

    if (credentialId) {
      try {
        const cred = await CredentialService.getDecryptedCredential(
          credentialId,
          context.userId || undefined,
        );
        if (cred && cred.secret) {
          secret = cred.secret.trim();
        } else {
          return {
            status: "failed",
            error: "Selected AI credential could not be found or decrypted.",
          };
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        return {
          status: "failed",
          error: `Credential retrieval failed: ${msg}`,
        };
      }
    }

    // Environment variable fallback if credentialId is omitted
    if (!secret) {
      if (cleanProvider === "claude") {
        secret = (process.env.ANTHROPIC_API_KEY || "").trim();
      } else if (cleanProvider === "gemini") {
        secret = (process.env.GEMINI_API_KEY || "").trim();
      } else {
        secret = (process.env.OPENAI_API_KEY || "").trim();
      }
    }

    if (!secret) {
      return {
        status: "failed",
        error: "AI credential is required.",
      };
    }

    // Step 2: Build expression context and resolve prompts
    const contextData = buildExecutionExpressionContext(context, input);

    const mode = (config.mode as string) || "standard"; // "standard" | "planner"
    const responseType = (config.responseType as string) || "text"; // "text" | "json"
    const memoryScope = (config.memoryScope as string) || "disabled"; // "disabled" | "workflow"

    let rawPrompt = (config.prompt as string) || "";
    if (mode === "planner") {
      rawPrompt = `Decompose the following prompt into a structured execution step breakdown with 'steps' array of clear actions:\n${rawPrompt}`;
    }

    const prompt = resolveExpression(rawPrompt, contextData);

    if (!prompt || !prompt.trim()) {
      return {
        status: "failed",
        error: "NODE_CONFIG_INVALID: AI prompt is required.",
      };
    }

    let rawSystemPrompt = (config.systemPrompt as string) || "";
    if (responseType === "json" || mode === "planner") {
      rawSystemPrompt += "\nYou MUST return valid JSON format.";
    }
    const systemPrompt = rawSystemPrompt ? resolveExpression(rawSystemPrompt, contextData) : "";

    const model = (config.model as string) || (cleanProvider === "claude" ? "claude-3-5-sonnet-20241022" : cleanProvider === "gemini" ? "gemini-3.8-flash" : "gpt-4o-mini");
    const temperature = typeof config.temperature === "number" ? config.temperature : 0.7;
    const maxTokens = typeof config.maxTokens === "number" ? config.maxTokens : 1000;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout limit

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
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const data = await res.json();
          if (!res.ok) {
            const errDetail = data.error?.message || `HTTP ${res.status}`;
            if (res.status === 401 || res.status === 403) {
              return { status: "failed", error: "AI_AUTH_ERROR: Invalid Anthropic API key or unauthorized." };
            }
            if (res.status === 429) {
              return { status: "failed", error: "AI_RATE_LIMIT: Anthropic rate limit exceeded or quota exhausted." };
            }
            return { status: "failed", error: `AI_REQUEST_FAILED: Anthropic API error (HTTP ${res.status}): ${errDetail}` };
          }

          textOutput = data.content?.[0]?.text || "";
          inputTokens = data.usage?.input_tokens;
          outputTokens = data.usage?.output_tokens;
          break;
        }

        case "gemini": {
          const cleanModel = model.replace(/^models\//, "").trim();
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${encodeURIComponent(secret)}`;
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
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const data = await res.json();
          if (!res.ok) {
            const errDetail = data.error?.message || `HTTP ${res.status}`;
            if (res.status === 401 || res.status === 403) {
              return { status: "failed", error: "AI_AUTH_ERROR: Invalid Gemini API key or unauthorized." };
            }
            if (res.status === 429) {
              return { status: "failed", error: "AI_RATE_LIMIT: Gemini rate limit exceeded or quota exhausted." };
            }
            return { status: "failed", error: `AI_REQUEST_FAILED: Gemini API error (HTTP ${res.status}): ${errDetail}` };
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
            signal: controller.signal,
          });

          clearTimeout(timeoutId);
          const data = await res.json();
          if (!res.ok) {
            const errDetail = data.error?.message || `HTTP ${res.status}`;
            if (res.status === 401 || res.status === 403) {
              return { status: "failed", error: "AI_AUTH_ERROR: Invalid OpenAI API key or unauthorized." };
            }
            if (res.status === 429) {
              return { status: "failed", error: "AI_RATE_LIMIT: OpenAI rate limit exceeded or quota exhausted." };
            }
            return { status: "failed", error: `AI_REQUEST_FAILED: OpenAI API error (HTTP ${res.status}): ${errDetail}` };
          }

          if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
            return { status: "failed", error: "AI_MALFORMED_RESPONSE: OpenAI API response missing choices array." };
          }

          textOutput = data.choices[0]?.message?.content || "";
          inputTokens = data.usage?.prompt_tokens;
          outputTokens = data.usage?.completion_tokens;
          break;
        }
      }

      if (typeof textOutput !== "string") {
        return { status: "failed", error: "AI_MALFORMED_RESPONSE: AI output text is missing or invalid." };
      }

      const tokensIn = inputTokens || Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
      const tokensOut = outputTokens || Math.ceil(textOutput.length / 4);

      let costPer1MIn = 0.50;
      let costPer1MOut = 1.50;
      if (model.includes("gpt-4o-mini")) {
        costPer1MIn = 0.15;
        costPer1MOut = 0.60;
      } else if (model.includes("gpt-4o")) {
        costPer1MIn = 2.50;
        costPer1MOut = 10.00;
      } else if (model.includes("claude")) {
        costPer1MIn = 3.00;
        costPer1MOut = 15.00;
      } else if (model.includes("gemini")) {
        costPer1MIn = 0.075;
        costPer1MOut = 0.30;
      }

      const cost = parseFloat(
        ((tokensIn / 1000000) * costPer1MIn + (tokensOut / 1000000) * costPer1MOut).toFixed(6),
      );

      let parsedOutput: Record<string, unknown> | null = null;
      if (responseType === "json" || mode === "planner") {
        try {
          const cleanedText = textOutput.replace(/```json\n?|\n?```/g, "").trim();
          parsedOutput = JSON.parse(cleanedText);
        } catch {
          parsedOutput = { rawText: textOutput, parseError: "Failed to parse JSON" };
        }
      }

      const finalOutputData = {
        text: textOutput,
        json: parsedOutput,
        mode,
        responseType,
        provider: cleanProvider,
        model,
        usage: {
          inputTokens: tokensIn,
          outputTokens: tokensOut,
          estimatedCost: cost,
        },
      };

      if (memoryScope === "workflow" && context.workflowId) {
        await WorkflowMemoryService.setMemory(context.workflowId, `node_output_${node.id}`, finalOutputData);
      }

      return {
        status: "success",
        output: finalOutputData,
        metrics: {
          provider: cleanProvider,
          model,
          tokensIn,
          tokensOut,
          cost,
        },
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === "AbortError") {
        return {
          status: "failed",
          error: "AI_TIMEOUT: AI request timed out after 15s.",
        };
      }
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: `AI_NETWORK_ERROR: ${msg}`,
      };
    }
  },
};
