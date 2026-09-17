import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";
import { resolveExpression, resolvePropertyPath } from "../expression";

/**
  * Modular Transform Operation Handlers
  */

// 1. Field Operations (add_field, remove_field, rename_field, keep_fields, set_default_values)
function handleFieldOperations(
  op: string,
  config: Record<string, unknown>,
  input: Record<string, unknown>,
  contextData: Record<string, unknown>,
): unknown {
  const obj: Record<string, unknown> = typeof input === "object" && input !== null ? { ...input } : { data: input };

  switch (op) {
    case "add_field": {
      const rawKey = (config.key as string) || "fieldName";
      const key = resolveExpression(rawKey, contextData);
      const rawVal = (config.value as string) ?? "";
      const val = resolveExpression(rawVal, contextData);
      obj[key] = val;
      return obj;
    }

    case "remove_field": {
      const path = (config.targetPath as string) || "";
      if (path && path in obj) {
        delete obj[path];
      }
      return obj;
    }

    case "rename_field": {
      const targetPath = (config.targetPath as string) || "";
      const newKey = (config.newKey as string) || "";
      if (targetPath && newKey && targetPath in obj) {
        obj[newKey] = obj[targetPath];
        delete obj[targetPath];
      }
      return obj;
    }

    case "keep_fields": {
      const keepKeys = (config.keepKeys as string[]) || [];
      const targetStr = (config.targetPath as string) || "";
      const keysToKeep = keepKeys.length > 0
        ? keepKeys
        : targetStr.split(",").map((k) => k.trim()).filter(Boolean);

      if (keysToKeep.length === 0) return obj;

      const filtered: Record<string, unknown> = {};
      for (const k of keysToKeep) {
        if (k in obj) {
          filtered[k] = obj[k];
        }
      }
      return filtered;
    }

    case "set_default_values": {
      const defaults = (config.defaultValues as Array<{ key: string; value: string }>) || [];
      for (const d of defaults) {
        if (!d.key) continue;
        const current = obj[d.key];
        if (current === undefined || current === null || current === "") {
          obj[d.key] = resolveExpression(d.value, contextData);
        }
      }
      return obj;
    }

    default:
      return obj;
  }
}

// 2. JSON Operations (merge_objects, flatten_json, extract_nested, json_parse_stringify)
function handleJsonOperations(
  op: string,
  config: Record<string, unknown>,
  input: Record<string, unknown>,
  contextData: Record<string, unknown>,
): unknown {
  switch (op) {
    case "merge_objects": {
      let combined: Record<string, unknown> = typeof input === "object" && input !== null ? { ...input } : {};
      const sources = (config.mergeSources as string[]) || [];

      for (const src of sources) {
        const resolvedStr = resolveExpression(src, contextData);
        try {
          const parsed = JSON.parse(resolvedStr);
          if (typeof parsed === "object" && parsed !== null) {
            combined = { ...combined, ...parsed };
          }
        } catch {
          // Ignore non-json merge sources
        }
      }
      return combined;
    }

    case "flatten_json": {
      const flattenObj = (data: unknown, prefix = ""): Record<string, unknown> => {
        const res: Record<string, unknown> = {};
        if (typeof data === "object" && data !== null && !Array.isArray(data)) {
          for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
            const newKey = prefix ? `${prefix}.${k}` : k;
            if (typeof v === "object" && v !== null && !Array.isArray(v)) {
              Object.assign(res, flattenObj(v, newKey));
            } else {
              res[newKey] = v;
            }
          }
        } else {
          res[prefix || "val"] = data;
        }
        return res;
      };

      return flattenObj(input);
    }

    case "extract_nested": {
      const paths = (config.extractPaths as string[]) || [];
      const extracted: Record<string, unknown> = {};

      for (const p of paths) {
        if (!p) continue;
        const resolvedVal = resolvePropertyPath(contextData, p) ?? resolvePropertyPath(input, p);
        if (resolvedVal !== undefined) {
          const lastKey = p.split(".").pop() || p;
          extracted[lastKey] = resolvedVal;
        }
      }
      return extracted;
    }

    case "json_parse_stringify": {
      const mode = (config.jsonMode as string) || "parse";
      if (mode === "stringify") {
        return { jsonString: JSON.stringify(input) };
      }
      // Parse mode
      const targetStr = typeof input.data === "string" ? input.data : JSON.stringify(input);
      try {
        return JSON.parse(targetStr);
      } catch {
        return { parsed: targetStr };
      }
    }

    default:
      return input;
  }
}

// 3. String Operations (uppercase, lowercase, trim, concat, slice, replace)
function handleStringOperations(
  config: Record<string, unknown>,
  input: Record<string, unknown>,
  contextData: Record<string, unknown>,
): unknown {
  const stringOp = (config.stringOp as string) || "uppercase";
  const rawTarget = (config.targetPath as string) || "";
  let text = "";

  if (rawTarget) {
    const val = resolvePropertyPath(contextData, rawTarget) ?? resolvePropertyPath(input, rawTarget);
    text = String(val ?? "");
  } else if (typeof input.text === "string") {
    text = input.text;
  } else {
    text = JSON.stringify(input);
  }

  const p1 = resolveExpression((config.param1 as string) || "", contextData);
  const p2 = resolveExpression((config.param2 as string) || "", contextData);

  let resultText = text;
  switch (stringOp) {
    case "uppercase":
      resultText = text.toUpperCase();
      break;
    case "lowercase":
      resultText = text.toLowerCase();
      break;
    case "trim":
      resultText = text.trim();
      break;
    case "concat":
      resultText = text + p1;
      break;
    case "slice": {
      const start = parseInt(p1, 10) || 0;
      const end = p2 ? parseInt(p2, 10) : undefined;
      resultText = text.slice(start, end);
      break;
    }
    case "replace":
      resultText = text.replace(new RegExp(p1, "g"), p2);
      break;
  }

  return { text: resultText, original: text };
}

// 4. Date Operations (iso, timestamp, locale_date)
function handleDateOperations(
  config: Record<string, unknown>,
  input: Record<string, unknown>,
  contextData: Record<string, unknown>,
): unknown {
  const dateFormat = (config.dateFormat as string) || "iso";
  const rawTarget = (config.targetPath as string) || "";
  let dateVal: Date;

  if (rawTarget) {
    const val = resolvePropertyPath(contextData, rawTarget) ?? resolvePropertyPath(input, rawTarget);
    dateVal = val ? new Date(String(val)) : new Date();
  } else {
    dateVal = new Date();
  }

  if (isNaN(dateVal.getTime())) {
    dateVal = new Date();
  }

  switch (dateFormat) {
    case "timestamp":
      return { timestamp: dateVal.getTime() };
    case "locale_date":
      return { dateString: dateVal.toLocaleDateString() };
    case "iso":
    default:
      return { isoString: dateVal.toISOString() };
  }
}

// 5. Math Operations (add, subtract, multiply, divide, round, floor, ceil)
function handleMathOperations(
  config: Record<string, unknown>,
  input: Record<string, unknown>,
  contextData: Record<string, unknown>,
): unknown {
  const mathOp = (config.mathOp as string) || "add";
  const rawTarget = (config.targetPath as string) || "";
  const operand = typeof config.operand === "number" ? config.operand : parseFloat(String(config.operand || "0"));
  
  let baseNum = 0;
  if (rawTarget) {
    const val = resolvePropertyPath(contextData, rawTarget) ?? resolvePropertyPath(input, rawTarget);
    baseNum = parseFloat(String(val || "0"));
  } else if (typeof input.value === "number") {
    baseNum = input.value;
  }

  if (isNaN(baseNum)) baseNum = 0;

  let calculated = baseNum;
  switch (mathOp) {
    case "add":
      calculated = baseNum + operand;
      break;
    case "subtract":
      calculated = baseNum - operand;
      break;
    case "multiply":
      calculated = baseNum * operand;
      break;
    case "divide":
      calculated = operand !== 0 ? baseNum / operand : 0;
      break;
    case "round":
      calculated = Math.round(baseNum);
      break;
    case "floor":
      calculated = Math.floor(baseNum);
      break;
    case "ceil":
      calculated = Math.ceil(baseNum);
      break;
  }

  return { value: calculated, base: baseNum, operand };
}

export const TransformExecutor: NodeExecutor = {
  definitionId: "transform",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    const config = (node.data.config as Record<string, unknown>) ?? {};
    const operation = (config.operation as string) || "add_field";

    const stepsMap: Record<string, unknown> = {};
    for (const [nodeId, outputVal] of Object.entries(context.nodeOutputs ?? {})) {
      if (typeof outputVal === "object" && outputVal !== null) {
        stepsMap[nodeId] = {
          ...(outputVal as Record<string, unknown>),
          output: outputVal,
        };
      } else {
        stepsMap[nodeId] = {
          value: outputVal,
          output: outputVal,
        };
      }
    }

    const contextData: Record<string, unknown> = {
      input: context.input,
      steps: stepsMap,
      trigger: context.input,
      ...stepsMap,
      ...input,
    };

    let transformedResult: unknown;

    switch (operation) {
      case "add_field":
      case "remove_field":
      case "rename_field":
      case "keep_fields":
      case "set_default_values":
        transformedResult = handleFieldOperations(operation, config, input, contextData);
        break;

      case "merge_objects":
      case "flatten_json":
      case "extract_nested":
      case "json_parse_stringify":
        transformedResult = handleJsonOperations(operation, config, input, contextData);
        break;

      case "string_format":
        transformedResult = handleStringOperations(config, input, contextData);
        break;

      case "date_format":
        transformedResult = handleDateOperations(config, input, contextData);
        break;

      case "math_operation":
        transformedResult = handleMathOperations(config, input, contextData);
        break;

      default:
        transformedResult = handleFieldOperations("add_field", config, input, contextData);
        break;
    }

    return {
      status: "success",
      output: {
        operation,
        result: transformedResult,
        ...(typeof transformedResult === "object" && transformedResult !== null ? (transformedResult as Record<string, unknown>) : {}),
      },
    };
  },
};
