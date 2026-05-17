import type { SpeakerId } from "@/lib/types";

export const SPEAKER_PALETTE = [
  { dot: "bg-spk-1", label: "text-ink",     border: "border-spk-1" },
  { dot: "bg-spk-2", label: "text-amber-2", border: "border-spk-2" },
  { dot: "bg-spk-3", label: "text-teal-2",  border: "border-spk-3" },
  { dot: "bg-spk-4", label: "text-purple",  border: "border-spk-4" },
  { dot: "bg-spk-5", label: "text-pink",    border: "border-spk-5" },
  { dot: "bg-spk-6", label: "text-orange",  border: "border-spk-6" },
];

export type SpeakerPalette = (typeof SPEAKER_PALETTE)[number];

export function paletteFor(id: SpeakerId): SpeakerPalette {
  return SPEAKER_PALETTE[id % SPEAKER_PALETTE.length];
}
