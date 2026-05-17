import { create } from "zustand";
import type {
  ClaimCard,
  PersistedSynthesis,
  RhetoricMarker,
  Session,
  SessionSource,
  Speaker,
  SpeakerId,
  SpeakerVerdict,
  TranscriptSegment,
} from "@/lib/types";

// Re-export so existing imports (`import type { SpeakerVerdict } from "@/lib/client/session-store"`)
// keep working — single source of truth lives in lib/types.ts.
export type { SpeakerVerdict };

export type SynthesisState =
  | null
  | { state: "warming"; at: number }
  | { state: "fresh"; text: string; headlines: string[]; per_speaker_verdicts?: SpeakerVerdict[]; at: number }
  | { state: "refreshing"; text: string; headlines: string[]; per_speaker_verdicts?: SpeakerVerdict[]; at: number }
  | { state: "error"; text?: string; headlines?: string[]; per_speaker_verdicts?: SpeakerVerdict[]; at: number; lastError?: string };

type State = {
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  transcript: TranscriptSegment[];
  interim: string;
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  speakers: Speaker[];
  source: SessionSource;
  speakersMode: boolean;
  isRecording: boolean;
  mode: "A" | "D";
  synthesis: SynthesisState;
  micStream: MediaStream | null;
  prerecordStage: "picker" | "selected";

  // actions
  startSession: (title?: string) => void;
  endSession: () => void;
  setInterim: (text: string) => void;
  appendFinal: (segment: TranscriptSegment) => void;
  addClaim: (c: ClaimCard) => void;
  updateClaim: (id: string, patch: Partial<ClaimCard>) => void;
  addMarker: (m: RhetoricMarker) => void;
  ensureSpeaker: (id: SpeakerId) => void;
  renameSpeaker: (id: SpeakerId, label: string) => void;
  setSource: (source: SessionSource) => void;
  setSpeakersMode: (b: boolean) => void;
  toggleMode: () => void;
  setRecording: (b: boolean) => void;
  setSynthesis: (s: SynthesisState) => void;
  setMicStream: (stream: MediaStream | null) => void;
  setPrerecordStage: (stage: "picker" | "selected") => void;
  restoreSession: (session: Session) => void;
  toSession: () => Session;
  reset: () => void;
  /**
   * Reassigns a transcript segment (by index) to a different speaker.
   * Cascades the change to any claims whose utterance_start matches the
   * segment's start time, and any markers whose time range falls within
   * the segment's time range (with 1 s tolerance).
   * No-ops when index is out of bounds or speaker is already assigned.
   */
  reassignUtterance: (transcriptIndex: number, newSpeakerId: SpeakerId) => void;
  /**
   * Creates the next speaker (max existing id + 1), registers it, and
   * returns its id. Useful for the "Add new speaker" affordance.
   */
  addNewSpeaker: () => SpeakerId;
  /**
   * Splits a transcript segment at a given time boundary and re-attributes
   * the post-split portion (and associated claims/markers) to a new speaker.
   *
   * Contract:
   *  - index out of bounds → no-op
   *  - splitTime not strictly inside (seg.start, seg.end) → no-op
   *  - The segment text is split at the nearest WORD boundary to the split
   *    fraction. Left half retains the original speaker; right half gets
   *    newSpeakerId.
   *  - Claims with utterance_start >= splitTime AND <= original seg.end get
   *    the new speaker.
   *  - Markers FULLY within [splitTime, original seg.end] get the new speaker.
   *    Markers straddling the split boundary are left unchanged.
   *  - newSpeakerId is registered idempotently in the speakers list.
   */
  splitSegmentAt: (index: number, splitTime: number, newSpeakerId: SpeakerId) => void;
};

const DEFAULT_SOURCE: SessionSource = { kind: "mic" };

// Single source of truth for non-action state. Spread into startSession + reset
// so they can't drift apart silently. TypeScript enforces completeness via `State`.
const initialState: Omit<State,
  | "startSession" | "endSession" | "setInterim" | "appendFinal"
  | "addClaim" | "updateClaim" | "addMarker"
  | "ensureSpeaker" | "renameSpeaker" | "setSource" | "setSpeakersMode"
  | "toggleMode" | "setRecording" | "setSynthesis" | "setMicStream"
  | "setPrerecordStage" | "restoreSession" | "toSession" | "reset"
  | "reassignUtterance" | "addNewSpeaker" | "splitSegmentAt"
> = {
  title: "",
  startedAt: null,
  endedAt: null,
  transcript: [],
  interim: "",
  claims: [],
  markers: [],
  speakers: [],
  source: DEFAULT_SOURCE,
  speakersMode: false,
  isRecording: false,
  mode: "A",
  synthesis: null,
  micStream: null,
  prerecordStage: "picker",
};

export const useSession = create<State>((set, get) => ({
  ...initialState,

  startSession: (title) => set((s) => ({
    ...initialState,
    // Preserve the source the picker chose — startSession should not wipe it
    // back to mic. For non-mic ingest paths (text/audio/youtube/media), the
    // pane sets source via setSource() before startSession() runs.
    source: s.source,
    // We've moved past the picker — the session is now "selected" stage.
    prerecordStage: "selected",
    title: title ?? new Date().toISOString(),
    startedAt: new Date().toISOString(),
    // Only the mic path is actually "recording". Non-mic sources are bulk-
    // loaded and the pill should show "Paused" (or a future "Loaded" state)
    // rather than implying we're capturing.
    isRecording: s.source.kind === "mic",
  })),

  endSession: () => set({
    endedAt: new Date().toISOString(),
    isRecording: false,
  }),

  setInterim: (text) => set({ interim: text }),

  appendFinal: (segment) => set((s) => {
    // Idempotent speaker registration when segment carries a non-null speaker_id
    let speakers = s.speakers;
    if (
      segment.speaker_id !== null &&
      !speakers.some((sp) => sp.id === segment.speaker_id)
    ) {
      speakers = [
        ...speakers,
        { id: segment.speaker_id, label: `Speaker ${segment.speaker_id + 1}` },
      ];
    }
    return {
      transcript: [...s.transcript, segment],
      interim: "",
      speakers,
    };
  }),

  addClaim: (c) => set((s) => ({ claims: [...s.claims, c] })),

  updateClaim: (id, patch) => set((s) => ({
    claims: s.claims.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  })),

  addMarker: (m) => set((s) => ({ markers: [...s.markers, m] })),

  ensureSpeaker: (id) => set((s) => {
    if (s.speakers.some((sp) => sp.id === id)) return s;
    return {
      speakers: [...s.speakers, { id, label: `Speaker ${id + 1}` }],
    };
  }),

  renameSpeaker: (id, label) => set((s) => {
    const trimmed = label.trim();
    const finalLabel = trimmed.length > 0 ? trimmed.slice(0, 24) : `Speaker ${id + 1}`;
    return {
      speakers: s.speakers.map((sp) =>
        sp.id === id ? { ...sp, label: finalLabel } : sp,
      ),
    };
  }),

  setSource: (source) => set({ source }),

  setPrerecordStage: (stage) => set({ prerecordStage: stage }),

  setSpeakersMode: (b) => set({ speakersMode: b }),

  toggleMode: () => set((s) => ({ mode: s.mode === "A" ? "D" : "A" })),

  setRecording: (b) => set({ isRecording: b }),

  setSynthesis: (s) => set({ synthesis: s }),

  setMicStream: (stream) => set({ micStream: stream }),

  restoreSession: (session: Session) => set({
    title: session.title,
    startedAt: session.started_at,
    endedAt: session.ended_at ?? null,
    transcript: session.transcript,
    claims: session.claims,
    markers: session.markers,
    speakers: session.speakers,
    source: session.source,
    prerecordStage: "selected",
    isRecording: false,
    interim: "",
    // If the session carries a persisted synthesis, restore it as "fresh".
    // "refreshing" is downgraded to "fresh" since no refresh job is running.
    synthesis: session.synthesis
      ? { state: "fresh" as const, ...session.synthesis }
      : null,
    micStream: null,
  }),

  toSession: () => {
    const s = get();
    // Persist synthesis only when there is valid text (fresh or refreshing).
    // Discard "warming" (no text yet) and "error" (no actionable text to show).
    let persistedSynthesis: PersistedSynthesis | undefined;
    if (
      s.synthesis?.state === "fresh" ||
      s.synthesis?.state === "refreshing"
    ) {
      const { text, headlines, per_speaker_verdicts, at } = s.synthesis;
      persistedSynthesis = { text, headlines, per_speaker_verdicts, at };
    }
    return {
      title: s.title,
      started_at: s.startedAt ?? "",
      ended_at: s.endedAt ?? undefined,
      transcript: s.transcript,
      claims: s.claims,
      markers: s.markers,
      speakers: s.speakers,
      source: s.source,
      ...(persistedSynthesis !== undefined && { synthesis: persistedSynthesis }),
    };
  },

  reset: () => set({ ...initialState }),

  reassignUtterance: (transcriptIndex, newSpeakerId) => set((s) => {
    if (transcriptIndex < 0 || transcriptIndex >= s.transcript.length) return s;
    const target = s.transcript[transcriptIndex];
    if (target.speaker_id === newSpeakerId) return s;

    // Update the transcript segment
    const newTranscript = s.transcript.slice();
    newTranscript[transcriptIndex] = { ...target, speaker_id: newSpeakerId };

    // Cascade to claims whose utterance_start matches this segment's start
    const newClaims = s.claims.map((c) =>
      c.utterance_start === target.start ? { ...c, speaker_id: newSpeakerId } : c,
    );

    // Cascade to markers whose time range falls within this segment's range (1 s tolerance)
    const newMarkers = s.markers.map((m) =>
      m.start_time >= target.start && m.end_time <= target.end + 1.0
        ? { ...m, speaker_id: newSpeakerId }
        : m,
    );

    // Ensure the new speaker is registered (idempotent)
    const speakers = s.speakers.some((sp) => sp.id === newSpeakerId)
      ? s.speakers
      : [...s.speakers, { id: newSpeakerId, label: `Speaker ${newSpeakerId + 1}` }];

    return { transcript: newTranscript, claims: newClaims, markers: newMarkers, speakers };
  }),

  addNewSpeaker: () => {
    const s = useSession.getState();
    const maxId = s.speakers.reduce((m, sp) => Math.max(m, sp.id), -1);
    const newId: SpeakerId = maxId + 1;
    useSession.getState().ensureSpeaker(newId);
    return newId;
  },

  splitSegmentAt: (index, splitTime, newSpeakerId) => set((s) => {
    // Bounds check: index must be within transcript
    if (index < 0 || index >= s.transcript.length) return s;

    const seg = s.transcript[index];

    // splitTime must be strictly inside the segment's time range
    if (splitTime <= seg.start || splitTime >= seg.end) return s;

    // ── Text split at nearest word boundary ────────────────────────────────
    const words = seg.text.split(/(\s+)/); // preserves whitespace tokens
    // Build word-only tokens with their cumulative char offsets
    // We'll work with the flat split to find the best word boundary near the
    // approximate character offset.
    const fraction = (splitTime - seg.start) / (seg.end - seg.start);
    const approxCharOffset = Math.round(fraction * seg.text.length);

    // Collect word+whitespace pairs (non-empty)
    const tokens = words.filter((t) => t.length > 0);
    // Find which token index the approxCharOffset falls near
    let cumulative = 0;
    let bestBoundary = seg.text.length; // default: no split (treat as no clean boundary)
    let bestDistance = Infinity;

    // We look for whitespace-only tokens as word boundaries (between words)
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      const afterToken = cumulative + tok.length;
      // If this is a whitespace token, it's a valid word boundary
      if (/^\s+$/.test(tok)) {
        const boundaryOffset = cumulative; // boundary is at the START of whitespace
        const dist = Math.abs(boundaryOffset - approxCharOffset);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestBoundary = boundaryOffset;
        }
      }
      cumulative = afterToken;
    }

    // If no whitespace boundary was found (single word), bestBoundary stays at
    // seg.text.length — we can't split. Return state unchanged.
    if (bestBoundary === 0 || bestBoundary >= seg.text.length) return s;

    const leftText = seg.text.slice(0, bestBoundary).trimEnd();
    const rightText = seg.text.slice(bestBoundary).trimStart();

    // Both halves must be non-empty
    if (leftText.length === 0 || rightText.length === 0) return s;

    // ── Build the two new segments ─────────────────────────────────────────
    const leftSeg: TranscriptSegment = {
      ...seg,
      end: splitTime,
      text: leftText,
    };
    const rightSeg: TranscriptSegment = {
      text: rightText,
      start: splitTime,
      end: seg.end,
      is_final: true,
      speaker_id: newSpeakerId,
    };

    // Insert: replace index with leftSeg, then insert rightSeg after
    const newTranscript = [
      ...s.transcript.slice(0, index),
      leftSeg,
      rightSeg,
      ...s.transcript.slice(index + 1),
    ];

    // ── Cascade claims ─────────────────────────────────────────────────────
    // Claims with utterance_start in [splitTime, seg.end] → newSpeakerId
    const origEnd = seg.end;
    const newClaims = s.claims.map((c) =>
      c.utterance_start >= splitTime && c.utterance_start <= origEnd
        ? { ...c, speaker_id: newSpeakerId }
        : c,
    );

    // ── Cascade markers ────────────────────────────────────────────────────
    // FULLY within [splitTime, seg.end] → newSpeakerId
    // Straddling (start_time < splitTime < end_time) → unchanged
    const newMarkers = s.markers.map((m) =>
      m.start_time >= splitTime && m.end_time <= origEnd
        ? { ...m, speaker_id: newSpeakerId }
        : m,
    );

    // ── Register new speaker idempotently ──────────────────────────────────
    const speakers = s.speakers.some((sp) => sp.id === newSpeakerId)
      ? s.speakers
      : [...s.speakers, { id: newSpeakerId, label: `Speaker ${newSpeakerId + 1}` }];

    return { transcript: newTranscript, claims: newClaims, markers: newMarkers, speakers };
  }),
}));

// Dev-only handle on the store (unchanged from prior version)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  const w = window as unknown as {
    __yenta?: Record<string, unknown>;
    __factify?: Record<string, unknown>;
  };
  w.__yenta = { ...(w.__yenta ?? {}), session: useSession };
  // Legacy alias preserved so existing scripts using window.__factify keep working.
  w.__factify = w.__yenta;
}
