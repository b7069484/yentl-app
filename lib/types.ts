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
  preview?: SourcePreview;
};

export type ClaimCard = {
  id: string;
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  speaker_id: SpeakerId | null;
  topic: string;                  // primary topic (renamed alias preserved for back-compat)
  topic_secondary: string | null; // NEW — second domain when the claim cross-cuts
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
  speaker_id: SpeakerId | null;
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
  speaker_id: SpeakerId | null;
};

/**
 * Persistable synthesis snapshot — a strict subset of SynthesisState that
 * contains only the fields safe to store. The discriminant `state` field is
 * intentionally absent; on restore we always load as "fresh".
 */
export type PersistedSynthesis = {
  text: string;
  headlines: string[];
  per_speaker_verdicts?: SpeakerVerdict[];
  at: number;
};

export type PersistedDevilAdvocate = {
  stance: string;
  strongest_counterarguments: [string, string, string];
  weakest_assumption: string;
  questions: [string, string];
  confidence: "low" | "medium" | "high";
  model?: string;
  at: number;
};

/**
 * SpeakerVerdict — per-speaker truthfulness + good-faith grading carried in
 * the synthesis output. Single source of truth; session-store.ts re-exports it.
 */
export type SpeakerVerdict = {
  speaker_id: number;
  label: string;
  factual_grade: "mostly_factual" | "mixed" | "mostly_inaccurate" | "insufficient";
  faith_grade: "good_faith" | "mixed" | "bad_faith" | "insufficient";
  one_liner: string;
};

export type Session = {
  title: string;
  started_at: string;   // ISO8601
  ended_at?: string;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  speakers: Speaker[];
  source: SessionSource;
  /** Persisted synthesis snapshot. Present only when state was "fresh" or "refreshing". */
  synthesis?: PersistedSynthesis;
  /** Persisted Devil's Advocate snapshot. Present only when Grok has returned a usable brief. */
  devil_advocate?: PersistedDevilAdvocate;
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
  /** Exact publisher/source image validation status. Never use generated art as evidence. */
  image_status?: "validated" | "missing" | "invalid" | "blocked";
  /** Where the image candidate came from before validation. */
  image_source?: "open_graph" | "twitter_card" | "schema_org" | "youtube_oembed" | "none";
  /** Final URL after redirects for a validated image, when known. */
  image_final_url?: string | null;
  image_content_type?: string | null;
  image_dimensions?: { width: number; height: number } | null;
  validated_at?: number | null;
  unavailable_reason?: string | null;
};

/* ── Session provenance (added in Sprint 1) ────────────────────── */

export type BrowserTabContext = {
  page_title?: string;
  site_name?: string;
  channel_name?: string;
  author_name?: string;
  username?: string;
  description?: string;
  canonical_url?: string;
  detected_names?: string[];
};

export type SessionSource =
  | { kind: "mic" }
  | { kind: "browser_tab"; tab_id?: number; title?: string; url?: string; context?: BrowserTabContext }
  | { kind: "audio_file"; blob_url: string; duration_sec: number; filename: string; mime: string }
  | { kind: "text_doc"; filename: string; mime: string; byte_count: number; intent?: "document" | "claim_only"; initial_text?: string }
  | { kind: "youtube"; video_id: string; url: string; title?: string; channel?: string; duration_sec?: number }
  | { kind: "media_url"; url: string };
