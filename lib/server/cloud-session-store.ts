import { and, desc, eq } from "drizzle-orm";
import { ulid } from "ulid";
import { sourceDossierStats } from "@/lib/source-evidence";
import type { SavedSession, SavedSessionMeta } from "@/lib/client/session-storage";
import type { Session } from "@/lib/types";

const CLOUD_SESSION_DATA_VERSION = 1;
const MAX_CLOUD_SESSIONS = 200;

export type CloudSessionErrorCode =
  | "cloud_unavailable"
  | "signed_out"
  | "invalid_request"
  | "not_found"
  | "conflict";

export class CloudSessionError extends Error {
  status: number;
  code: CloudSessionErrorCode;

  constructor(status: number, code: CloudSessionErrorCode, message: string) {
    super(message);
    this.name = "CloudSessionError";
    this.status = status;
    this.code = code;
  }
}

type CloudSessionData = {
  version: typeof CLOUD_SESSION_DATA_VERSION;
  name: string;
  saved_at: string;
  session: Session;
};

type CloudSessionInput = {
  id?: string;
  name?: string;
  session: Session;
};

function ensureCloudConfigured() {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    throw new CloudSessionError(
      503,
      "cloud_unavailable",
      "Account sync is not configured for this Yentl environment.",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new CloudSessionError(
      503,
      "cloud_unavailable",
      "Account sync needs a database before saved sessions can sync across devices.",
    );
  }
}

async function requireCloudUser() {
  ensureCloudConfigured();
  const { auth } = await import("@clerk/nextjs/server");
  let authState: Awaited<ReturnType<typeof auth>>;
  try {
    authState = await auth();
  } catch {
    throw new CloudSessionError(
      401,
      "signed_out",
      "Sign in to sync saved sessions across devices.",
    );
  }

  if (!authState.userId) {
    throw new CloudSessionError(
      401,
      "signed_out",
      "Sign in to sync saved sessions across devices.",
    );
  }

  return authState.userId;
}

async function getCloudDb() {
  ensureCloudConfigured();
  return import("@/lib/db/client");
}

function parseIsoDate(value: string | undefined, field: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new CloudSessionError(
      400,
      "invalid_request",
      `Session ${field} must be a valid ISO timestamp.`,
    );
  }
  return date;
}

function isSession(value: unknown): value is Session {
  if (value == null || typeof value !== "object") return false;
  const candidate = value as Partial<Session>;
  return (
    typeof candidate.title === "string" &&
    typeof candidate.started_at === "string" &&
    Array.isArray(candidate.transcript) &&
    Array.isArray(candidate.claims) &&
    Array.isArray(candidate.markers) &&
    Array.isArray(candidate.speakers) &&
    candidate.source != null &&
    typeof candidate.source === "object" &&
    typeof (candidate.source as { kind?: unknown }).kind === "string"
  );
}

function assertSession(value: unknown): asserts value is Session {
  if (!isSession(value)) {
    throw new CloudSessionError(
      400,
      "invalid_request",
      "Request body must include a serialized Yentl session.",
    );
  }
  parseIsoDate(value.started_at, "started_at");
  if (value.ended_at) parseIsoDate(value.ended_at, "ended_at");
}

function cleanName(name: string | undefined, session: Session): string {
  const candidate = name?.trim() || session.title.trim();
  if (candidate.length > 0) return candidate.slice(0, 160);
  return `Session @ ${new Date(session.started_at).toLocaleString()}`;
}

function durationSec(session: Session): number {
  const startMs = new Date(session.started_at).getTime();
  const endMs = session.ended_at ? new Date(session.ended_at).getTime() : Date.now();
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function sourceEvidenceMeta(session: Session): Pick<
  SavedSessionMeta,
  "source_count" | "source_linked_count" | "high_source_count"
> {
  return session.claims.reduce(
    (acc, claim) => {
      const stats = sourceDossierStats(claim.sources, claim.claim_text);
      acc.source_count += claim.sources.length;
      acc.source_linked_count += stats.claimLinked;
      acc.high_source_count += stats.high;
      return acc;
    },
    {
      source_count: 0,
      source_linked_count: 0,
      high_source_count: 0,
    },
  );
}

function buildMeta(
  id: string,
  name: string,
  session: Session,
  savedAt: string,
): SavedSessionMeta {
  return {
    id,
    name,
    source_kind: session.source.kind,
    saved_at: savedAt,
    started_at: session.started_at,
    ended_at: session.ended_at ?? null,
    claim_count: session.claims.length,
    marker_count: session.markers.length,
    speaker_count: session.speakers.length,
    ...sourceEvidenceMeta(session),
    duration_sec: durationSec(session),
  };
}

function extractCloudData(data: unknown, fallbackTitle: string | null): CloudSessionData {
  const envelopeSession =
    data != null && typeof data === "object" && "session" in data
      ? (data as { session?: unknown }).session
      : undefined;
  if (
    data != null &&
    typeof data === "object" &&
    "session" in data &&
    isSession(envelopeSession)
  ) {
    const envelope = data as Partial<CloudSessionData>;
    return {
      version: CLOUD_SESSION_DATA_VERSION,
      name: typeof envelope.name === "string" && envelope.name.trim()
        ? envelope.name.trim()
        : cleanName(fallbackTitle ?? undefined, envelopeSession),
      saved_at: typeof envelope.saved_at === "string" ? envelope.saved_at : new Date().toISOString(),
      session: envelopeSession,
    };
  }

  if (isSession(data)) {
    return {
      version: CLOUD_SESSION_DATA_VERSION,
      name: cleanName(fallbackTitle ?? undefined, data),
      saved_at: new Date().toISOString(),
      session: data,
    };
  }

  throw new CloudSessionError(
    500,
    "invalid_request",
    "Saved session data is missing or unreadable.",
  );
}

type CloudSessionRow = {
  id: string;
  title: string | null;
  data: unknown;
  createdAt: Date;
};

function rowToSavedSession(row: CloudSessionRow): SavedSession {
  const cloudData = extractCloudData(row.data, row.title);
  const savedAt = row.createdAt.toISOString();
  const meta = buildMeta(row.id, cloudData.name, cloudData.session, savedAt);
  return { ...meta, session: cloudData.session };
}

async function ensureUserRow(clerkUserId: string) {
  const { db, schema } = await getCloudDb();
  const { currentUser } = await import("@clerk/nextjs/server");
  const user = await currentUser().catch(() => null);
  const email =
    user?.primaryEmailAddress?.emailAddress ??
    user?.emailAddresses?.[0]?.emailAddress ??
    `${clerkUserId}@clerk.local`;
  const nameFromParts = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
  const displayName = user?.fullName ?? (nameFromParts || user?.username || null);
  const now = new Date();

  await db
    .insert(schema.users)
    .values({
      clerkUserId,
      email,
      displayName,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: schema.users.clerkUserId,
      set: {
        email,
        displayName,
        updatedAt: now,
      },
    });
}

async function ensureSessionOwnership(id: string, clerkUserId: string) {
  const { db, schema } = await getCloudDb();
  const rows = await db
    .select({ clerkUserId: schema.sessions.clerkUserId })
    .from(schema.sessions)
    .where(eq(schema.sessions.id, id))
    .limit(1);

  const owner = rows[0]?.clerkUserId;
  if (owner && owner !== clerkUserId) {
    throw new CloudSessionError(
      409,
      "conflict",
      "This saved-session id already belongs to another account.",
    );
  }
}

export async function listCloudSessions(): Promise<SavedSessionMeta[]> {
  const clerkUserId = await requireCloudUser();
  const { db, schema } = await getCloudDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(eq(schema.sessions.clerkUserId, clerkUserId))
    .orderBy(desc(schema.sessions.createdAt))
    .limit(MAX_CLOUD_SESSIONS);

  return rows.map((row) => rowToSavedSession(row));
}

export async function saveCloudSession(input: CloudSessionInput): Promise<SavedSessionMeta> {
  assertSession(input.session);
  const clerkUserId = await requireCloudUser();
  await ensureUserRow(clerkUserId);
  const { db, schema } = await getCloudDb();
  const id = input.id?.trim() || ulid();
  const name = cleanName(input.name, input.session);
  const savedAt = new Date();
  const envelope: CloudSessionData = {
    version: CLOUD_SESSION_DATA_VERSION,
    name,
    saved_at: savedAt.toISOString(),
    session: input.session,
  };

  await ensureSessionOwnership(id, clerkUserId);

  await db
    .insert(schema.sessions)
    .values({
      id,
      clerkUserId,
      title: name,
      startedAt: parseIsoDate(input.session.started_at, "started_at") ?? savedAt,
      endedAt: parseIsoDate(input.session.ended_at, "ended_at"),
      sourceKind: input.session.source.kind,
      sourceMeta: input.session.source,
      data: envelope,
      createdAt: savedAt,
    })
    .onConflictDoUpdate({
      target: schema.sessions.id,
      set: {
        title: name,
        startedAt: parseIsoDate(input.session.started_at, "started_at") ?? savedAt,
        endedAt: parseIsoDate(input.session.ended_at, "ended_at"),
        sourceKind: input.session.source.kind,
        sourceMeta: input.session.source,
        data: envelope,
        createdAt: savedAt,
      },
    });

  return buildMeta(id, name, input.session, savedAt.toISOString());
}

export async function loadCloudSession(id: string): Promise<SavedSession> {
  const clerkUserId = await requireCloudUser();
  const { db, schema } = await getCloudDb();
  const rows = await db
    .select()
    .from(schema.sessions)
    .where(and(eq(schema.sessions.id, id), eq(schema.sessions.clerkUserId, clerkUserId)))
    .limit(1);

  if (!rows[0]) {
    throw new CloudSessionError(404, "not_found", `Session not found: ${id}`);
  }

  return rowToSavedSession(rows[0]);
}

export async function renameCloudSession(id: string, name: string): Promise<void> {
  const clerkUserId = await requireCloudUser();
  const trimmed = name.trim().slice(0, 160);
  if (!trimmed) {
    throw new CloudSessionError(400, "invalid_request", "Session name cannot be empty.");
  }

  const current = await loadCloudSession(id);
  const { db, schema } = await getCloudDb();
  const envelope: CloudSessionData = {
    version: CLOUD_SESSION_DATA_VERSION,
    name: trimmed,
    saved_at: current.saved_at,
    session: current.session,
  };

  await db
    .update(schema.sessions)
    .set({
      title: trimmed,
      data: envelope,
    })
    .where(and(eq(schema.sessions.id, id), eq(schema.sessions.clerkUserId, clerkUserId)));
}

export async function deleteCloudSession(id: string): Promise<void> {
  const clerkUserId = await requireCloudUser();
  const { db, schema } = await getCloudDb();
  await db
    .delete(schema.sessions)
    .where(and(eq(schema.sessions.id, id), eq(schema.sessions.clerkUserId, clerkUserId)));
}

export async function clearCloudSessions(): Promise<void> {
  const clerkUserId = await requireCloudUser();
  const { db, schema } = await getCloudDb();
  await db.delete(schema.sessions).where(eq(schema.sessions.clerkUserId, clerkUserId));
}
