import type { ClaimCard, RhetoricMarker } from "@/lib/types";
import {
  parseClaimFilters,
  parseMarkerFilters,
  parseClaimSort,
  parseMarkerSort,
  applyClaimFilters,
  applyMarkerFilters,
  sortClaims,
  sortMarkers,
} from "./filter-selectors";

export type Siblings = {
  prev: string | null;
  next: string | null;
  index: number;
  total: number;
};

export function sourceBlockIndexFromQuery(fromQuery: URLSearchParams | null): number | null {
  const value = fromQuery?.get("source");
  if (!value?.startsWith("block:")) return null;
  const parsed = Number(value.slice("block:".length));
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function claimBlockIndex(claim: ClaimCard): number | null {
  const anchor = claim.document_anchor;
  if (!anchor) return null;
  if (anchor.paragraph_index !== undefined) return anchor.paragraph_index;
  if (anchor.cue_index !== undefined) return anchor.cue_index;
  return anchor.block_index ?? null;
}

/**
 * Compute prev/next sibling IDs for a claim within a (optionally filtered) pool.
 *
 * @param claims   - full claim list from session store
 * @param currentId - the id we're currently viewing
 * @param fromQuery - optional URLSearchParams encoding filter + sort context
 *                    (the ?from=... value parsed into a URLSearchParams object)
 */
export function claimSiblings(
  claims: ClaimCard[],
  currentId: string,
  fromQuery: URLSearchParams | null,
): Siblings {
  let pool = [...claims];
  const sourceBlockIndex = sourceBlockIndexFromQuery(fromQuery);

  if (sourceBlockIndex !== null) {
    pool = pool.filter((claim) => claimBlockIndex(claim) === sourceBlockIndex);
  }

  if (fromQuery) {
    const filters = parseClaimFilters(fromQuery);
    const sort = parseClaimSort(fromQuery);
    pool = sortClaims(applyClaimFilters(pool, filters), sort);
  } else {
    // No filter context → all claims sorted most-recent first
    pool = sortClaims(pool, "recent");
  }

  const index = pool.findIndex((c) => c.id === currentId);

  if (index === -1) {
    return { prev: null, next: null, index: -1, total: pool.length };
  }

  return {
    prev: index > 0 ? pool[index - 1].id : null,
    next: index < pool.length - 1 ? pool[index + 1].id : null,
    index,
    total: pool.length,
  };
}

/**
 * Compute prev/next sibling IDs for a marker within a (optionally filtered) pool.
 */
export function markerSiblings(
  markers: RhetoricMarker[],
  currentId: string,
  fromQuery: URLSearchParams | null,
): Siblings {
  let pool: RhetoricMarker[];

  if (fromQuery) {
    const filters = parseMarkerFilters(fromQuery);
    const sort = parseMarkerSort(fromQuery);
    pool = sortMarkers(applyMarkerFilters(markers, filters), sort);
  } else {
    pool = sortMarkers([...markers], "recent");
  }

  const index = pool.findIndex((m) => m.id === currentId);

  if (index === -1) {
    return { prev: null, next: null, index: -1, total: pool.length };
  }

  return {
    prev: index > 0 ? pool[index - 1].id : null,
    next: index < pool.length - 1 ? pool[index + 1].id : null,
    index,
    total: pool.length,
  };
}
