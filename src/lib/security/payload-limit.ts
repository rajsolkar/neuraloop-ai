import { NextResponse } from "next/server";
import { securityMetrics } from "./security-metrics";

export const DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024; // 1 MB

export async function checkPayloadSize(
  request: Request,
  maxBytes: number = DEFAULT_MAX_PAYLOAD_BYTES,
): Promise<{ valid: boolean; response?: NextResponse; bodyText?: string }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength) {
    const bytes = parseInt(contentLength, 10);
    if (!isNaN(bytes) && bytes > maxBytes) {
      securityMetrics.recordPayloadRejection();
      return {
        valid: false,
        response: NextResponse.json(
          { error: "PAYLOAD_TOO_LARGE" },
          { status: 413 },
        ),
      };
    }
  }

  try {
    const text = await request.clone().text();
    const byteLength = Buffer.byteLength(text, "utf8");
    if (byteLength > maxBytes) {
      securityMetrics.recordPayloadRejection();
      return {
        valid: false,
        response: NextResponse.json(
          { error: "PAYLOAD_TOO_LARGE" },
          { status: 413 },
        ),
      };
    }
    return { valid: true, bodyText: text };
  } catch {
    return { valid: true, bodyText: "" };
  }
}
