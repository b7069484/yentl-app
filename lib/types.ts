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
  /** How the speaker held the claim — extracted by analyze-rhetoric/extract-claims. */
  stance?: ClaimStance;
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

  /**
   * Speaker index when known. NULL when diarization is off or the provider
   * did not return a speaker for this utterance. Do NOT default to 0.
   */
  speaker_id: SpeakerId | null;

  /** Stable segment identity for cross-references. Optional for back-compat. */
  id?: string;
  /** ASR provider that emitted this segment, e.g. "deepgram". */
  provider?: string;

  /** Word-level ASR evidence — preserved from provider response when present. */
  words?: ASRWord[];

  /** Per-speaker presence aggregated from words[]. Empty when words[] absent. */
  speaker_distribution?: SpeakerDistribution[];

  /** Graduated attribution confidence. Defaults to "not_available" when diarize=false. */
  attribution_status?: AttributionStatus;

  /** Reasons that explain the attribution_status assignment. */
  attribution_reasons?: AttributionReason[];

  /** Overlap taxonomy from turn-builder (Phase 3 fills this; Phase 1a reserves it). */
  overlap_class?: OverlapClass;

  /** Identity of the turn this segment belongs to (Phase 3 fills this). */
  turn_id?: string | null;

  /** Where the audio came from — drives attribution defaults. */
  source_audio_kind?: SourceAudioKind;

  /** Prosodic features captured at the segment level (Phase 1a: RMS only). */
  audio_features?: AudioFeatures;
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

/* ── Attribution evidence (Phase 1a — see Speaker Attribution Spec, sections 80 through 200) ── */

/**
 * A single ASR-decoded word with timing, confidence, and (when diarization is
 * enabled) per-word speaker assignment. Preserved from Deepgram's
 * results.channels[0].alternatives[0].words array.
 */
export type ASRWord = {
  text: string;
  start: number;            // seconds
  end: number;              // seconds
  confidence: number;       // 0..1 ASR confidence
  speaker?: number | null;  // diarized speaker index when available
  speaker_confidence?: number; // 0..1 when diarized
};

/**
 * Aggregated speaker presence within a segment — word-count, total duration,
 * and mean ASR confidence per detected speaker. Lets the UI surface
 * "60% Speaker 1, 40% Speaker 2" rather than a single hard label.
 */
export type SpeakerDistribution = {
  speaker_id: number;
  word_count: number;
  duration: number;         // seconds — total duration this speaker held within the segment
  mean_confidence: number;
};

/**
 * Graduated attribution confidence. Replaces the binary "speaker_id is set or 0"
 * model. "confident" means we trust it; "not_available" means we did not run
 * diarization (or it returned no speaker); "unsafe_overlap" means substantive
 * crosstalk made attribution unsafe.
 */
export type AttributionStatus =
  | "confident"
  | "probable"
  | "uncertain"
  | "unsafe_overlap"
  | "quote_or_clip"
  | "manual_corrected"
  | "not_available";

/**
 * Why a segment landed at the attribution_status it did. Multiple reasons may
 * co-apply (e.g., dominant_speaker_low_margin + speaker_change_mid_segment).
 */
export type AttributionReason =
  | "single_speaker_high_confidence"
  | "dominant_speaker_low_margin"
  | "speaker_change_mid_segment"
  | "short_backchannel"
  | "competitive_interruption"
  | "parallel_claim"
  | "crowd_or_bleed"
  | "quoted_or_reported_speech"
  | "provider_missing_speaker"
  | "manual_user_action";

/**
 * Conversational overlap taxonomy. Used by the turn-builder layer in Phase 3
 * but reserved here so segment shapes stay stable across phases.
 */
export type OverlapClass =
  | "none"
  | "backchannel_continuer"
  | "collaborative_completion"
  | "competitive_interruption"
  | "repair_initiation"
  | "parallel_claim"
  | "crowd_or_bleed"
  | "unknown_overlap";

/**
 * Where the audio for this segment came from. Drives attribution defaults —
 * e.g., browser_tab audio is mixed-mono and attribution should default to
 * "uncertain" regardless of what diarization returns.
 */
export type SourceAudioKind =
  | "mic"
  | "browser_tab"
  | "audio_file"
  | "youtube_caption"
  | "srt_vtt"
  | "diagnostic_corpus";

/**
 * Prosodic / energy features captured at the segment level. Phase 1a persists
 * RMS only (loudness during the segment). Pitch, rate, and pause features
 * land in Phase E.
 */
export type AudioFeatures = {
  rms?: number;        // mean RMS amplitude during segment, 0..1 normalized
  peak_rms?: number;   // maximum RMS observed during segment
};

/**
 * How the speaker holds the claim — asserted as their own truth, denied,
 * quoted from someone else, mocked, hedged, etc. Phase 1a captures stance
 * at extraction time so the verdict layer doesn't have to re-infer it.
 */
export type ClaimStance =
  | "asserted"
  | "denied"
  | "quoted"
  | "reported"
  | "mocked"
  | "questioned"
  | "corrected"
  | "hedged"
  | "unclear";

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
  | {
      kind: "text_doc";
      filename: string;
      mime: string;
      byte_count: number;
      intent?: "document" | "claim_only" | "web_url";
      initial_text?: string;
      source_url?: string;
    }
  | { kind: "youtube"; video_id: string; url: string; title?: string; channel?: string; duration_sec?: number }
  | { kind: "media_url"; url: string };
