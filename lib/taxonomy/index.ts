import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";
import bookEntries from "./book-entries.json";
import { EXTRAS } from "./extras";

export type TaxonomyEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  source: "book" | "extra";
  definition?: string;
  example?: string;
  aka?: string;
  archetype?: Archetype;
};

const BOOK_AS_ENTRIES: TaxonomyEntry[] = (bookEntries as Array<{
  canonical_id: string;
  type: "bias" | "fallacy";
  chapter: string;
  display: string;
  definition: string;
  example: string;
}>).map((e) => ({
  canonical_id: e.canonical_id,
  type: e.type,
  display: e.display,
  source: "book" as const,
  definition: e.definition,
  example: e.example,
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
