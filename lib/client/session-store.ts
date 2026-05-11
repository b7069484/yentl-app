import { create } from "zustand";
import type {
  ClaimCard,
  RhetoricMarker,
  Session,
  TranscriptSegment,
} from "@/lib/types";

type State = {
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  transcript: TranscriptSegment[];
  interim: string;
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  isRecording: boolean;
  mode: "A" | "D";

  // actions
  startSession: (title?: string) => void;
  endSession: () => void;
  setInterim: (text: string) => void;
  appendFinal: (segment: TranscriptSegment) => void;
  addClaim: (c: ClaimCard) => void;
  updateClaim: (id: string, patch: Partial<ClaimCard>) => void;
  addMarker: (m: RhetoricMarker) => void;
  toggleMode: () => void;
  setRecording: (b: boolean) => void;
  toSession: () => Session;
  reset: () => void;
};

export const useSession = create<State>((set, get) => ({
  title: "",
  startedAt: null,
  endedAt: null,
  transcript: [],
  interim: "",
  claims: [],
  markers: [],
  isRecording: false,
  mode: "A",

  startSession: (title) => set({
    title: title ?? new Date().toISOString(),
    startedAt: new Date().toISOString(),
    endedAt: null,
    transcript: [],
    interim: "",
    claims: [],
    markers: [],
    isRecording: true,
  }),

  endSession: () => set({
    endedAt: new Date().toISOString(),
    isRecording: false,
  }),

  setInterim: (text) => set({ interim: text }),

  appendFinal: (segment) => set((s) => ({
    transcript: [...s.transcript, segment],
    interim: "",
  })),

  addClaim: (c) => set((s) => ({ claims: [...s.claims, c] })),

  updateClaim: (id, patch) => set((s) => ({
    claims: s.claims.map((c) => (c.id === id ? { ...c, ...patch } : c)),
  })),

  addMarker: (m) => set((s) => ({ markers: [...s.markers, m] })),

  toggleMode: () => set((s) => ({ mode: s.mode === "A" ? "D" : "A" })),

  setRecording: (b) => set({ isRecording: b }),

  toSession: () => {
    const s = get();
    return {
      title: s.title,
      started_at: s.startedAt ?? "",
      ended_at: s.endedAt ?? undefined,
      transcript: s.transcript,
      claims: s.claims,
      markers: s.markers,
    };
  },

  reset: () => set({
    title: "",
    startedAt: null,
    endedAt: null,
    transcript: [],
    interim: "",
    claims: [],
    markers: [],
    isRecording: false,
    mode: "A",
  }),
}));

// Dev-only handle on the store so end-to-end tests and the browser console
// can inspect / drive session state without React DevTools. Dead-code
// eliminated in production builds via NODE_ENV.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __factify?: unknown }).__factify = { session: useSession };
}
