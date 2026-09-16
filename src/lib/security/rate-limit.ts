import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import { securityMetrics } from "./security-metrics";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  retryAfter?: number;
}

let redisInstance: Redis | null = null;
let webhookLimiter: Ratelimit | null = null;
let aiGenLimiter: Ratelimit | null = null;
let wfExecLimiter: Ratelimit | null = null;
let authLimiter: Ratelimit | null = null;

let warnedMissingEnv = false;

function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }
  return "127.0.0.1";
}

function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token || url.trim() === "" || token.trim() === "") {
    if (!warnedMissingEnv) {
      console.warn(
        "[RateLimit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing. Rate limiting running in safe local fallback mode (disabled).",
      );
      warnedMissingEnv = true;
    }
    return null;
  }

  if (!redisInstance) {
    redisInstance = new Redis({
      url: url.trim(),
      token: token.trim(),
    });
  }
  return redisInstance;
}

function getLimiters() {
  const redis = getUpstashRedis();
  if (!redis) return null;

  if (!webhookLimiter) {
    webhookLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "ratelimit:webhook",
    });
  }

  if (!aiGenLimiter) {
    aiGenLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"),
      analytics: true,
      prefix: "ratelimit:aigen",
    });
  }

  if (!wfExecLimiter) {
    wfExecLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(30, "1 m"),
      analytics: true,
      prefix: "ratelimit:wfexec",
    });
  }

  if (!authLimiter) {
    authLimiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(60, "1 m"),
      analytics: true,
      prefix: "ratelimit:auth",
    });
  }

  return {
    webhookLimiter,
    aiGenLimiter,
    wfExecLimiter,
    authLimiter,
  };
}

const FALLBACK_BYPASS_RESULT: RateLimitResult = {
  success: true,
  limit: 60,
  remaining: 60,
  reset: 0,
  retryAfter: 0,
};

/**
 * Webhook Trigger Rate Limiter
 * Limit: 60 requests / minute
 * Key: IP + webhookId
 */
export async function limitWebhook(
  req: Request,
  webhookId: string,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return FALLBACK_BYPASS_RESULT;

  const ip = getClientIp(req);
  const identifier = `${ip}:${webhookId}`;

  try {
    const res = await limiters.webhookLimiter.limit(identifier);
    const retryAfter = res.reset ? Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) : 60;
    const result: RateLimitResult = {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
      retryAfter,
    };
    if (!result.success) {
      securityMetrics.recordRateLimitHit();
    }
    return result;
  } catch (error) {
    console.warn("[RateLimit] Webhook rate limiter error, failing open:", error);
    return FALLBACK_BYPASS_RESULT;
  }
}

/**
 * AI Workflow Generation Rate Limiter
 * Limit: 10 requests / minute
 * Key: Clerk userId (or client IP fallback)
 */
export async function limitAiGeneration(
  req: Request,
  userId: string,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return FALLBACK_BYPASS_RESULT;

  const identifier = userId && userId.trim() !== "" ? userId : getClientIp(req);

  try {
    const res = await limiters.aiGenLimiter.limit(identifier);
    const retryAfter = res.reset ? Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) : 60;
    const result: RateLimitResult = {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
      retryAfter,
    };
    if (!result.success) {
      securityMetrics.recordRateLimitHit();
    }
    return result;
  } catch (error) {
    console.warn("[RateLimit] AI generation rate limiter error, failing open:", error);
    return FALLBACK_BYPASS_RESULT;
  }
}

/**
 * Manual Workflow Execution Rate Limiter
 * Limit: 30 requests / minute
 * Key: Clerk userId (or client IP fallback)
 */
export async function limitWorkflowExecution(
  req: Request,
  userId: string,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return FALLBACK_BYPASS_RESULT;

  const identifier = userId && userId.trim() !== "" ? userId : getClientIp(req);

  try {
    const res = await limiters.wfExecLimiter.limit(identifier);
    const retryAfter = res.reset ? Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) : 60;
    const result: RateLimitResult = {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
      retryAfter,
    };
    if (!result.success) {
      securityMetrics.recordRateLimitHit();
    }
    return result;
  } catch (error) {
    console.warn("[RateLimit] Workflow execution rate limiter error, failing open:", error);
    return FALLBACK_BYPASS_RESULT;
  }
}

/**
 * Credential Management & Auth-Sensitive Route Rate Limiter
 * Limit: 60 requests / minute
 * Key: Clerk userId (or client IP fallback)
 */
export async function limitAuthSensitiveRoute(
  req: Request,
  userId: string,
): Promise<RateLimitResult> {
  const limiters = getLimiters();
  if (!limiters) return FALLBACK_BYPASS_RESULT;

  const identifier = userId && userId.trim() !== "" ? userId : getClientIp(req);

  try {
    const res = await limiters.authLimiter.limit(identifier);
    const retryAfter = res.reset ? Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) : 60;
    const result: RateLimitResult = {
      success: res.success,
      limit: res.limit,
      remaining: res.remaining,
      reset: res.reset,
      retryAfter,
    };
    if (!result.success) {
      securityMetrics.recordRateLimitHit();
    }
    return result;
  } catch (error) {
    console.warn("[RateLimit] Auth sensitive route rate limiter error, failing open:", error);
    return FALLBACK_BYPASS_RESULT;
  }
}

/**
 * Creates standard HTTP 429 Response with required headers and JSON body
 */
export function createRateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfterSeconds = result.retryAfter
    ? Math.ceil(result.retryAfter)
    : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));

  const response = NextResponse.json(
    { error: "RATE_LIMIT_EXCEEDED" },
    { status: 429 },
  );

  response.headers.set("Retry-After", String(retryAfterSeconds));
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));

  return response;
}
