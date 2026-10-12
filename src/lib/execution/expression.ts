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
      const jsonSub = (obj.json && typeof obj.json === "object" && !Array.isArray(obj.json))
        ? (obj.json as Record<string, unknown>)
        : {};
      const dataSub = (obj.data && typeof obj.data === "object" && !Array.isArray(obj.data))
        ? (obj.data as Record<string, unknown>)
        : {};
      const resultSub = (obj.result && typeof obj.result === "object" && !Array.isArray(obj.result))
        ? (obj.result as Record<string, unknown>)
        : {};
      const resultDataSub = (resultSub.data && typeof resultSub.data === "object" && !Array.isArray(resultSub.data))
        ? (resultSub.data as Record<string, unknown>)
        : {};

      const mergedStep: Record<string, unknown> = {
        ...resultDataSub,
        ...resultSub,
        ...dataSub,
        ...jsonSub,
        ...obj,
        json: obj.json,
        data: obj.data,
        result: obj.result,
        output: obj,
      };

      // Guarantee severity property if isUrgent exists on step output
      if (mergedStep.severity === undefined && mergedStep.isUrgent !== undefined) {
        mergedStep.severity = Boolean(mergedStep.isUrgent) ? "CRITICAL" : "LOW";
        if (mergedStep.json && typeof mergedStep.json === "object") {
          (mergedStep.json as Record<string, unknown>).severity = mergedStep.severity;
        }
      }

      stepsMap[nodeId] = mergedStep;
      latestOutputObj = mergedStep;
      Object.assign(allOutputsObj, mergedStep);
    } else {
      stepsMap[nodeId] = { value: outputVal, output: outputVal };
      latestOutputObj = { value: outputVal, output: outputVal };
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

  // Collect trigger node output to ensure root input and trigger expressions always resolve
  let triggerNodeOutput: Record<string, unknown> = {};
  if (context.metadata?.nodeTypes && typeof context.metadata.nodeTypes === "object") {
    const nodeTypes = context.metadata.nodeTypes as Record<string, string>;
    for (const [nodeId, defId] of Object.entries(nodeTypes)) {
      if (["manual-trigger", "webhook", "schedule"].includes(defId)) {
        const out = context.nodeOutputs?.[nodeId];
        if (out && typeof out === "object" && !Array.isArray(out)) {
          triggerNodeOutput = { ...triggerNodeOutput, ...(out as Record<string, unknown>) };
        }
      }
    }
  }

  const rootInput = {
    ...triggerNodeOutput,
    ...input,
    ...(context.input && Object.keys(context.input).length > 0 ? context.input : {}),
  };

  const triggerObj = {
    ...triggerNodeOutput,
    ...rootInput,
    body: (rootInput.body as Record<string, unknown>) || rootInput,
    query: (rootInput.query as Record<string, unknown>) || {},
    headers: (rootInput.headers as Record<string, unknown>) || {},
  };

  const nowIso = new Date().toISOString();

  return {
    ...allOutputsObj,
    ...latestOutputObj,
    ...rootInput,
    input: rootInput,
    $input: rootInput,
    trigger: triggerObj,
    $trigger: triggerObj,
    latest: latestOutputObj,
    steps: stepsMap,
    $steps: stepsMap,
    timestamp: nowIso,
    $timestamp: nowIso,
    now: nowIso,
    $now: nowIso,
    ...stepsMap,
  };
}

export function resolvePropertyPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined || !path) return undefined;
  const cleanPath = path.trim().replace(/\[['"]?([^'"]+)['"]?\]/g, ".$1");
  const parts = cleanPath.split(".").filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    const record = current as Record<string, unknown>;
    if (part in record) {
      current = record[part];
    } else if (part.startsWith("$") && part.slice(1) in record) {
      current = record[part.slice(1)];
    } else if (`$${part}` in record) {
      current = record[`$${part}`];
    } else if (record.json && typeof record.json === "object" && part in (record.json as Record<string, unknown>)) {
      current = (record.json as Record<string, unknown>)[part];
    } else if (record.data && typeof record.data === "object" && part in (record.data as Record<string, unknown>)) {
      current = (record.data as Record<string, unknown>)[part];
    } else if (record.result && typeof record.result === "object" && part in (record.result as Record<string, unknown>)) {
      current = (record.result as Record<string, unknown>)[part];
    } else if (
      record.result &&
      typeof record.result === "object" &&
      (record.result as Record<string, unknown>).data &&
      typeof (record.result as Record<string, unknown>).data === "object" &&
      part in ((record.result as Record<string, unknown>).data as Record<string, unknown>)
    ) {
      current = ((record.result as Record<string, unknown>).data as Record<string, unknown>)[part];
    } else if (record.output && typeof record.output === "object" && part in (record.output as Record<string, unknown>)) {
      current = (record.output as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export interface ExpressionResolveOptions {
  fallback?: string;
  observableMissing?: boolean;
  onMissing?: (path: string) => void;
}

export function resolveExpression(
  template: string,
  contextData: Record<string, unknown>,
  options?: ExpressionResolveOptions,
): string {
  if (typeof template !== "string" || !template.includes("{{")) {
    return template;
  }

  return template.replace(/\{\{\s*([$\w\.\-\[\]'"]+)\s*\}\}/g, (_, path) => {
    const val = resolvePropertyPath(contextData, path);
    if (val === undefined || val === null) {
      if (options?.onMissing) {
        options.onMissing(path);
      }
      if (options?.observableMissing) {
        return `[Missing: ${path}]`;
      }
      return options?.fallback !== undefined ? options.fallback : "";
    }
    if (typeof val === "object") {
      return JSON.stringify(val);
    }
    return String(val);
  });
}

export function getMissingExpressionVariables(
  template: string,
  contextData: Record<string, unknown>,
): string[] {
  if (typeof template !== "string" || !template.includes("{{")) {
    return [];
  }
  const missing: string[] = [];
  const regex = /\{\{\s*([$\w\.\-\[\]'"]+)\s*\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(template)) !== null) {
    const path = match[1];
    const val = resolvePropertyPath(contextData, path);
    if (val === undefined || val === null) {
      missing.push(path);
    }
  }
  return missing;
}

/**
 * Universal Value Resolver:
 * Recursively resolves expressions inside primitives, arrays, objects, and JSON templates.
 * Preserves actual JavaScript types (number, boolean, array, object) where appropriate.
 */
export function resolveValue(
  value: unknown,
  contextData: Record<string, unknown>,
): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  // 1. Array: recursively resolve each item
  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, contextData));
  }

  // 2. Non-string primitives (number, boolean)
  if (typeof value !== "string") {
    if (typeof value === "object") {
      const resolvedObj: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        resolvedObj[resolveExpression(k, contextData)] = resolveValue(v, contextData);
      }
      return resolvedObj;
    }
    return value;
  }

  const str = value.trim();

  // 3. String without {{ expressions: check if it represents a JSON array or object
  if (!str.includes("{{")) {
    if ((str.startsWith("[") && str.endsWith("]")) || (str.startsWith("{") && str.endsWith("}"))) {
      try {
        return JSON.parse(str);
      } catch {
        try {
          const relaxed = str.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
          return JSON.parse(relaxed);
        } catch {
          return value;
        }
      }
    }
    return value;
  }

  // 4. Exact single variable: e.g. "{{$steps.node.data.id}}" or "{{steps.node.data}}"
  const exactMatch = str.match(/^\{\{\s*([$\w\.\-\[\]'"]+)\s*\}\}$/);
  if (exactMatch) {
    const resolved = resolvePropertyPath(contextData, exactMatch[1]);
    if (resolved !== undefined) {
      return resolved;
    }
    return "";
  }

  // 5. String is a JSON array or object template containing expressions
  // e.g. '["{{$timestamp}}", "{{$steps.node-http-1.data.quote}}", "{{$steps.node-http-1.data.author}}"]'
  if ((str.startsWith("[") && str.endsWith("]")) || (str.startsWith("{") && str.endsWith("}"))) {
    try {
      const parsedTemplate = JSON.parse(str);
      return resolveValue(parsedTemplate, contextData);
    } catch {
      // Try relaxed single-quoted template e.g. ['{{$timestamp}}', '{{$steps.node.data.quote}}']
      try {
        const relaxedTemplate = str.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
        const parsedRelaxed = JSON.parse(relaxedTemplate);
        return resolveValue(parsedRelaxed, contextData);
      } catch {
        // Fall back to resolving string expressions first
      }

      const interpolated = resolveExpression(str, contextData);
      try {
        return JSON.parse(interpolated);
      } catch {
        try {
          const relaxedInterpolated = interpolated.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, '"$1"');
          return JSON.parse(relaxedInterpolated);
        } catch {
          return interpolated;
        }
      }
    }
  }

  // 6. Regular string interpolation
  return resolveExpression(str, contextData);
}
