import { NextResponse } from "next/server";
import { mintToken } from "@/lib/server/deepgram";
import { requireSourceAnalysisConsent } from "@/lib/server/consent";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/server/rate-limit";
import { requirePaidLiveAccess } from "@/lib/server/paid-live-gate";

export const runtime = "nodejs";

const ALLOWED_APP_ORIGINS = new Set([
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://yentl.it",
]);

const CORS_HEADERS = "content-type, x-yentl-source-consent";
const CORS_METHODS = "POST, OPTIONS";

function configuredExtensionOrigins() {
  return (process.env.YENTL_EXTENSION_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

function allowedCorsOrigin(req: Request): string | null {
  const origin = req.headers.get("origin")?.replace(/\/+$/, "");
  if (!origin) return null;
  if (ALLOWED_APP_ORIGINS.has(origin)) return origin;
  if (configuredExtensionOrigins().includes(origin)) return origin;

  if (process.env.NODE_ENV !== "production" && origin.startsWith("chrome-extension://")) {
    return origin;
  }

  return null;
}

function corsHeaders(req: Request): HeadersInit {
  const origin = allowedCorsOrigin(req);
  if (!origin) return {};

  return {
    "Access-Control-Allow-Headers": CORS_HEADERS,
    "Access-Control-Allow-Methods": CORS_METHODS,
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
}

function withCors(req: Request, res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(corsHeaders(req))) {
    res.headers.set(key, value);
  }
  return res;
}

export async function OPTIONS(req: Request) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export async function POST(req: Request) {
  const limited = await enforceRateLimit(req, RATE_LIMITS.liveToken);
  if (limited) return withCors(req, limited);

  const consentError = requireSourceAnalysisConsent(req);
  if (consentError) return withCors(req, consentError);

  const authError = await requirePaidLiveAccess(req, "deepgram-token");
  if (authError) return withCors(req, authError);

  try {
    const token = await mintToken();
    return withCors(req, NextResponse.json(token));
  } catch (e) {
    console.error("deepgram token mint failed", e);
    return withCors(
      req,
      NextResponse.json({ error: "token mint failed" }, { status: 500 }),
    );
  }
}
