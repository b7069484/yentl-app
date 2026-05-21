"use client";

import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { ClaimRow } from "./claim-row";
import { MarkerRow } from "./marker-row";
import { FilterDropdown } from "./filter-dropdown";
import type { DropdownOption } from "./filter-dropdown";
import type { PrimaryLabel } from "@/lib/types";
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

// ─── Verdict filter options ───────────────────────────────────────────────────

const ALL_VERDICTS: Array<{ value: string; label: string }> = [
  { value: "true", label: "TRUE" },
  { value: "mostly_true", label: "MOSTLY TRUE" },
  { value: "partial", label: "PARTIAL" },
  { value: "misleading", label: "MISLEADING" },
  { value: "omission", label: "OMISSION" },
  { value: "false", label: "FALSE" },
  { value: "unverifiable", label: "UNVERIFIABLE" },
  { value: "opinion", label: "OPINION" },
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
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-ink text-paper text-[10.5px] font-medium border border-ink">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 hover:opacity-70 transition-opacity"
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

  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);

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

  return (
    <div className="px-6 md:px-8 pt-6 pb-12 max-w-[1200px] mx-auto w-full">
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

        <div className="flex items-center gap-2">
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
          <button
            type="button"
            className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-line bg-paper hover:border-ink-4 transition-colors"
            aria-label="Download"
            title="Download"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M7,2 L7,10 M4,8 L7,11 L10,8" />
              <path d="M2,12 L12,12" />
            </svg>
          </button>
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
              speakerLabel={getSpeakerLabel(claim.speaker_id)}
              href={buildDetailHref("claim", claim.id, searchParams)}
            />
          ))
        )}
      </div>
    </div>
  );
}
