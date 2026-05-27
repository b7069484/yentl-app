"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Trash2,
  PencilLine,
  Clock,
  Mic,
  FileText,
  FileAudio,
  Video,
  Globe,
} from "lucide-react";
import {
  listSessions,
  loadSession,
  renameSession,
  deleteSession,
  clearAllSessions,
  type SavedSessionMeta,
} from "@/lib/client/session-storage";
import { useSession } from "@/lib/client/session-store";

// ─── Relative time helper ─────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} hour${diffH === 1 ? "" : "s"} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "yesterday";
  if (diffD < 30) return `${diffD} days ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ─── Duration formatting ──────────────────────────────────────────────────────

function fmtDuration(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return `${m}m ${String(s).padStart(2, "0")}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${String(m % 60).padStart(2, "0")}m`;
}

// ─── Source kind badge ────────────────────────────────────────────────────────

type IconComponent = React.ComponentType<{ className?: string }>;

const SOURCE_CONFIG: Record<string, { label: string; icon: IconComponent }> = {
  mic: { label: "Mic", icon: Mic },
  browser_tab: { label: "Tab", icon: Video },
  audio_file: { label: "Audio", icon: FileAudio },
  text_doc: { label: "Text", icon: FileText },
  youtube: { label: "YouTube", icon: Video },
  media_url: { label: "Media", icon: Globe },
};

function SourceBadge({ kind }: { kind: string }) {
  const cfg = SOURCE_CONFIG[kind] ?? { label: kind, icon: Globe };
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line-soft bg-cream-2 px-2 py-0.5 text-[11px] font-medium text-ink-3">
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

// ─── Session row ──────────────────────────────────────────────────────────────

type RowProps = {
  session: SavedSessionMeta;
  onRestore: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  restoring: boolean;
};

function SessionRow({ session: s, onRestore, onRename, onDelete, restoring }: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.name);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== s.name) {
      onRename(s.id, trimmed);
    } else {
      setDraft(s.name);
    }
    setEditing(false);
  }, [draft, s.id, s.name, onRename]);

  return (
    <div className="flex items-center gap-4 px-5 py-4 hover:bg-cream/40 transition-colors">
      {/* Name */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setDraft(s.name);
                setEditing(false);
              }
            }}
            className="w-full rounded border border-teal px-1 py-0.5 font-serif text-[14px] text-ink outline-none focus:ring-1 focus:ring-teal bg-white"
            aria-label="Rename session"
          />
        ) : (
          <button
            type="button"
            onClick={() => onRestore(s.id)}
            className="text-left font-serif text-[14px] font-medium text-ink hover:text-teal transition-colors truncate max-w-[260px]"
            aria-label={`Restore session: ${s.name}`}
          >
            {s.name}
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SourceBadge kind={s.source_kind} />
          <span className="text-[11px] text-ink-4 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(s.saved_at)}
          </span>
          <span className="text-[11px] text-ink-4">{fmtDuration(s.duration_sec)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-[11px] text-ink-3 tabular-nums font-mono shrink-0">
        <span>{s.claim_count} claims</span>
        <span>{s.marker_count} markers</span>
        <span>{s.speaker_count} speakers</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {restoring ? (
          <span className="text-[11px] text-ink-4 animate-pulse">Restoring…</span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => { setEditing(true); setDraft(s.name); }}
              className="text-ink-4 hover:text-ink-2 transition-colors"
              aria-label={`Rename session: ${s.name}`}
              title="Rename"
            >
              <PencilLine className="h-3.5 w-3.5" />
            </button>

            {confirming ? (
              <span className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onDelete(s.id)}
                  className="text-[11px] font-medium text-red-600 hover:text-red-700"
                  aria-label={`Confirm delete session: ${s.name}`}
                >
                  Delete
                </button>
                <span className="text-ink-4">·</span>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="text-[11px] text-ink-3 hover:text-ink"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="text-ink-4 hover:text-red-500 transition-colors"
                aria-label={`Delete session: ${s.name}`}
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── SessionsLibraryPage ───────────────────────────────────────────────────────

export default function SessionsLibraryPage() {
  const [sessions, setSessions] = useState<SavedSessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);

  const router = useRouter();
  const restoreSession = useSession((s) => s.restoreSession);

  const refresh = useCallback(async () => {
    try {
      const list = await listSessions();
      setSessions(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- async refresh sets state on completion; standard data-fetch-on-mount pattern
    void refresh();
  }, [refresh]);

  const handleRestore = useCallback(
    async (id: string) => {
      setRestoringId(id);
      try {
        const saved = await loadSession(id);
        restoreSession(saved.session);
        router.push("/session?view=overview");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to restore session",
        );
        setRestoringId(null);
      }
    },
    [restoreSession, router],
  );

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      await renameSession(id, name);
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to rename session",
      );
    }
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete session",
      );
    }
  }, []);

  const handleClearAll = useCallback(async () => {
    try {
      await clearAllSessions();
      setSessions([]);
      setConfirmingClear(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear local saves",
      );
    }
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-cream border-b border-line-soft">
        <div className="px-6 md:px-8 py-3 flex items-center gap-4 max-w-[1280px] mx-auto w-full">
          <Link
            href="/"
            className="font-serif text-[22px] font-medium tracking-tight text-ink inline-flex items-baseline"
          >
            <span>yentl</span>
            <span
              aria-hidden
              className="yentl-dot inline-block w-2 h-2 ml-1.5 self-baseline"
            />
          </Link>
          <span className="text-ink-4 text-[13px]">/</span>
          <span className="font-serif text-[18px] text-ink-2 font-medium">
            Local saves
          </span>
          <div className="ml-auto">
            <Link
              href="/session"
              className="text-[12px] font-medium text-teal hover:text-teal-2 transition-colors"
            >
              + New session
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-[900px] mx-auto px-6 md:px-8 py-10">
        <div className="flex items-center gap-3 mb-8">
          <BookOpen className="h-5 w-5 text-ink-3" />
          <h1 className="font-serif text-[28px] font-medium text-ink">
            Saved in this browser
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="text-ink-4 text-[13px] animate-pulse">Loading…</div>
        )}

        {!loading && sessions.length === 0 && (
          <div className="rounded-xl border border-line-soft bg-cream-2 px-8 py-14 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-line bg-paper text-teal">
              <BookOpen className="h-5 w-5" />
            </div>
            <p className="mb-2 font-serif text-[22px] text-ink-2">
              No local saves yet.
            </p>
            <p className="mx-auto max-w-md text-[13px] leading-relaxed text-ink-3">
              Start an analysis first. Once Yentl has transcript, claims,
              markers, or a report brief, the{" "}
              <span className="font-medium text-ink-2">Save</span> action adds
              a browser-local snapshot to this library.
            </p>
            <p className="mx-auto mt-3 max-w-md text-[12px] leading-relaxed text-ink-4">
              Saves stay on this device and do not sync across browsers or
              accounts in v1. Use exports when you need a portable record.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/session"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal px-4 text-[13px] font-medium text-white transition-colors hover:bg-teal-2"
              >
                Start a new analysis
              </Link>
              <Link
                href="/privacy"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-paper px-4 text-[13px] font-medium text-ink-2 transition-colors hover:bg-cream"
              >
                Review local-save privacy
              </Link>
            </div>
          </div>
        )}

        {!loading && sessions.length > 0 && (
          <>
            <div className="divide-y divide-line-soft rounded-xl border border-line-soft bg-white overflow-hidden shadow-sm">
              {sessions.map((s) => (
                <SessionRow
                  key={s.id}
                  session={s}
                  onRestore={handleRestore}
                  onRename={handleRename}
                  onDelete={handleDelete}
                  restoring={restoringId === s.id}
                />
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-line-soft bg-paper px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] leading-relaxed text-ink-3">
                  Local saves live only in this browser. Clearing them removes
                  the saved snapshots from this device.
                </p>
                {confirmingClear ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="inline-flex min-h-9 items-center rounded-lg bg-red-600 px-3 text-[12px] font-medium text-white hover:bg-red-700"
                    >
                      Clear all local saves
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="inline-flex min-h-9 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    className="inline-flex min-h-9 shrink-0 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
                  >
                    Clear local saves
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
