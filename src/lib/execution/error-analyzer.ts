export interface HumanizedError {
  title: string;
  explanation: string;
  actionHint: string;
  category: "auth" | "not_found" | "rate_limit" | "network" | "validation" | "quota" | "system";
}

export class ErrorAnalyzer {
  static analyze(rawError: string | unknown, nodeType?: string): HumanizedError {
    const errStr = typeof rawError === "string" ? rawError : String((rawError as Error)?.message || rawError || "");

    if (errStr.includes("401") || errStr.includes("Unauthorized") || errStr.includes("Invalid token") || errStr.includes("token expired")) {
      return {
        title: "Authentication Failed (401)",
        explanation: "Your OAuth connection or API key is invalid, revoked, or expired.",
        actionHint: "Go to Settings > Connections to refresh your account or check your Vault credential key.",
        category: "auth",
      };
    }

    if (errStr.includes("403") || errStr.includes("Forbidden") || errStr.includes("Permission denied")) {
      return {
        title: "Permission Denied (403)",
        explanation: "The target service rejected the request due to insufficient API permissions or missing scopes.",
        actionHint: "Ensure your OAuth connection or API key has full read/write scope access.",
        category: "auth",
      };
    }

    if (errStr.includes("404") || errStr.includes("Not Found")) {
      return {
        title: "Resource Not Found (404)",
        explanation: "The requested API endpoint, channel, or document URL does not exist.",
        actionHint: "Check the URL, channel ID, or resource identifier in the node configuration parameters.",
        category: "not_found",
      };
    }

    if (errStr.includes("429") || errStr.includes("Too Many Requests") || errStr.includes("rate limit")) {
      return {
        title: "Rate Limit Exceeded (429)",
        explanation: "The external provider received too many requests in a short timeframe.",
        actionHint: "Add a Delay node before this step or adjust the workflow schedule trigger frequency.",
        category: "rate_limit",
      };
    }

    if (errStr.includes("SSRF_BLOCKED") || errStr.includes("Internal IP")) {
      return {
        title: "Security Violation: Internal IP Blocked",
        explanation: "Requests targeting private, localhost, or internal cloud IP addresses are blocked for security.",
        actionHint: "Use a public, secure HTTPS endpoint URL.",
        category: "network",
      };
    }

    if (errStr.includes("CYCLE_DETECTED")) {
      return {
        title: "Cyclic Dependency Graph Error",
        explanation: "The workflow graph contains a circular loop edge between nodes.",
        actionHint: "Remove circular connection edges on the canvas so execution flows strictly forward.",
        category: "validation",
      };
    }

    if (errStr.includes("insufficient_quota") || errStr.includes("quota exceeded") || errStr.includes("billing")) {
      return {
        title: "AI Provider Quota Exceeded",
        explanation: "Your AI API provider account (OpenAI / Anthropic / Gemini) has run out of credits or billing allocation.",
        actionHint: "Check your billing portal with the AI provider or switch to another provider in node settings.",
        category: "quota",
      };
    }

    if (errStr.includes("JSON_PARSE_ERROR") || errStr.includes("SyntaxError") || errStr.includes("Unexpected token")) {
      return {
        title: "Invalid Data Payload Format",
        explanation: "The node expected valid JSON input or output, but received plain text or malformed content.",
        actionHint: "Add a Transform node to clean payload fields or set Response Parsing Mode to Text.",
        category: "validation",
      };
    }

    return {
      title: `${nodeType ? nodeType.toUpperCase() : "Node"} Execution Failure`,
      explanation: errStr || "An unhandled exception occurred during node processing.",
      actionHint: "Inspect node input and output payloads below to verify parameter syntax.",
      category: "system",
    };
  }
}
