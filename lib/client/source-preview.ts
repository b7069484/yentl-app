import type { SourcePreview } from "@/lib/types";

const SOURCE_PROVIDED_IMAGE_SOURCES = new Set<NonNullable<SourcePreview["image_source"]>>([
  "open_graph",
  "twitter_card",
  "schema_org",
  "youtube_oembed",
]);

function isHttpImageUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function isSourceProvidedImageSource(source: SourcePreview["image_source"]): boolean {
  return Boolean(source && SOURCE_PROVIDED_IMAGE_SOURCES.has(source));
}

export function isValidatedSourceImage(preview: SourcePreview | undefined | null): preview is SourcePreview & { image_url: string } {
  return Boolean(
    preview?.image_url &&
    preview.image_status === "validated" &&
    isSourceProvidedImageSource(preview.image_source) &&
    isHttpImageUrl(preview.image_url),
  );
}

export function sourceImageTrustLabel(preview: SourcePreview | undefined | null): string {
  if (isValidatedSourceImage(preview)) {
    const source = preview.image_source === "open_graph"
      ? "Open Graph"
      : preview.image_source === "twitter_card"
        ? "Twitter card"
        : preview.image_source === "schema_org"
          ? "schema.org"
          : preview.image_source === "youtube_oembed"
            ? "YouTube oEmbed"
            : "source";
    return `Verified ${source} thumbnail`;
  }
  if (preview?.image_status === "validated") {
    return "Thumbnail hidden because it is not a validated source-provided image.";
  }
  if (preview?.unavailable_reason) return preview.unavailable_reason;
  return "No validated source thumbnail available.";
}
