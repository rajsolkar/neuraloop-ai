import type { ExecutionContext } from "./types";

export function buildExecutionExpressionContext(
  context: ExecutionContext,
  input: Record<string, unknown> = {},
): Record<string, unknown> {
  const stepsMap: Record<string, unknown> = {};
  let latestOutputObj: Record<string, unknown> = {};
  const allOutputsObj: Record<string, unknown> = {};

  const entries = Object.entries(context.nodeOutputs ?? {});
  for (const [nodeId, outputVal] of entries) {
    if (outputVal && typeof outputVal === "object" && !Array.isArray(outputVal)) {
      const obj = outputVal as Record<string, unknown>;
      stepsMap[nodeId] = obj;
      latestOutputObj = obj;
      Object.assign(allOutputsObj, obj);
    } else {
      stepsMap[nodeId] = { value: outputVal };
      latestOutputObj = { value: outputVal };
      allOutputsObj[nodeId] = outputVal;
    }
  }

  if (context.metadata?.nodeTypes && typeof context.metadata.nodeTypes === "object") {
    const nodeTypes = context.metadata.nodeTypes as Record<string, string>;
    for (const [nodeId, nodeType] of Object.entries(nodeTypes)) {
      if (stepsMap[nodeId] !== undefined) {
        stepsMap[nodeType] = stepsMap[nodeId];
      }
    }
  }

  const rootInput = context.input && Object.keys(context.input).length > 0 ? context.input : input;

  const triggerObj = {
    ...rootInput,
    body: (rootInput.body as Record<string, unknown>) || rootInput,
    query: (rootInput.query as Record<string, unknown>) || {},
    headers: (rootInput.headers as Record<string, unknown>) || {},
  };

  return {
    ...allOutputsObj,
    ...latestOutputObj,
    ...rootInput,
    input: rootInput,
    trigger: triggerObj,
    latest: latestOutputObj,
    steps: stepsMap,
    ...stepsMap,
  };
}

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
