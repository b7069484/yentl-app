"use client";

import type { SavedSession, SavedSessionMeta } from "@/lib/client/session-storage";
import type { Session } from "@/lib/types";

export type CloudSessionFailureStatus =
  | "signed_out"
  | "unavailable"
  | "not_found"
  | "error";

export type CloudSessionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      status: CloudSessionFailureStatus;
      message: string;
      httpStatus?: number;
    };

type CloudErrorBody = {
  error?: {
    code?: string;
    message?: string;
  };
};

function failureStatus(status: number): CloudSessionFailureStatus {
  if (status === 401 || status === 403) return "signed_out";
  if (status === 404) return "not_found";
  if (status === 503) return "unavailable";
  return "error";
}

async function cloudRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<CloudSessionResult<T>> {
  const headers = new Headers(init?.headers);
  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  let res: Response;
  try {
    res = await fetch(path, {
      credentials: "same-origin",
      ...init,
      headers,
    });
  } catch {
    return {
      ok: false,
      status: "unavailable",
      message: "Account sync is unreachable right now. Your browser-local save is still available.",
    };
  }

  if (!res.ok) {
    const body = await res.json().catch(() => null) as CloudErrorBody | null;
    return {
      ok: false,
      status: failureStatus(res.status),
      message:
        body?.error?.message ??
        "Account sync is unavailable right now. Your browser-local save is still available.",
      httpStatus: res.status,
    };
  }

  return { ok: true, data: (await res.json()) as T };
}

export function mergeSavedSessionMetas(
  localSessions: SavedSessionMeta[],
  cloudSessions: SavedSessionMeta[],
): SavedSessionMeta[] {
  const byId = new Map<string, SavedSessionMeta>();
  for (const session of localSessions) {
    byId.set(session.id, session);
  }
  for (const session of cloudSessions) {
    const current = byId.get(session.id);
    if (!current || session.saved_at >= current.saved_at) {
      byId.set(session.id, session);
    }
  }

  return Array.from(byId.values()).sort((a, b) => b.saved_at.localeCompare(a.saved_at));
}

export async function listCloudSessions(): Promise<CloudSessionResult<SavedSessionMeta[]>> {
  const result = await cloudRequest<{ sessions: SavedSessionMeta[] }>("/api/sessions");
  if (!result.ok) return result;
  return { ok: true, data: result.data.sessions };
}

export async function saveCloudSession(
  session: Session,
  opts: { id?: string; name?: string },
): Promise<CloudSessionResult<SavedSessionMeta>> {
  const result = await cloudRequest<{ session: SavedSessionMeta }>("/api/sessions", {
    method: "POST",
    body: JSON.stringify({
      id: opts.id,
      name: opts.name,
      session,
    }),
  });
  if (!result.ok) return result;
  return { ok: true, data: result.data.session };
}

export async function loadCloudSession(
  id: string,
): Promise<CloudSessionResult<SavedSession>> {
  const result = await cloudRequest<{ session: SavedSession }>(
    `/api/sessions/${encodeURIComponent(id)}`,
  );
  if (!result.ok) return result;
  return { ok: true, data: result.data.session };
}

export async function renameCloudSession(
  id: string,
  name: string,
): Promise<CloudSessionResult<true>> {
  const result = await cloudRequest<{ ok: true }>(
    `/api/sessions/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ name }),
    },
  );
  if (!result.ok) return result;
  return { ok: true, data: true };
}

export async function deleteCloudSession(
  id: string,
): Promise<CloudSessionResult<true>> {
  const result = await cloudRequest<{ ok: true }>(
    `/api/sessions/${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (!result.ok) return result;
  return { ok: true, data: true };
}

export async function clearCloudSessions(): Promise<CloudSessionResult<true>> {
  const result = await cloudRequest<{ ok: true }>("/api/sessions", { method: "DELETE" });
  if (!result.ok) return result;
  return { ok: true, data: true };
}
