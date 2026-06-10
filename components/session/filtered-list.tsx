"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Braces, Download, FileCode2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { ClaimRow } from "./claim-row";
import { MarkerRow } from "./marker-row";
import { FilterDropdown } from "./filter-dropdown";
import type { DropdownOption } from "./filter-dropdown";
import type { ClaimCard, ClaimStatus, PrimaryLabel, RhetoricMarker, SessionSource } from "@/lib/types";
import { downloadFile, fileSafe } from "@/lib/client/export-actions";
import {
  parseClaimFilters,
  parseMarkerFilters,
  parseClaimSort,
  parseMarkerSort,
  applyClaimFilters,
  applyMarkerFilters,
  sortClaims,
  sortMarkers,
  describeClaimFilters,
  describeMarkerFilters,
} from "@/lib/client/filter-selectors";

// ─── URL state helpers ────────────────────────────────────────────────────────

function useUpdateParams() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  return function updateParams(
    updates: Record<string, string | string[] | null>,
  ) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) {
        next.delete(key);
      } else if (Array.isArray(value)) {
        if (value.length === 0) next.delete(key);
        else next.set(key, value.join(","));
      } else {
        next.set(key, value);
      }
    }
    router.push(`${pathname}?${next.toString()}`);
  };
}

// ─── Sort options ─────────────────────────────────────────────────────────────

const CLAIM_SORT_OPTIONS: DropdownOption[] = [
  { value: "recent", label: "Most recent" },
  { value: "score", label: "By score" },
  { value: "speaker", label: "By speaker" },
  { value: "sources", label: "By source count" },
];

const MARKER_SORT_OPTIONS: DropdownOption[] = [
  { value: "recent", label: "Most recent" },
  { value: "severity", label: "By severity" },
  { value: "speaker", label: "By speaker" },
];

const DETAIL_CONTEXT_KEYS = [
  "verdict",
  "status",
  "type",
  "severity",
  "speaker",
  "topic",
  "sort",
] as const;

function buildDetailHref(
  type: "claim" | "marker",
  id: string,
  searchParams: URLSearchParams,
) {
  const from = DETAIL_CONTEXT_KEYS
    .map((key) => {
      const value = searchParams.get(key);
      return value ? `${key}:${value}` : null;
    })
    .filter(Boolean)
    .join("|");
  const query = from ? `?from=${encodeURIComponent(from)}` : "";
  return `/session/detail/${type}/${id}${query}`;
}

function sourceSummary(source: SessionSource | undefined): string {
  if (!source) return "Unknown source";
  switch (source.kind) {
    case "youtube":
      return source.title ?? source.url ?? source.video_id ?? "YouTube";
    case "browser_tab":
      return source.title ?? source.url ?? "Browser tab";
    case "audio_file":
    case "text_doc":
      return source.filename ?? source.kind;
    case "media_url":
      return source.url;
    case "mic":
      return "Live microphone";
    default:
      return "Unknown source";
  }
}

function formatTimeRange(start: number, end: number): string {
  return `${Math.floor(start)}s-${Math.ceil(end)}s`;
}

function formatClaimStatus(status: ClaimStatus): string {
  switch (status) {
    case "checking":
      return "Still checking";
    case "provisional":
      return "Provisional";
    case "confirmed":
      return "Confirmed";
  }
}

function buildClaimsMarkdown({
  title,
  filterTitle,
  source,
  claims,
}: {
  title: string | undefined;
  filterTitle: string;
  source: SessionSource | undefined;
  claims: ClaimCard[];
}) {
  const lines = [
    `# ${filterTitle}`,
    "",
    `- Session: ${title || "Yentl session"}`,
    `- Source: ${sourceSummary(source)}`,
    `- Generated: ${new Date().toISOString()}`,
    "- Methodology: https://yentl.it/methodology",
    "- Note: AI-assisted results require source review before publication.",
    "",
    `## Claims (${claims.length})`,
    "",
  ];

  if (claims.length === 0) {
    lines.push("_(none)_", "");
    return lines.join("\n");
  }

  for (const claim of claims) {
    lines.push(`### ${claim.primary_label} · ${claim.score}/100 · ${claim.topic}`);
    lines.push(`- Time: ${formatTimeRange(claim.utterance_start, claim.utterance_end)}`);
    lines.push(`- Speaker: ${claim.speaker_id === null ? "Unknown" : `Speaker ${claim.speaker_id + 1}`}`);
    lines.push(`- Review status: ${formatClaimStatus(claim.status)}`);
    lines.push(`- Evidence status: ${claim.sources.length} source${claim.sources.length === 1 ? "" : "s"}`);
    lines.push("");
    lines.push(`> ${claim.claim_text}`);
    lines.push("");
    if (claim.explanation) lines.push(claim.explanation, "");
    if (claim.sources.length) {
      lines.push("Sources:");
      for (const source of claim.sources) {
        lines.push(`- ${source.title} (${source.domain}) — ${source.stance}; ${source.url}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function buildMarkersMarkdown({
  title,
  filterTitle,
  source,
  markers,
}: {
  title: string | undefined;
  filterTitle: string;
  source: SessionSource | undefined;
  markers: RhetoricMarker[];
}) {
  const lines = [
    `# ${filterTitle}`,
    "",
    `- Session: ${title || "Yentl session"}`,
    `- Source: ${sourceSummary(source)}`,
    `- Generated: ${new Date().toISOString()}`,
    "- Methodology: https://yentl.it/methodology",
    "- Note: AI-assisted rhetoric markers are interpretive and should be reviewed in context.",
    "",
    `## Markers (${markers.length})`,
    "",
  ];

  if (markers.length === 0) {
    lines.push("_(none)_", "");
    return lines.join("\n");
  }

  for (const marker of markers) {
    lines.push(`### ${marker.display} · ${marker.type} · ${marker.severity}`);
    lines.push(`- Time: ${formatTimeRange(marker.start_time, marker.end_time)}`);
    lines.push(`- Speaker: ${marker.speaker_id === null ? "Unknown" : `Speaker ${marker.speaker_id + 1}`}`);
    lines.push("");
    lines.push(`> ${marker.excerpt}`);
    lines.push("");
    if (marker.explanation) lines.push(marker.explanation, "");
  }

  return lines.join("\n");
}

function buildListJson({
  view,
  title,
  filterTitle,
  source,
  items,
}: {
  view: "claims" | "markers";
  title: string | undefined;
  filterTitle: string;
  source: SessionSource | undefined;
  items: ClaimCard[] | RhetoricMarker[];
}) {
  return {
    exported_by: "Yentl",
    generated_at: new Date().toISOString(),
    methodology_url: "https://yentl.it/methodology",
    ai_assisted: true,
    view,
    filter_title: filterTitle,
    session_title: title || "Yentl session",
    source,
    item_count: items.length,
    items,
  };
}

function ExportChoice({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-11 w-full items-center gap-2 rounded-md px-2.5 text-left text-[12px] font-medium text-ink-2 transition-colors hover:bg-cream sm:min-h-9"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </button>
  );
}

// ─── Verdict filter options ───────────────────────────────────────────────────

const ALL_VERDICTS: Array<{ value: string; label: string }> = [
  { value: "true", label: "TRUE" },
  { value: "mostly_true", label: "MOSTLY TRUE" },
  { value: "partial", label: "PARTIAL" },
  { value: "misleading", label: "MISLEADING" },
  { value: "omission", label: "OMISSION" },
  { value: "false", label: "FALSE" },
  { value: "unverifiable", label: "NO RELIABLE BACKING" },
  { value: "opinion", label: "OPINION" },
];

const ALL_CLAIM_STATUSES: Array<{ value: ClaimStatus; label: string }> = [
  { value: "checking", label: "Still checking" },
  { value: "provisional", label: "Provisional" },
  { value: "confirmed", label: "Confirmed" },
];

const VERDICT_URL_MAP: Record<PrimaryLabel, string> = {
  TRUE: "true",
  MOSTLY_TRUE: "mostly_true",
  PARTIAL: "partial",
  MISLEADING: "misleading",
  OMISSION: "omission",
  FALSE: "false",
  UNVERIFIABLE: "unverifiable",
  OPINION: "opinion",
};

const ALL_MARKER_TYPES: DropdownOption[] = [
  { value: "fallacy", label: "Fallacy" },
  { value: "bias", label: "Bias" },
  { value: "rhetoric", label: "Rhetoric" },
];

const ALL_SEVERITIES: DropdownOption[] = [
  { value: "blatant", label: "Blatant" },
  { value: "clear", label: "Clear" },
  { value: "subtle", label: "Subtle" },
];

// ─── Active filter chip ───────────────────────────────────────────────────────

function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex min-h-11 items-center gap-1 rounded-md border border-ink bg-ink py-0 pl-3 pr-0 text-[10.5px] font-medium text-paper sm:min-h-0 sm:px-2 sm:py-0.5">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 inline-flex h-11 w-11 items-center justify-center transition-opacity hover:opacity-70 sm:h-4 sm:w-4"
        aria-label={`Remove ${label} filter`}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 9 9"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
        >
          <line x1="1.5" y1="1.5" x2="7.5" y2="7.5" />
          <line x1="7.5" y1="1.5" x2="1.5" y2="7.5" />
        </svg>
      </button>
    </span>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="text-center py-12">
      <div className="font-serif text-[18px] text-ink-3">No matches.</div>
      <div className="text-[12px] text-ink-4 mt-2">
        Try removing a filter or check back as the conversation continues.
      </div>
    </div>
  );
}

// ─── FilteredList ─────────────────────────────────────────────────────────────

export function FilteredList() {
  const searchParams = useSearchParams();
  const updateParams = useUpdateParams();
  const [exportOpen, setExportOpen] = useState(false);

  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);
  const sessionTitle = useSession((s) => s.title);
  const source = useSession((s) => s.source);

  const speakerMap: Record<number, string> = {};
  for (const sp of speakers) {
    speakerMap[sp.id] = sp.label;
  }

  function getSpeakerLabel(speakerId: number | null): string {
    if (speakerId === null) return "Unknown";
    return speakerMap[speakerId] ?? `Speaker ${speakerId + 1}`;
  }

  const view = searchParams.get("view"); // "claims" | "markers"
  const isMarkersView = view === "markers";

  // ── Claims view ──────────────────────────────────────────────────────────

  const claimFilters = parseClaimFilters(searchParams);
  const claimSort = parseClaimSort(searchParams);
  const filteredClaims = sortClaims(
    applyClaimFilters(claims, claimFilters),
    claimSort,
  );

  // ── Markers view ─────────────────────────────────────────────────────────

  const markerFilters = parseMarkerFilters(searchParams);
  const markerSort = parseMarkerSort(searchParams);
  const filteredMarkers = sortMarkers(
    applyMarkerFilters(markers, markerFilters),
    markerSort,
  );

  // ── Title ────────────────────────────────────────────────────────────────

  const title = isMarkersView
    ? describeMarkerFilters(markerFilters, speakerMap)
    : describeClaimFilters(claimFilters, speakerMap);

  const breadcrumbLabel = isMarkersView ? "Markers" : "Claims";

  // ── Active filter chips ───────────────────────────────────────────────────

  // Build raw URL values for active verdict filters
  const activeVerdictValues = (claimFilters.verdict ?? []).map(
    (v) => VERDICT_URL_MAP[v],
  );
  const activeStatusValues = (claimFilters.status ?? []) as ClaimStatus[];
  const activeSpeakerValues = (
    (isMarkersView ? markerFilters.speaker : claimFilters.speaker) ?? []
  ).map((id) => String(id));
  const activeMarkerTypeValues = (markerFilters.type ?? []) as string[];
  const activeSeverityValues = (markerFilters.severity ?? []) as string[];

  const speakerOptions: DropdownOption[] = speakers.map((sp) => ({
    value: String(sp.id),
    label: sp.label,
  }));

  // Unique topic options from claims
  const topicSet = new Set<string>();
  for (const c of claims) {
    if (c.topic) topicSet.add(c.topic.toLowerCase());
  }
  const topicOptions: DropdownOption[] = Array.from(topicSet).map((t) => ({
    value: t,
    label: t.charAt(0).toUpperCase() + t.slice(1),
  }));

  // For "+ Add filter", show keys not yet active
  const availableFilterKeys = isMarkersView
    ? [
        !markerFilters.type?.length && "type",
        !markerFilters.speaker?.length && "speaker",
        !markerFilters.severity?.length && "severity",
      ].filter(Boolean)
    : [
        !claimFilters.verdict?.length && "verdict",
        !claimFilters.status?.length && "status",
        !claimFilters.speaker?.length && "speaker",
        !claimFilters.topic && topicOptions.length > 0 && "topic",
      ].filter(Boolean);

  const addFilterOptions: DropdownOption[] = (
    availableFilterKeys as string[]
  ).map((k) => ({
    value: k,
    label: k.charAt(0).toUpperCase() + k.slice(1),
  }));

  function handleAddFilter(key: string) {
    // Opening a filter just adds the query param with empty value; user then
    // picks from chip dropdowns. Simplest: open the matching chip immediately
    // by doing nothing here — the chip will appear after next render when set.
    // For UX: just set the param to a default first value.
    if (isMarkersView) {
      if (key === "type") updateParams({ type: "fallacy" });
      else if (key === "severity") updateParams({ severity: "blatant" });
      else if (key === "speaker" && speakers.length > 0)
        updateParams({ speaker: String(speakers[0].id) });
    } else {
      if (key === "verdict") updateParams({ verdict: "false" });
      else if (key === "status") updateParams({ status: "provisional" });
      else if (key === "topic" && topicOptions.length > 0)
        updateParams({ topic: topicOptions[0].value });
      else if (key === "speaker" && speakers.length > 0)
        updateParams({ speaker: String(speakers[0].id) });
    }
  }

  // ── Sort handler ──────────────────────────────────────────────────────────

  function handleSortChange(values: string[]) {
    const next = values[0];
    if (next) updateParams({ sort: next });
  }

  function handleExport(kind: "markdown" | "json") {
    const viewLabel = isMarkersView ? "markers" : "claims";
    const stem = fileSafe(`${sessionTitle || "yentl-session"}-${viewLabel}`);
    if (kind === "markdown") {
      const content = isMarkersView
        ? buildMarkersMarkdown({ title: sessionTitle, filterTitle: title, source, markers: filteredMarkers })
        : buildClaimsMarkdown({ title: sessionTitle, filterTitle: title, source, claims: filteredClaims });
      downloadFile(`${stem}.md`, content, "text/markdown");
    } else {
      const content = JSON.stringify(
        buildListJson({
          view: viewLabel,
          title: sessionTitle,
          filterTitle: title,
          source,
          items: isMarkersView ? filteredMarkers : filteredClaims,
        }),
        null,
        2,
      );
      downloadFile(`${stem}.json`, content, "application/json");
    }
    setExportOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 pt-5 pb-12 sm:px-6 md:px-8 md:pt-6">
      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3.5 pb-5 border-b border-line">
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] text-ink-3 font-medium">
            <Link href="/session" className="text-ink-4 hover:text-ink-2 transition-colors">
              ← Overview
            </Link>
            <span className="text-ink-5">/</span>
            <span>{breadcrumbLabel}</span>
          </div>
          <h1 className="font-serif text-[28px] tracking-tight text-ink mt-1 font-medium">
            {title}
          </h1>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <FilterDropdown
            label={
              (isMarkersView
                ? MARKER_SORT_OPTIONS
                : CLAIM_SORT_OPTIONS
              ).find(
                (o) => o.value === (isMarkersView ? markerSort : claimSort),
              )?.label ?? "Sort"
            }
            options={isMarkersView ? MARKER_SORT_OPTIONS : CLAIM_SORT_OPTIONS}
            active={isMarkersView ? markerSort : claimSort}
            onChange={handleSortChange}
          />
          <div className="relative">
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-paper transition-colors hover:border-ink-4 sm:h-10 sm:w-10"
              aria-expanded={exportOpen}
              aria-label={`Export filtered ${isMarkersView ? "markers" : "claims"}`}
              title={`Export filtered ${isMarkersView ? "markers" : "claims"}`}
              onClick={() => setExportOpen((open) => !open)}
            >
              <Download className="h-3.5 w-3.5" aria-hidden />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-[calc(100%+0.4rem)] z-10 w-44 rounded-lg border border-line bg-white p-1.5 shadow-lg">
                <ExportChoice
                  label="Markdown"
                  icon={FileCode2}
                  onClick={() => handleExport("markdown")}
                />
                <ExportChoice
                  label="JSON"
                  icon={Braces}
                  onClick={() => handleExport("json")}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refine row */}
      <div className="flex items-center gap-2 flex-wrap py-3.5 border-b border-line">
        <span className="text-[10.5px] tracking-wide uppercase text-ink-4 font-bold mr-1">
          Refine:
        </span>

        {/* Claims view: verdict chip */}
        {!isMarkersView && activeVerdictValues.length > 0 && (
          <ActiveFilterChip
            label={
              activeVerdictValues.length === 1
                ? activeVerdictValues[0].toUpperCase().replace("_", " ")
                : activeVerdictValues.map((v) => v.toUpperCase().replace("_", " ")).join(", ")
            }
            onRemove={() => updateParams({ verdict: null })}
          />
        )}

        {!isMarkersView && activeStatusValues.length > 0 && (
          <ActiveFilterChip
            label={
              activeStatusValues.length === 1
                ? formatClaimStatus(activeStatusValues[0])
                : activeStatusValues.map(formatClaimStatus).join(", ")
            }
            onRemove={() => updateParams({ status: null })}
          />
        )}

        {/* Claims view: topic chip */}
        {!isMarkersView && claimFilters.topic && (
          <ActiveFilterChip
            label={claimFilters.topic.charAt(0).toUpperCase() + claimFilters.topic.slice(1)}
            onRemove={() => updateParams({ topic: null })}
          />
        )}

        {/* Markers view: type chip */}
        {isMarkersView && activeMarkerTypeValues.length > 0 && (
          <ActiveFilterChip
            label={
              activeMarkerTypeValues.length === 1
                ? activeMarkerTypeValues[0].charAt(0).toUpperCase() + activeMarkerTypeValues[0].slice(1)
                : activeMarkerTypeValues.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(", ")
            }
            onRemove={() => updateParams({ type: null })}
          />
        )}

        {/* Markers view: severity chip */}
        {isMarkersView && activeSeverityValues.length > 0 && (
          <ActiveFilterChip
            label={
              activeSeverityValues.length === 1
                ? activeSeverityValues[0].charAt(0).toUpperCase() + activeSeverityValues[0].slice(1)
                : activeSeverityValues.map((v) => v.charAt(0).toUpperCase() + v.slice(1)).join(", ")
            }
            onRemove={() => updateParams({ severity: null })}
          />
        )}

        {/* Shared: speaker chip */}
        {activeSpeakerValues.length > 0 && (
          <ActiveFilterChip
            label={
              activeSpeakerValues.length === 1
                ? getSpeakerLabel(Number(activeSpeakerValues[0]))
                : activeSpeakerValues.map((id) => getSpeakerLabel(Number(id))).join(", ")
            }
            onRemove={() => updateParams({ speaker: null })}
          />
        )}

        {/* Inline filter dropdowns for active keys */}
        {!isMarkersView && activeVerdictValues.length === 0 && (
          <FilterDropdown
            label="All verdicts"
            options={ALL_VERDICTS}
            active={activeVerdictValues}
            onChange={(vals) =>
              updateParams({ verdict: vals.length ? vals.join(",") : null })
            }
          />
        )}

        {!isMarkersView && activeStatusValues.length === 0 && (
          <FilterDropdown
            label="All statuses"
            options={ALL_CLAIM_STATUSES}
            active={activeStatusValues}
            onChange={(vals) =>
              updateParams({ status: vals.length ? vals.join(",") : null })
            }
          />
        )}

        {isMarkersView && activeMarkerTypeValues.length === 0 && (
          <FilterDropdown
            label="All types"
            options={ALL_MARKER_TYPES}
            active={activeMarkerTypeValues}
            onChange={(vals) =>
              updateParams({ type: vals.length ? vals.join(",") : null })
            }
          />
        )}

        {speakers.length > 0 && activeSpeakerValues.length === 0 && (
          <FilterDropdown
            label="All speakers"
            options={speakerOptions}
            active={activeSpeakerValues}
            onChange={(vals) =>
              updateParams({ speaker: vals.length ? vals.join(",") : null })
            }
          />
        )}

        {isMarkersView && activeSeverityValues.length === 0 && (
          <FilterDropdown
            label="All severities"
            options={ALL_SEVERITIES}
            active={activeSeverityValues}
            onChange={(vals) =>
              updateParams({ severity: vals.length ? vals.join(",") : null })
            }
          />
        )}

        {/* + Add filter menu for remaining keys */}
        {addFilterOptions.length > 0 && (
          <FilterDropdown
            label="+ Add filter"
            options={addFilterOptions}
            active={null}
            onChange={(vals) => {
              const key = vals[0];
              if (key) handleAddFilter(key);
            }}
          />
        )}
      </div>

      {/* Cards list */}
      <div className="py-5 flex flex-col gap-3">
        {isMarkersView ? (
          filteredMarkers.length === 0 ? (
            <EmptyState />
          ) : (
            filteredMarkers.map((marker) => (
              <MarkerRow
                key={marker.id}
                marker={marker}
                speakerLabel={getSpeakerLabel(marker.speaker_id)}
                href={buildDetailHref("marker", marker.id, searchParams)}
              />
            ))
          )
        ) : filteredClaims.length === 0 ? (
          <EmptyState />
        ) : (
          filteredClaims.map((claim) => (
            <ClaimRow
              key={claim.id}
              claim={claim}
              speakerLabel={getSpeakerLabel(claim.ownership?.owner_speaker_id ?? claim.speaker_id)}
              href={buildDetailHref("claim", claim.id, searchParams)}
            />
          ))
        )}
      </div>
    </div>
  );
}
