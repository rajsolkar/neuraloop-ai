/**
 * Neuraloop Phase 21 — Nori Debug Assistant Engine
 * Analyzes execution failures and error logs, providing human-friendly breakdowns,
 * root causes, and actionable one-click fix recommendations.
 */

export interface DebugFixAction {
  id: string;
  label: string;
  actionType: "reconnect_oauth" | "update_api_key" | "add_fallback_node" | "add_retry_policy" | "fix_variable_expression";
  targetNodeId?: string;
  targetProvider?: string;
  description: string;
}

export interface DebugAnalysisResult {
  hasError: boolean;
  friendlySummary: string;
  rootCause: string;
  suggestedFixes: DebugFixAction[];
  noriMood: "debugging" | "warning" | "sad";
}

export class NoriDebugger {
  static analyzeExecutionFailure(executionData: {
    status?: string;
    error?: string;
    errorMessage?: string;
    failedNodes?: number;
    nodeExecutions?: Array<{
      nodeId: string;
      nodeName?: string;
      status: string;
      error?: string;
      config?: Record<string, unknown>;
    }>;
  }): DebugAnalysisResult {
    const rawError = executionData.error || executionData.errorMessage || "";
    const failedNode = executionData.nodeExecutions?.find((n) => n.status === "failed");

    if (!rawError && !failedNode) {
      return {
        hasError: false,
        friendlySummary: "No execution failures detected. All nodes ran cleanly!",
        rootCause: "N/A",
        suggestedFixes: [],
        noriMood: "debugging",
      };
    }

    const errStr = (rawError + " " + (failedNode?.error || "")).toLowerCase();
    const nodeLabel = failedNode?.nodeName || failedNode?.nodeId || "Action node";

    // 1. HTTP 401 / Authentication Error
    if (errStr.includes("401") || errStr.includes("unauthorized") || errStr.includes("invalid credential") || errStr.includes("token expired")) {
      return {
        hasError: true,
        friendlySummary: `Your API request in '${nodeLabel}' was rejected because the access token or credential is invalid or expired.`,
        rootCause: "HTTP 401 Unauthorized response from target service provider API.",
        noriMood: "debugging",
        suggestedFixes: [
          {
            id: "fix-auth-reconnect",
            label: "Reconnect OAuth Connection",
            actionType: "reconnect_oauth",
            description: "Refresh or re-authenticate your OAuth token in workspace settings.",
          },
          {
            id: "fix-auth-key",
            label: "Update API Key Secret",
            actionType: "update_api_key",
            description: "Check Vault credential secret and replace expired API key.",
          },
        ],
      };
    }

    // 2. HTTP 404 / Resource Not Found
    if (errStr.includes("404") || errStr.includes("not found")) {
      return {
        hasError: true,
        friendlySummary: `The resource requested by '${nodeLabel}' was not found at the endpoint.`,
        rootCause: "Target URL or ID parameter does not exist on target service.",
        noriMood: "warning",
        suggestedFixes: [
          {
            id: "fix-expression",
            label: "Verify Variable Expressions",
            actionType: "fix_variable_expression",
            description: "Ensure handle expressions (e.g. {{steps.trigger.body.id}}) resolve to valid IDs.",
          },
        ],
      };
    }

    // 3. Timeout / Rate Limit
    if (errStr.includes("429") || errStr.includes("rate limit") || errStr.includes("timeout")) {
      return {
        hasError: true,
        friendlySummary: `'${nodeLabel}' failed due to rate limiting or request timeout.`,
        rootCause: "API provider returned HTTP 429 Too Many Requests or connection timed out.",
        noriMood: "warning",
        suggestedFixes: [
          {
            id: "fix-retry",
            label: "Add Exponential Retry Policy",
            actionType: "add_retry_policy",
            targetNodeId: failedNode?.nodeId,
            description: "Automatically retry failed requests with exponential backoff.",
          },
        ],
      };
    }

    // Default Fallback Failure Diagnosis
    return {
      hasError: true,
      friendlySummary: `'${nodeLabel}' encountered an unhandled execution exception: ${rawError || failedNode?.error || "Unknown error"}.`,
      rootCause: rawError || failedNode?.error || "Internal step execution error",
      noriMood: "sad",
      suggestedFixes: [
        {
          id: "fix-fallback-node",
          label: "Add Failure Notification Fallback",
          actionType: "add_fallback_node",
          description: "Attach a Slack/Email failure path to handle future errors gracefully.",
        },
        {
          id: "fix-retry-policy",
          label: "Enable Automatic Retries",
          actionType: "add_retry_policy",
          targetNodeId: failedNode?.nodeId,
          description: "Retry step execution up to 3 times automatically.",
        },
      ],
    };
  }
}
