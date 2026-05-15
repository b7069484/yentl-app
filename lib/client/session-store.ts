import { create } from "zustand";
import type {
  ClaimCard,
  RhetoricMarker,
  Session,
  SessionSource,
  Speaker,
  SpeakerId,
  TranscriptSegment,
} from "@/lib/types";

export type SynthesisState =
  | null
  | { state: "warming"; at: number }
  | { state: "fresh"; text: string; headlines: string[]; at: number }
  | { state: "refreshing"; text: string; headlines: string[]; at: number }
  | { state: "error"; text?: string; headlines?: string[]; at: number; lastError?: string };

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
  toSession: () => Session;
  reset: () => void;
};

const DEFAULT_SOURCE: SessionSource = { kind: "mic" };

// Single source of truth for non-action state. Spread into startSession + reset
// so they can't drift apart silently. TypeScript enforces completeness via `State`.
const initialState: Omit<State,
  | "startSession" | "endSession" | "setInterim" | "appendFinal"
  | "addClaim" | "updateClaim" | "addMarker"
  | "ensureSpeaker" | "renameSpeaker" | "setSource" | "setSpeakersMode"
  | "toggleMode" | "setRecording" | "setSynthesis" | "setMicStream"
  | "setPrerecordStage" | "toSession" | "reset"
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

  startSession: (title) => set({
    ...initialState,
    title: title ?? new Date().toISOString(),
    startedAt: new Date().toISOString(),
    isRecording: true,
  }),

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

  toSession: () => {
    const s = get();
    return {
      title: s.title,
      started_at: s.startedAt ?? "",
      ended_at: s.endedAt ?? undefined,
      transcript: s.transcript,
      claims: s.claims,
      markers: s.markers,
      speakers: s.speakers,
      source: s.source,
    };
  },

  reset: () => set({ ...initialState }),
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
