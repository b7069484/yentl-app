"use client";
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Download,
  Trash2,
  PencilLine,
  Clock,
  Search,
  SlidersHorizontal,
  Mic,
  FileText,
  FileAudio,
  Video,
  Globe,
  MonitorPlay,
} from "lucide-react";
import {
  listSessions,
  loadSession,
  renameSession,
  deleteSession,
  clearAllSessions,
  type SavedSessionMeta,
  type SavedSession,
} from "@/lib/client/session-storage";
import {
  deleteCloudSession,
  listCloudSessions,
  loadCloudSession,
  mergeSavedSessionMetas,
  renameCloudSession,
  type CloudSessionFailureStatus,
} from "@/lib/client/session-sync";
import { exportSession, type SessionExportKind } from "@/lib/client/export-actions";
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
type SourceFilter = "all" | SavedSessionMeta["source_kind"];
type SortKey = "recent" | "oldest" | "name" | "claims" | "duration";
type StorageScope = "local" | "cloud" | "both";
type CloudStatus = "checking" | "synced" | CloudSessionFailureStatus;

function clientCloudSyncConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
}

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

function sourceLabel(kind: string) {
  return SOURCE_CONFIG[kind]?.label ?? kind;
}

function sourceEvidenceLabel(session: SavedSessionMeta): string {
  if (session.source_count === 0) return "0 sources";
  return `${session.source_linked_count}/${session.source_count} linked sources`;
}

function visibleSessions(
  sessions: SavedSessionMeta[],
  query: string,
  sourceFilter: SourceFilter,
  sortKey: SortKey,
) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = sessions.filter((session) => {
    if (sourceFilter !== "all" && session.source_kind !== sourceFilter) return false;
    if (!normalizedQuery) return true;
    const haystack = [
      session.name,
      sourceLabel(session.source_kind),
      session.source_kind,
      `${session.claim_count} claims`,
      `${session.marker_count} markers`,
      `${session.speaker_count} speakers`,
      `${session.source_count} sources`,
      `${session.source_linked_count} linked sources`,
      `${session.high_source_count} high reputation sources`,
    ].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return [...filtered].sort((a, b) => {
    switch (sortKey) {
      case "oldest":
        return a.saved_at.localeCompare(b.saved_at);
      case "name":
        return a.name.localeCompare(b.name);
      case "claims":
        return b.claim_count - a.claim_count || b.saved_at.localeCompare(a.saved_at);
      case "duration":
        return b.duration_sec - a.duration_sec || b.saved_at.localeCompare(a.saved_at);
      case "recent":
      default:
        return b.saved_at.localeCompare(a.saved_at);
    }
  });
}

// ─── Session row ──────────────────────────────────────────────────────────────

type RowProps = {
  session: SavedSessionMeta;
  storage: StorageScope;
  onRestore: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onExport: (id: string, kind: SessionExportKind) => void;
  restoring: boolean;
  exporting: boolean;
};

function SessionRow({
  session: s,
  storage,
  onRestore,
  onRename,
  onDelete,
  onExport,
  restoring,
  exporting,
}: RowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(s.name);
  const [confirming, setConfirming] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
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
    <div className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-cream/40 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
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
            className="inline-flex min-h-11 max-w-[260px] items-center rounded-lg text-left font-serif text-[14px] font-medium text-ink transition-colors hover:text-teal"
            aria-label={`Restore session: ${s.name}`}
          >
            <span className="truncate">{s.name}</span>
          </button>
        )}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <SourceBadge kind={s.source_kind} />
          <StorageBadge storage={storage} />
          <span className="text-[11px] text-ink-4 inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {relativeTime(s.saved_at)}
          </span>
          <span className="text-[11px] text-ink-4">{fmtDuration(s.duration_sec)}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-3 tabular-nums font-mono sm:hidden">
          <span>{s.claim_count} claims</span>
          <span>{s.marker_count} markers</span>
          <span>{s.speaker_count} speakers</span>
          <span>{sourceEvidenceLabel(s)}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex items-center gap-4 text-[11px] text-ink-3 tabular-nums font-mono shrink-0">
        <span>{s.claim_count} claims</span>
        <span>{s.marker_count} markers</span>
        <span>{s.speaker_count} speakers</span>
        <span>{sourceEvidenceLabel(s)}</span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
        {restoring ? (
          <span className="text-[11px] text-ink-4 animate-pulse">Restoring…</span>
        ) : (
          <>
            <button
              type="button"
              onClick={() => onRestore(s.id)}
              className="inline-flex min-h-11 items-center rounded-lg bg-teal px-3 text-[12px] font-medium text-white transition-colors hover:bg-teal-2 sm:min-h-9"
              aria-label={`Resume session: ${s.name}`}
            >
              Resume
            </button>
            <div className="flex flex-wrap items-center gap-1.5">
              <Link
                href={`/tv?restore=${encodeURIComponent(s.id)}`}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-paper px-3 text-[12px] font-medium text-ink-2 transition-colors hover:bg-cream sm:min-h-9"
                aria-label={`Open room display: ${s.name}`}
              >
                <MonitorPlay className="h-3.5 w-3.5" />
                Room
              </Link>
              <button
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-line bg-paper px-3 text-[12px] font-medium text-ink-2 transition-colors hover:bg-cream sm:min-h-9"
                aria-expanded={exportOpen}
                aria-label={`Export session: ${s.name}`}
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              {exportOpen && (
                <div className="flex flex-wrap items-center gap-1 rounded-lg border border-line bg-white p-1">
                  <ExportChoice
                    label="Report"
                    ariaLabel={`Export report: ${s.name}`}
                    disabled={exporting}
                    onClick={() => {
                      onExport(s.id, "report");
                      setExportOpen(false);
                    }}
                  />
                  <ExportChoice
                    label="Markdown"
                    ariaLabel={`Export Markdown: ${s.name}`}
                    disabled={exporting}
                    onClick={() => {
                      onExport(s.id, "markdown");
                      setExportOpen(false);
                    }}
                  />
                  <ExportChoice
                    label="Transcript"
                    ariaLabel={`Export transcript: ${s.name}`}
                    disabled={exporting}
                    onClick={() => {
                      onExport(s.id, "transcript");
                      setExportOpen(false);
                    }}
                  />
                  <ExportChoice
                    label="JSON"
                    ariaLabel={`Export JSON: ${s.name}`}
                    disabled={exporting}
                    onClick={() => {
                      onExport(s.id, "json");
                      setExportOpen(false);
                    }}
                  />
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { setEditing(true); setDraft(s.name); }}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-paper text-ink-4 transition-colors hover:text-ink-2 sm:min-h-9 sm:min-w-9"
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
                  className="inline-flex min-h-11 items-center rounded-lg bg-red-600 px-3 text-[11px] font-medium text-white hover:bg-red-700 sm:min-h-9"
                  aria-label={`Confirm delete session: ${s.name}`}
                >
                  Delete
                </button>
                <span className="text-ink-4">·</span>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  className="inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-3 text-[11px] text-ink-3 hover:text-ink sm:min-h-9"
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line bg-paper text-ink-4 transition-colors hover:text-red-500 sm:min-h-9 sm:min-w-9"
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

function StorageBadge({ storage }: { storage: StorageScope }) {
  const label =
    storage === "both"
      ? "Local + cloud"
      : storage === "cloud"
        ? "Cloud"
        : "Local";
  return (
    <span className="inline-flex items-center rounded-full border border-line-soft bg-paper px-2 py-0.5 text-[11px] font-medium text-ink-3">
      {label}
    </span>
  );
}

function ExportChoice({
  label,
  ariaLabel,
  disabled,
  onClick,
}: {
  label: string;
  ariaLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-11 items-center rounded-md px-2.5 text-left text-[12px] font-medium text-ink-2 transition-colors hover:bg-cream disabled:cursor-wait disabled:opacity-60 sm:min-h-9"
    >
      {label}
    </button>
  );
}

// ─── SessionsLibraryPage ───────────────────────────────────────────────────────

export default function SessionsLibraryPage() {
  const [sessions, setSessions] = useState<SavedSessionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [query, setQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("recent");
  const [localIds, setLocalIds] = useState<Set<string>>(() => new Set());
  const [cloudIds, setCloudIds] = useState<Set<string>>(() => new Set());
  const [cloudStatus, setCloudStatus] = useState<CloudStatus>("checking");
  const [cloudMessage, setCloudMessage] = useState<string | null>(null);

  const router = useRouter();
  const restoreSession = useSession((s) => s.restoreSession);
  const filteredSessions = useMemo(
    () => visibleSessions(sessions, query, sourceFilter, sortKey),
    [query, sessions, sortKey, sourceFilter],
  );
  const sourceFilters = useMemo(
    () => Array.from(new Set(sessions.map((session) => session.source_kind))).sort((a, b) =>
      sourceLabel(a).localeCompare(sourceLabel(b)),
    ),
    [sessions],
  );

  const storageScopeFor = useCallback(
    (id: string): StorageScope => {
      const local = localIds.has(id);
      const cloud = cloudIds.has(id);
      if (local && cloud) return "both";
      if (cloud) return "cloud";
      return "local";
    },
    [cloudIds, localIds],
  );

  const refresh = useCallback(async () => {
    try {
      const localList = await listSessions();
      const nextLocalIds = new Set(localList.map((session) => session.id));
      setLocalIds(nextLocalIds);

      if (!clientCloudSyncConfigured()) {
        setCloudIds(new Set());
        setCloudStatus("unavailable");
        setCloudMessage("Account sync is not configured for this Yentl environment.");
        setSessions(localList);
        return;
      }

      const cloudList = await listCloudSessions();
      if (cloudList.ok) {
        setCloudIds(new Set(cloudList.data.map((session) => session.id)));
        setCloudStatus("synced");
        setCloudMessage(
          cloudList.data.length > 0
            ? "Account sync is connected. Cloud saves can be restored from another device."
            : "Account sync is connected. New saves will sync after they are created.",
        );
        setSessions(mergeSavedSessionMetas(localList, cloudList.data));
      } else {
        setCloudIds(new Set());
        setCloudStatus(cloudList.status);
        setCloudMessage(cloudList.message);
        setSessions(localList);
      }
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

  const loadSavedSession = useCallback(
    async (id: string): Promise<SavedSession> => {
      if (cloudIds.has(id)) {
        const cloud = await loadCloudSession(id);
        if (cloud.ok) return cloud.data;
        if (!localIds.has(id)) {
          throw new Error(cloud.message);
        }
      }
      return loadSession(id);
    },
    [cloudIds, localIds],
  );

  const handleRestore = useCallback(
    async (id: string) => {
      setRestoringId(id);
      try {
        const saved = await loadSavedSession(id);
        restoreSession(saved.session);
        router.push("/session?view=overview");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to restore session",
        );
        setRestoringId(null);
      }
    },
    [loadSavedSession, restoreSession, router],
  );

  const handleRename = useCallback(async (id: string, name: string) => {
    try {
      if (localIds.has(id)) {
        await renameSession(id, name);
      }
      if (cloudIds.has(id)) {
        const cloud = await renameCloudSession(id, name);
        if (!cloud.ok && !localIds.has(id)) throw new Error(cloud.message);
        if (!cloud.ok) setError(`Renamed locally. ${cloud.message}`);
      }
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, name } : s)),
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to rename session",
      );
    }
  }, [cloudIds, localIds]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      let cloudDeleteOk = !cloudIds.has(id);
      if (localIds.has(id)) {
        await deleteSession(id);
        setLocalIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
      if (cloudIds.has(id)) {
        const cloud = await deleteCloudSession(id);
        if (!cloud.ok && !localIds.has(id)) throw new Error(cloud.message);
        if (!cloud.ok) setError(`Deleted locally. ${cloud.message}`);
        if (cloud.ok) {
          cloudDeleteOk = true;
          setCloudIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
        }
      }
      if (cloudDeleteOk) {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete session",
      );
    }
  }, [cloudIds, localIds]);

  const handleExport = useCallback(async (id: string, kind: SessionExportKind) => {
    setExportingId(id);
    setError(null);
    try {
      const saved = await loadSavedSession(id);
      exportSession(saved.session, kind);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export saved session",
      );
    } finally {
      setExportingId(null);
    }
  }, [loadSavedSession]);

  const handleClearAll = useCallback(async () => {
    try {
      await clearAllSessions();
      setLocalIds(new Set());
      setSessions((prev) => prev.filter((session) => cloudIds.has(session.id)));
      setConfirmingClear(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear local saves",
      );
    }
  }, [cloudIds]);

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-cream border-b border-line-soft">
        <div className="px-6 md:px-8 py-3 flex items-center gap-4 max-w-[1280px] mx-auto w-full">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-lg font-serif text-[22px] font-medium tracking-tight text-ink"
          >
            <span>yentl</span>
            <span
              aria-hidden
              className="yentl-dot inline-block w-2 h-2 ml-1.5"
            />
          </Link>
          <span className="text-ink-4 text-[13px]">/</span>
          <span className="font-serif text-[18px] text-ink-2 font-medium">
            Saved sessions
          </span>
          <div className="ml-auto">
            <Link
              href="/session"
              className="inline-flex min-h-11 items-center rounded-lg px-3 text-[12px] font-medium text-teal transition-colors hover:text-teal-2"
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
            Saved sessions
          </h1>
        </div>

        <section className="mb-6 rounded-xl border border-line-soft bg-paper px-4 py-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                Account sync
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                {cloudMessage ??
                  (cloudStatus === "checking"
                    ? "Checking whether account-synced saved sessions are available."
                    : "Browser-local saves are available on this device.")}
              </p>
            </div>
            <span className="inline-flex w-fit items-center rounded-full border border-line-soft bg-cream px-2.5 py-1 text-[11px] font-medium text-ink-3">
              {cloudStatus === "synced"
                ? "Cloud connected"
                : cloudStatus === "checking"
                  ? "Checking"
                  : cloudStatus === "signed_out"
                    ? "Sign in to sync"
                    : "Local fallback"}
            </span>
          </div>
        </section>

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
              No saved sessions yet.
            </p>
            <p className="mx-auto max-w-md text-[13px] leading-relaxed text-ink-3">
              Start an analysis first. Once Yentl has transcript, claims,
              markers, or a report brief, the{" "}
              <span className="font-medium text-ink-2">Save</span> action adds
              a snapshot to this library.
            </p>
            <p className="mx-auto mt-3 max-w-md text-[12px] leading-relaxed text-ink-4">
              Guest saves stay in this browser. Signed-in saves can sync to
              your account when the cloud backend is configured.
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
            <section className="mb-4 rounded-xl border border-line-soft bg-paper p-3 shadow-sm sm:p-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                <label className="block" htmlFor="session-search">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                    <Search className="h-3.5 w-3.5" aria-hidden />
                    Search saves
                  </span>
                  <input
                    id="session-search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search by name, source, claims..."
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                  />
                </label>

                <label className="block" htmlFor="source-filter">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                    Source
                  </span>
                  <select
                    id="source-filter"
                    value={sourceFilter}
                    onChange={(event) => setSourceFilter(event.target.value as SourceFilter)}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="all">All sources</option>
                    {sourceFilters.map((kind) => (
                      <option key={kind} value={kind}>
                        {sourceLabel(kind)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block" htmlFor="sort-sessions">
                  <span className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                    <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                    Sort
                  </span>
                  <select
                    id="sort-sessions"
                    value={sortKey}
                    onChange={(event) => setSortKey(event.target.value as SortKey)}
                    className="h-11 w-full rounded-lg border border-line bg-white px-3 text-[13px] text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
                  >
                    <option value="recent">Newest saved</option>
                    <option value="oldest">Oldest saved</option>
                    <option value="name">Name A-Z</option>
                    <option value="claims">Most claims</option>
                    <option value="duration">Longest session</option>
                  </select>
                </label>
              </div>

              <div className="mt-3 flex flex-col gap-2 text-[12px] text-ink-3 sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {filteredSessions.length.toLocaleString()} of {sessions.length.toLocaleString()} saved sessions.
                </span>
                {(query || sourceFilter !== "all" || sortKey !== "recent") && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      setSourceFilter("all");
                      setSortKey("recent");
                    }}
                    className="inline-flex min-h-11 w-fit items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
                  >
                    Reset library view
                  </button>
                )}
              </div>
            </section>

            <div className="divide-y divide-line-soft rounded-xl border border-line-soft bg-white overflow-hidden shadow-sm">
              {filteredSessions.length > 0 ? (
                filteredSessions.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    storage={storageScopeFor(s.id)}
                    onRestore={handleRestore}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onExport={handleExport}
                    restoring={restoringId === s.id}
                    exporting={exportingId === s.id}
                  />
                ))
              ) : (
                <div className="px-5 py-10 text-center">
                  <p className="font-serif text-[20px] text-ink-2">No saved sessions match this view.</p>
                  <p className="mx-auto mt-2 max-w-md text-[13px] leading-relaxed text-ink-3">
                    Try a broader search, show all sources, or reset the library view.
                  </p>
                </div>
              )}
            </div>
            <div className="mt-5 rounded-xl border border-line-soft bg-paper px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[12.5px] leading-relaxed text-ink-3">
                  Local saves live only in this browser. Clearing them removes
                  browser-local snapshots from this device; account-synced
                  sessions remain available until deleted individually.
                </p>
                {confirmingClear ? (
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="inline-flex min-h-11 items-center rounded-lg bg-red-600 px-3 text-[12px] font-medium text-white hover:bg-red-700"
                    >
                      Clear all local saves
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingClear(false)}
                      className="inline-flex min-h-11 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingClear(true)}
                    className="inline-flex min-h-11 shrink-0 items-center rounded-lg border border-line bg-cream px-3 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
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
