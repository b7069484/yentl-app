import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";
import type { FurtherReading } from "./types";
import bookEntries from "./book-entries.json";
import { EXTRAS } from "./extras";

export type { FurtherReading } from "./types";

export type TaxonomyEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  source: "book" | "extra";
  definition?: string;
  example?: string;
  aka?: string;
  archetype?: Archetype;
  how_to_spot?: string[];
  further_reading?: FurtherReading[];
  related_canonical_ids?: string[];
  wikipedia_slug?: string;
};

const BOOK_AS_ENTRIES: TaxonomyEntry[] = (bookEntries as Array<{
  canonical_id: string;
  type: "bias" | "fallacy";
  chapter: string;
  display: string;
  definition: string;
  example: string;
  archetype?: Archetype;
  how_to_spot?: string[];
  further_reading?: FurtherReading[];
  related_canonical_ids?: string[];
  wikipedia_slug?: string;
}>).map((e) => ({
  canonical_id: e.canonical_id,
  type: e.type,
  display: e.display,
  source: "book" as const,
  definition: e.definition,
  example: e.example,
  archetype: e.archetype,
  how_to_spot: e.how_to_spot,
  further_reading: e.further_reading,
  related_canonical_ids: e.related_canonical_ids,
  wikipedia_slug: e.wikipedia_slug,
}));

const EXTRAS_AS_ENTRIES: TaxonomyEntry[] = EXTRAS.map((e) => ({
  ...e,
  source: "extra" as const,
}));

export const ALL: TaxonomyEntry[] = [...BOOK_AS_ENTRIES, ...EXTRAS_AS_ENTRIES];

const BY_ID = new Map(ALL.map((e) => [e.canonical_id, e]));

export function getEntry(id: string): TaxonomyEntry | undefined {
  return BY_ID.get(id);
}

export function entriesByType(type: MarkerType): TaxonomyEntry[] {
  return ALL.filter((e) => e.type === type);
}

export function totalCount(): number {
  return ALL.length;
}
