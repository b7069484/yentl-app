import type { AttributionStatus, Speaker, SpeakerId } from "@/lib/types";

export const ATTRIBUTION_STATUS_LABEL: Record<AttributionStatus, string> = {
  confident: "confident",
  probable: "probable",
  uncertain: "uncertain",
  unsafe_overlap: "unsafe overlap",
  quote_or_clip: "quote or clip",
  manual_corrected: "manually corrected",
  not_available: "not available",
};

const RESOLVED_ATTRIBUTION_STATUSES = new Set<AttributionStatus>([
  "confident",
  "probable",
  "manual_corrected",
]);

export function attributionStatusLabel(status: AttributionStatus): string {
  return ATTRIBUTION_STATUS_LABEL[status];
}

export function isAttributionStatusResolved(status: AttributionStatus | undefined): boolean {
  return status ? RESOLVED_ATTRIBUTION_STATUSES.has(status) : true;
}

export function speakerLabelFor(
  speakers: Speaker[],
  speakerId: SpeakerId | null | undefined,
): string {
  if (speakerId === null || speakerId === undefined) return "Unknown";
  return speakers.find((speaker) => speaker.id === speakerId)?.label ?? `Speaker ${speakerId + 1}`;
}
