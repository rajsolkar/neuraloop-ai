import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression } from "../expression";
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

    const mode = (config.mode as string) || "standard"; // "standard" | "planner"
    const responseType = (config.responseType as string) || "text"; // "text" | "json"
    const jsonSchema = (config.jsonSchema as string) || "";
    const memoryScope = (config.memoryScope as string) || "disabled"; // "disabled" | "workflow"

    let rawPrompt = (config.prompt as string) || "Hello";
    
    // Modify prompt if in Planner Mode
    if (mode === "planner") {
      rawPrompt = `Decompose the following prompt into a structured execution step breakdown with 'steps' array of clear actions:\n${rawPrompt}`;
    }

    const prompt = resolveExpression(rawPrompt, contextData);
    let rawSystemPrompt = (config.systemPrompt as string) || "";
    if (responseType === "json" || mode === "planner") {
      rawSystemPrompt += "\nYou MUST return valid JSON format.";
    }
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

      const tokensIn = inputTokens || Math.ceil((prompt.length + (systemPrompt?.length || 0)) / 4);
      const tokensOut = outputTokens || Math.ceil(textOutput.length / 4);

      // Calculate estimated cost
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

      // Parse output if JSON or Planner mode
      let parsedOutput: Record<string, unknown> | null = null;
      if (responseType === "json" || mode === "planner") {
        try {
          // Clean potential markdown ```json blocks
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

      // Persist to WorkflowMemory if workflow memory scope is enabled
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
      const msg = err instanceof Error ? err.message : String(err);
      return {
        status: "failed",
        error: msg,
      };
    }
  },
};
