import type { SessionSource } from "@/lib/types";

export const PLAYABLE_SOURCE_KINDS = new Set<SessionSource["kind"]>([
  "youtube",
  "audio_file",
  "media_url",
]);
