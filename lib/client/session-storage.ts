"use client";
import { ulid } from "ulid";
import type { Session } from "@/lib/types";
import { sourceDossierStats } from "@/lib/source-evidence";

const DB_NAME = "yentl";
const DB_VERSION = 1;
const STORE_NAME = "sessions";

export type SavedSessionMeta = {
  id: string;           // ulid
  name: string;         // user-editable; default = source title or "Session @ ISO"
  source_kind: Session["source"]["kind"];
  saved_at: string;     // ISO
  started_at: string;
  ended_at: string | null;
  claim_count: number;
  marker_count: number;
  speaker_count: number;
  source_count: number;
  source_linked_count: number;
  high_source_count: number;
  duration_sec: number; // (ended_at - started_at) / 1000, or elapsed at save time
};

export type SavedSession = SavedSessionMeta & {
  session: Session; // full serialized state
};

// ─── DB open ───────────────────────────────────────────────────────────────────

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("saved_at", "saved_at", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Derived counts ────────────────────────────────────────────────────────────

function durationSec(session: Session): number {
  if (!session.started_at) return 0;
  const startMs = new Date(session.started_at).getTime();
  const endMs = session.ended_at
    ? new Date(session.ended_at).getTime()
    : Date.now();
  return Math.max(0, Math.round((endMs - startMs) / 1000));
}

function defaultName(session: Session): string {
  if (session.title && session.title.trim().length > 0) return session.title.trim();
  const ts = session.started_at
    ? new Date(session.started_at).toLocaleString()
    : new Date().toLocaleString();
  return `Session @ ${ts}`;
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
): SavedSessionMeta {
  const sourceEvidence = sourceEvidenceMeta(session);
  return {
    id,
    name,
    source_kind: session.source.kind,
    saved_at: new Date().toISOString(),
    started_at: session.started_at,
    ended_at: session.ended_at ?? null,
    claim_count: session.claims.length,
    marker_count: session.markers.length,
    speaker_count: session.speakers.length,
    ...sourceEvidence,
    duration_sec: durationSec(session),
  };
}

function normalizeSavedSession(record: SavedSession): SavedSession {
  return {
    ...record,
    ...sourceEvidenceMeta(record.session),
  };
}

function savedSessionMeta(record: SavedSession): SavedSessionMeta {
  const normalized = normalizeSavedSession(record);
  return {
    id: normalized.id,
    name: normalized.name,
    source_kind: normalized.source_kind,
    saved_at: normalized.saved_at,
    started_at: normalized.started_at,
    ended_at: normalized.ended_at,
    claim_count: normalized.claim_count,
    marker_count: normalized.marker_count,
    speaker_count: normalized.speaker_count,
    source_count: normalized.source_count,
    source_linked_count: normalized.source_linked_count,
    high_source_count: normalized.high_source_count,
    duration_sec: normalized.duration_sec,
  };
}

// ─── Public API ─────────────────────────────────────────────────────────────────

/** Save a session. If id is omitted, generate ulid and create. If id matches an
 *  existing record, overwrite (treat as "rename" / "update"). */
export async function saveSession(
  session: Session,
  opts?: { id?: string; name?: string },
): Promise<SavedSessionMeta> {
  const id = opts?.id ?? ulid();
  const name = opts?.name ?? defaultName(session);
  const meta = buildMeta(id, name, session);
  const record: SavedSession = { ...meta, session };

  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve(meta);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** List all saved sessions (metadata only — no transcript). Sorted desc by saved_at. */
export async function listSessions(): Promise<SavedSessionMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const all: SavedSession[] = req.result;
      const meta = all.map(savedSessionMeta);
      meta.sort((a, b) => (a.saved_at > b.saved_at ? -1 : 1));
      resolve(meta);
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Load one full session by id. Throws if not found. */
export async function loadSession(id: string): Promise<SavedSession> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => {
      if (req.result == null) {
        reject(new Error(`Session not found: ${id}`));
      } else {
        resolve(normalizeSavedSession(req.result as SavedSession));
      }
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => db.close();
  });
}

/** Rename without rewriting the session body. Throws if not found. */
export async function renameSession(id: string, name: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(id);
    getReq.onsuccess = () => {
      if (getReq.result == null) {
        reject(new Error(`Session not found: ${id}`));
        return;
      }
      const updated = { ...getReq.result, name };
      const putReq = store.put(updated);
      putReq.onerror = () => reject(putReq.error);
    };
    getReq.onerror = () => reject(getReq.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete one session by id. */
export async function deleteSession(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/** Delete all sessions (privacy / clear data). */
export async function clearAllSessions(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}
