export type PrimaryLabel =
  | "TRUE"
  | "MOSTLY_TRUE"
  | "PARTIAL"
  | "MISLEADING"
  | "OMISSION"
  | "FALSE"
  | "UNVERIFIABLE"
  | "OPINION";

export type ClaimStatus = "checking" | "provisional" | "confirmed";

export type ReputationTier = "high" | "mid" | "low";

export type Stance = "supports" | "contradicts" | "mixed";

export type Source = {
  url: string;
  domain: string;
  title: string;
  reputation_tier: ReputationTier;
  stance: Stance;
  excerpt?: string;
};

export type ClaimCard = {
  id: string;
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  primary_label: PrimaryLabel;
  score: number;
  annotations: string[];
  explanation: string;
  status: ClaimStatus;
  sources: Source[];
};

export type MarkerType = "fallacy" | "bias" | "rhetoric";
export type MarkerSeverity = "subtle" | "clear" | "blatant";

export type RhetoricMarker = {
  id: string;
  type: MarkerType;
  name: string;       // canonical id from taxonomy
  display: string;    // human label
  excerpt: string;
  start_time: number;
  end_time: number;
  severity: MarkerSeverity;
  explanation: string;
};

export type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
  is_final: boolean;
};

export type Session = {
  title: string;
  started_at: string;   // ISO8601
  ended_at?: string;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
};

/* ── Speakers (added in Sprint 1) ─────────────────────────────── */

export type SpeakerId = number;             // 0, 1, 2... as Deepgram emits

export type Speaker = {
  id: SpeakerId;                            // canonical Deepgram speaker index
  label: string;                            // default "Speaker 1", "Speaker 2", ...
};

/* ── Source preview (added in Sprint 1) ────────────────────────── */

export type SourcePreview = {
  image_url: string | null;
  image_alt: string | null;
  title: string | null;
  description: string | null;
  fetched_at: number;                       // epoch ms — for cache TTL
};

/* ── Session provenance (added in Sprint 1) ────────────────────── */

export type SessionSource =
  | { kind: "mic" }
  | { kind: "audio_file"; blob_url: string; duration_sec: number; filename: string; mime: string }
  | { kind: "text_doc"; filename: string; mime: string; byte_count: number }
  | { kind: "youtube"; video_id: string; url: string; title?: string; channel?: string; duration_sec?: number }
  | { kind: "media_url"; url: string };
