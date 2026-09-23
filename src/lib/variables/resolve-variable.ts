/**
 * Universal Variable Resolver Engine v2
 * Resolves handlebar expressions like {{name}}, {{company}}, {{steps.transform.summary}}, {{trigger.body.email}}, {{workflow.id}}
 */

export function resolvePropertyPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined || !path) return undefined;
  const parts = path.trim().split(".");
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Resolves template string with variables from payload context.
 * Falls back to direct top-level keys if nested property lookup misses.
 */
export function resolveVariables(
  template: string,
  payload: Record<string, unknown> = {}
): string {
  if (typeof template !== "string" || !template.includes("{{")) {
    return template ?? "";
  }

  // Sample defaults for live preview fallback when values aren't populated
  const defaultSampleContext: Record<string, unknown> = {
    name: "Raj Solkar",
    email: "raj@example.com",
    company: "Neuraloop AI",
    budget: "$10,000",
    leadScore: 95,
    message: "Interested in automated workflow integration.",
    workflow: { id: "wf_prod_8820", name: "Lead Qualification Pipeline" },
    execution: { id: "exec_run_9941", status: "running" },
    loop: { item: { id: 101, name: "Task Item" }, currentIndex: 0, totalItems: 5 },
    trigger: {
      body: {
        name: "Raj Solkar",
        email: "raj@example.com",
        company: "Neuraloop AI",
        budget: "$10,000",
        message: "Interested in automated workflow integration.",
      },
      query: { source: "google_ads", campaign: "q3_launch" },
      headers: { "user-agent": "Mozilla/5.0" },
      scheduledFor: "2026-09-23T12:00:00.000Z",
    },
  };

  // Merge payload on top of defaults
  const context = {
    ...defaultSampleContext,
    ...payload,
  };

  return template.replace(/\{\{\s*([\w\.\-]+)\s*\}\}/g, (_, rawPath: string) => {
    const path = rawPath.trim();

    // 1. Direct path lookup in context (e.g. "trigger.body.email" or "workflow.id")
    let val = resolvePropertyPath(context, path);

    // 2. Direct top-level key fallback if path wasn't found directly (e.g. "name" -> payload.name)
    if (val === undefined && "trigger" in context && typeof context.trigger === "object" && context.trigger !== null) {
      const triggerBody = (context.trigger as Record<string, unknown>).body;
      if (triggerBody && typeof triggerBody === "object") {
        val = resolvePropertyPath(triggerBody, path);
      }
    }

    if (val === undefined || val === null) {
      return "";
    }
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  });
}
