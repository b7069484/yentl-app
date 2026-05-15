import { getEntry } from "./index";

// Default rule: canonical_id → "Capitalize_with_underscores".
// Example: "slippery_slope" → "Slippery_slope".
// If the entry carries an explicit `wikipedia_slug`, that wins.
export function wikiSlugFor(canonicalId: string): string | null {
  const entry = getEntry(canonicalId);
  if (!entry) return null;
  if (entry.wikipedia_slug) return entry.wikipedia_slug;
  // Default derivation: capitalize first word only
  return canonicalId
    .split("_")
    .map((part, i) =>
      i === 0 ? part.charAt(0).toUpperCase() + part.slice(1) : part,
    )
    .join("_");
}

export function wikiUrlFor(canonicalId: string): string | null {
  const slug = wikiSlugFor(canonicalId);
  if (!slug) return null;
  return `https://en.wikipedia.org/wiki/${slug}`;
}
