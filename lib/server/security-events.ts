type SecurityEventLevel = "info" | "warn" | "error";

type SecurityEventFields = Record<string, string | number | boolean | null | undefined>;

export type SecurityEventName =
  | "source_consent_missing"
  | "rate_limited"
  | "rate_limit_unavailable"
  | "claim_scope_declined"
  | "claim_scope_refused"
  | "claim_scope_engage_cautiously"
  | "claim_scope_classifier_unavailable"
  | "blob_deletion_failed";

export function routeForRequest(request: Request): string {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "unknown";
  }
}

function cleanFields(fields: SecurityEventFields): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(fields).filter((entry): entry is [string, string | number | boolean | null] => (
      entry[1] !== undefined
    )),
  );
}

export function emitSecurityEvent(
  event: SecurityEventName,
  fields: SecurityEventFields = {},
  level: SecurityEventLevel = "warn",
): void {
  const payload = {
    event,
    at: new Date().toISOString(),
    ...cleanFields(fields),
  };
  const line = `yentl-security-event ${JSON.stringify(payload)}`;

  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "info") {
    console.info(line);
    return;
  }
  console.warn(line);
}
