import { randomUUID } from "node:crypto";
import { put } from "@vercel/blob";

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
  | "paid_live_auth_required"
  | "paid_live_auth_unavailable"
  | "blob_deletion_failed"
  | "security_event_sink_failed";

type SecurityEventPayload = {
  event: SecurityEventName;
  at: string;
} & Record<string, string | number | boolean | null>;

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

function buildPayload(
  event: SecurityEventName,
  fields: SecurityEventFields,
): SecurityEventPayload {
  return {
    event,
    at: new Date().toISOString(),
    ...cleanFields(fields),
  };
}

function writeConsole(payload: SecurityEventPayload, level: SecurityEventLevel): void {
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

function blobSinkEnabled(): boolean {
  const mode = process.env.YENTL_SECURITY_EVENT_SINK?.toLowerCase();
  if (mode === "off" || mode === "console") return false;
  if (mode === "blob") return true;
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

async function persistSecurityEvent(payload: SecurityEventPayload): Promise<string | null> {
  if (!blobSinkEnabled()) return null;

  const date = payload.at.slice(0, 10);
  const safeEvent = payload.event.replace(/[^a-z0-9_-]/gi, "-");
  const safeAt = payload.at.replace(/[:.]/g, "-");
  const pathname = `security-events/${date}/${safeAt}-${safeEvent}-${randomUUID()}.json`;
  await put(pathname, `${JSON.stringify(payload)}\n`, {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
  });
  return pathname;
}

function reportSinkFailure(error: unknown): void {
  const payload = buildPayload("security_event_sink_failed", {
    reason: error instanceof Error ? error.message.slice(0, 180) : String(error).slice(0, 180),
  });
  writeConsole(payload, "error");
}

export async function recordSecurityEvent(
  event: SecurityEventName,
  fields: SecurityEventFields = {},
  level: SecurityEventLevel = "warn",
): Promise<void> {
  const payload = buildPayload(event, fields);
  writeConsole(payload, level);

  try {
    await persistSecurityEvent(payload);
  } catch (error) {
    reportSinkFailure(error);
  }
}

export function emitSecurityEvent(
  event: SecurityEventName,
  fields: SecurityEventFields = {},
  level: SecurityEventLevel = "warn",
): void {
  const payload = buildPayload(event, fields);
  writeConsole(payload, level);

  if (!blobSinkEnabled()) return;
  void persistSecurityEvent(payload).catch(reportSinkFailure);
}
