/**
 * Safe expression resolver for workflow node inputs & condition evaluation.
 * Resolves template tags like `{{lead.score}}` or `{{node_1.text}}` from context objects.
 * NO eval or new Function used.
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

export function resolveExpression(
  template: string,
  contextData: Record<string, unknown>,
): string {
  if (typeof template !== "string" || !template.includes("{{")) {
    return template;
  }

  return template.replace(/\{\{\s*([\w\.\-]+)\s*\}\}/g, (_, path) => {
    const val = resolvePropertyPath(contextData, path);
    if (val === undefined || val === null) {
      return "";
    }
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  });
}
