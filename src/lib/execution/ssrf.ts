import { URL } from "url";

/**
 * Validate URL to prevent Server-Side Request Forgery (SSRF).
 * Rejects localhost, loopback, private RFC1918 ranges, link-local, and cloud metadata IPs.
 */
export function validateUrlForSsrf(urlString: string): { safe: boolean; error?: string } {
  if (!urlString || typeof urlString !== "string") {
    return { safe: false, error: "URL is empty or invalid" };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { safe: false, error: "Invalid URL syntax" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { safe: false, error: `Unsupported protocol scheme: ${parsed.protocol}. Only http and https allowed.` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Block obvious localhost / internal hostnames
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "0.0.0.0" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".internal") ||
    hostname.endsWith(".local")
  ) {
    return { safe: false, error: `Access to localhost/internal host '${hostname}' is blocked for security.` };
  }

  // Block AWS / GCP / Azure Cloud Metadata endpoints
  if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
    return { safe: false, error: "Access to cloud metadata endpoints is blocked for security." };
  }

  // Check IPv4 private ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x, 169.254.x.x)
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Regex);
  if (match) {
    const [, p1, p2] = match.map((n) => parseInt(n, 10));
    if (
      p1 === 10 || // 10.0.0.0/8
      p1 === 127 || // 127.0.0.0/8
      p1 === 0 || // 0.0.0.0/8
      (p1 === 172 && p2 >= 16 && p2 <= 31) || // 172.16.0.0/12
      (p1 === 192 && p2 === 168) || // 192.168.0.0/16
      (p1 === 169 && p2 === 254) // 169.254.0.0/16 (Link-Local)
    ) {
      return { safe: false, error: `Access to private IP address '${hostname}' is blocked for security.` };
    }
  }

  return { safe: true };
}
