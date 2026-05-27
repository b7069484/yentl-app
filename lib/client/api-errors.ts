type ErrorEnvelope = {
  error?: string | {
    code?: string;
    message?: string;
  };
};

function retryCopy(retryAfterSec?: string | null): string {
  const seconds = Number(retryAfterSec);
  if (Number.isFinite(seconds) && seconds > 0) {
    return `Wait about ${Math.ceil(seconds)} seconds and try again.`;
  }
  return "Wait a moment and try again.";
}

export function friendlyApiErrorMessage(args: {
  status: number;
  code?: string;
  message?: string;
  retryAfterSec?: string | null;
  fallback?: string;
}): string {
  switch (args.code) {
    case "SOURCE_CONSENT_REQUIRED":
      return "Confirm you have permission to record or analyze this source, then try again.";
    case "RATE_LIMITED":
      return `Yentl is receiving too many requests right now. ${retryCopy(args.retryAfterSec)}`;
    case "RATE_LIMIT_UNAVAILABLE":
      return "Yentl's request-safety check is temporarily unavailable. Try again shortly.";
    case "CLAIM_SCOPE_DECLINED":
      return "Yentl checks factual claims. Reword this as a specific factual statement and try again.";
    case "CLAIM_SCOPE_REFUSED":
      return "Yentl cannot help check that kind of claim.";
    case "CLAIM_SCOPE_UNAVAILABLE":
      return "Yentl could not complete the claim-scope safety check. Try again shortly.";
    default:
      break;
  }

  if (args.status === 429) {
    return `Yentl is receiving too many requests right now. ${retryCopy(args.retryAfterSec)}`;
  }
  if (args.status === 428) {
    return "Confirm you have permission to record or analyze this source, then try again.";
  }
  if (args.status === 503) {
    return "Yentl's request-safety check is temporarily unavailable. Try again shortly.";
  }

  return args.message || args.fallback || `Request failed (${args.status}).`;
}

export async function apiErrorMessage(
  response: Response,
  fallback?: string,
): Promise<string> {
  const body = await response.json().catch(() => ({})) as ErrorEnvelope;
  const envelope = typeof body.error === "object" && body.error !== null
    ? body.error
    : undefined;
  const message = typeof body.error === "string" ? body.error : envelope?.message;
  const code = envelope?.code;

  return friendlyApiErrorMessage({
    status: response.status,
    code,
    message,
    retryAfterSec: response.headers?.get?.("Retry-After") ?? null,
    fallback,
  });
}
