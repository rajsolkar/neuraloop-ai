import vm from "node:vm";
import type { WorkflowNode } from "@/types/workflow";
import type { ExecutionContext, NodeExecutionResult, NodeExecutor } from "../types";

export const CodeExecutor: NodeExecutor = {
  definitionId: "code",
  async execute(
    node: WorkflowNode,
    input: Record<string, unknown>,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    try {
      const config = (node.data.config as Record<string, unknown>) ?? {};
      const rawCode = (config.code as string) || "return { success: true };";

      const injectedInput = JSON.parse(JSON.stringify(context.input || input || {}));
      const injectedSteps = JSON.parse(JSON.stringify(context.nodeOutputs || {}));

      // Security Sandbox Isolation Context
      const sandbox = Object.create(null);
      sandbox.input = injectedInput;
      sandbox.steps = injectedSteps;
      sandbox.console = Object.freeze({
        log: () => {},
        error: () => {},
        warn: () => {},
        info: () => {},
      });
      sandbox.Math = Math;
      sandbox.JSON = JSON;
      sandbox.Array = Array;
      sandbox.Object = Object;
      sandbox.String = String;
      sandbox.Number = Number;
      sandbox.Boolean = Boolean;
      sandbox.Date = Date;
      sandbox.RegExp = RegExp;
      sandbox.parseInt = parseInt;
      sandbox.parseFloat = parseFloat;
      sandbox.isNaN = isNaN;
      sandbox.isFinite = isFinite;
      sandbox.encodeURI = encodeURI;
      sandbox.encodeURIComponent = encodeURIComponent;
      sandbox.decodeURI = decodeURI;
      sandbox.decodeURIComponent = decodeURIComponent;

      const vmContext = vm.createContext(sandbox);

      const wrappedCode = `(async function(input, steps) {\n${rawCode}\n})(input, steps)`;

      const script = new vm.Script(wrappedCode, {
        filename: "user-code.js",
      });

      // Synchronous V8 CPU execution limit (2 seconds)
      const executionResultPromise = script.runInContext(vmContext, {
        timeout: 2000,
        displayErrors: true,
      });

      // Total asynchronous execution limit (5 seconds)
      const asyncTimeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("CODE_TIMEOUT: Code node execution timed out after 5s.")),
          5000,
        ),
      );

      const rawResult = await Promise.race([
        Promise.resolve(executionResultPromise),
        asyncTimeoutPromise,
      ]);

      let formattedOutput: Record<string, unknown>;
      if (rawResult !== null && typeof rawResult === "object" && !Array.isArray(rawResult)) {
        formattedOutput = rawResult as Record<string, unknown>;
      } else {
        formattedOutput = { result: rawResult };
      }

      // Memory & Output Size Safeguard (Max 1MB output payload)
      const serialized = JSON.stringify(formattedOutput);
      if (serialized.length > 1024 * 1024) {
        return {
          status: "failed",
          error: "CODE_OUTPUT_EXCEEDED: Code node output exceeds 1MB limit.",
        };
      }

      return {
        status: "success",
        output: formattedOutput,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes("Script execution timed out")) {
        return {
          status: "failed",
          error: "CODE_TIMEOUT: Code execution timed out (CPU limit 2s exceeded).",
        };
      }
      return {
        status: "failed",
        error: `Code Node Execution Error: ${errorMsg}`,
      };
    }
  },
};
