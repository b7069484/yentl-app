import { NextResponse } from "next/server";
import { recordSecurityEvent, routeForRequest } from "@/lib/server/security-events";

type AuthState = {
  userId?: string | null;
};

const TRUE_VALUES = new Set(["1", "true", "yes", "on"]);

function envFlag(name: string): boolean {
  return TRUE_VALUES.has((process.env[name] ?? "").trim().toLowerCase());
}

export function paidLiveAuthRequired(): boolean {
  if (process.env.NODE_ENV !== "production") return false;
  return envFlag("YENTL_REQUIRE_PAID_LIVE_AUTH") || envFlag("YENTL_REQUIRE_AUTH");
}

function authErrorResponse(
  code: "AUTH_REQUIRED" | "AUTH_UNAVAILABLE",
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(
    { error: { code, message } },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function requirePaidLiveAccess(
  request: Request,
  scope: string,
): Promise<NextResponse | null> {
  if (!paidLiveAuthRequired()) return null;

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    await recordSecurityEvent(
      "paid_live_auth_unavailable",
      {
        route: routeForRequest(request),
        scope,
        reason: "clerk_not_configured",
      },
      "error",
    );
    return authErrorResponse(
      "AUTH_UNAVAILABLE",
      "Paid live analysis is temporarily unavailable.",
      503,
    );
  }

  let authState: AuthState | null = null;
  try {
    const { auth } = await import("@clerk/nextjs/server");
    authState = await auth();
  } catch {
    authState = null;
  }

  if (authState?.userId) return null;

  await recordSecurityEvent("paid_live_auth_required", {
    route: routeForRequest(request),
    scope,
  });

  return authErrorResponse(
    "AUTH_REQUIRED",
    "Sign in to use paid live analysis.",
    401,
  );
}
