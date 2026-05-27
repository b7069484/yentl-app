import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { emitSecurityEvent, routeForRequest } from "@/lib/server/security-events";

type BucketState = {
  count: number;
  resetAt: number;
};

type RateLimitDecision = {
  allowed: boolean;
  count: number;
  limit: number;
  remaining: number;
  resetAt: number;
};

type RedisConfig = {
  url: string;
  token: string;
};

export type RateLimitConfig = {
  bucket: string;
  limit: number;
  windowMs: number;
};

export const RATE_LIMITS = {
  liveToken: { bucket: "deepgram-token", limit: 30, windowMs: 60_000 },
  uploadToken: { bucket: "upload-token", limit: 40, windowMs: 60_000 },
  transcription: { bucket: "transcription", limit: 240, windowMs: 60_000 },
  sourceIngest: { bucket: "source-ingest", limit: 120, windowMs: 60_000 },
  model: { bucket: "model", limit: 240, windowMs: 60_000 },
  preview: { bucket: "source-preview", limit: 240, windowMs: 60_000 },
} satisfies Record<string, RateLimitConfig>;

const buckets = new Map<string, BucketState>();

const RATE_LIMIT_LUA = `
local current = redis.call("INCR", KEYS[1])
local ttl = redis.call("PTTL", KEYS[1])
if ttl < 0 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return { current, ttl }
`;

function requestIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (
    forwarded ||
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    request.headers.get("cf-connecting-ip") ||
    "local"
  );
}

function hashIdentifier(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 32);
}

function rateLimitKey(request: Request, config: RateLimitConfig): string {
  return `yentl:rate:${config.bucket}:${hashIdentifier(requestIp(request))}`;
}

function redisConfig(): RedisConfig | null {
  const backend = process.env.YENTL_RATE_LIMIT_BACKEND?.toLowerCase();
  if (backend === "memory") return null;
  if (process.env.NODE_ENV === "test" && backend !== "redis") return null;

  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const hasPartialRedisEnv = Boolean(
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.KV_REST_API_URL ||
    process.env.KV_REST_API_TOKEN
  );

  if (!url || !token) {
    if (backend === "redis" || hasPartialRedisEnv) {
      throw new Error("Redis rate limiting is configured but missing REST URL or token");
    }
    return null;
  }

  return {
    url: url.replace(/\/+$/, ""),
    token,
  };
}

function decisionFromState(
  config: RateLimitConfig,
  count: number,
  resetAt: number,
): RateLimitDecision {
  return {
    allowed: count <= config.limit,
    count,
    limit: config.limit,
    remaining: Math.max(0, config.limit - count),
    resetAt,
  };
}

function enforceInMemoryRateLimit(
  request: Request,
  config: RateLimitConfig,
): RateLimitDecision {
  const now = Date.now();
  const key = rateLimitKey(request, config);
  const current = buckets.get(key);
  const state = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + config.windowMs };

  state.count += 1;
  buckets.set(key, state);

  return decisionFromState(config, state.count, state.resetAt);
}

async function enforceRedisRateLimit(
  request: Request,
  config: RateLimitConfig,
  redis: RedisConfig,
): Promise<RateLimitDecision> {
  const now = Date.now();
  const response = await fetch(redis.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${redis.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([
      "EVAL",
      RATE_LIMIT_LUA,
      1,
      rateLimitKey(request, config),
      config.windowMs,
    ]),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Redis rate limit request failed with ${response.status}`);
  }

  const payload = await response.json() as { result?: unknown; error?: string };
  if (payload.error) {
    throw new Error(payload.error);
  }
  if (!Array.isArray(payload.result) || payload.result.length < 2) {
    throw new Error("Redis rate limit response was malformed");
  }

  const count = Number(payload.result[0]);
  const ttl = Number(payload.result[1]);
  if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
    throw new Error("Redis rate limit response included non-numeric values");
  }

  return decisionFromState(config, count, now + Math.max(0, ttl));
}

function rateLimitResponse(
  request: Request,
  config: RateLimitConfig,
  decision: RateLimitDecision,
): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((decision.resetAt - Date.now()) / 1000));
  emitSecurityEvent("rate_limited", {
    route: routeForRequest(request),
    bucket: config.bucket,
    limit: decision.limit,
    retry_after_sec: retryAfter,
  });

  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests. Please wait before trying again.",
      },
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(decision.remaining),
        "X-RateLimit-Reset": String(Math.ceil(decision.resetAt / 1000)),
      },
    },
  );
}

function rateLimitUnavailableResponse(
  request: Request,
  config: RateLimitConfig,
  reason: string,
): NextResponse {
  emitSecurityEvent("rate_limit_unavailable", {
    route: routeForRequest(request),
    bucket: config.bucket,
    reason: reason.slice(0, 180),
  }, "error");

  return NextResponse.json(
    {
      error: {
        code: "RATE_LIMIT_UNAVAILABLE",
        message: "Request throttling is temporarily unavailable. Please try again shortly.",
      },
    },
    { status: 503 },
  );
}

export async function enforceRateLimit(
  request: Request,
  config: RateLimitConfig,
): Promise<NextResponse | null> {
  try {
    const redis = redisConfig();
    const decision = redis
      ? await enforceRedisRateLimit(request, config, redis)
      : enforceInMemoryRateLimit(request, config);

    return decision.allowed ? null : rateLimitResponse(request, config, decision);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return rateLimitUnavailableResponse(request, config, message);
  }
}

export function resetRateLimitForTests() {
  buckets.clear();
}
