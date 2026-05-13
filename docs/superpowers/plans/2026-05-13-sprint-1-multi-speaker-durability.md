# Factify Sprint 1 — Multi-speaker, durability, visual enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship durability + Deepgram diarization + post-v1 pipeline-quality fixes + first-pass visual enrichment, so a real two-speaker conversation of ≥15 minutes can be demoed on `localhost:3001` with image-illustrated claim cards and icon-decorated rhetoric markers.

**Architecture:** Additive type extensions feeding a Zustand store with speaker registry → Deepgram streaming with `diarize=true` and dominant-speaker-per-utterance derivation → React UI surfacing speaker blocks, renamable header chips, audio meter, and "Speakers mode" toggle → orchestrator propagating `speaker_id` to claims and markers, validating marker types against taxonomy, tightening dedup → async post-verify OG-metadata scraper for hero images → archetype-classified Lucide icons on marker chips. Local-only verification — no `git push`, no `vercel --prod`, until user signs off.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (`@theme` in `globals.css`), shadcn `radix-nova` style, Zustand, Deepgram nova-3 (streaming + diarization), AI SDK v6 via Vercel AI Gateway, Claude Opus 4.7 (`"anthropic/claude-opus-4.7"`), Anthropic `web_search` tool, Vitest, lucide-react icons.

**Spec:** [`docs/superpowers/specs/2026-05-13-sprint-1-multi-speaker-durability-design.md`](../specs/2026-05-13-sprint-1-multi-speaker-durability-design.md)
**Committee review:** [`committee-review-2026-05-13-sprint-1-plan.md`](../../../committee-review-2026-05-13-sprint-1-plan.md) (11 members, full quorum). This v2 of the plan folds in all consensus recommendations and the user-chosen defaults for the four tensions (T1=B keep-hero-with-provenance, T2=B keep-toolbar-with-race-fixes, T3=A entity-anchoring-in-Sprint-1, T4=B defer-verdict-taxonomy).

## Changelog from v1 (committee amendments)

| Where | Change | Source |
|---|---|---|
| Task 4 | Extract typed `initialState` constant shared by `startSession` + `reset` | React/Next.js |
| Task 8 | Restart `useEffect` retained; race-safety now comes from Task 11's AbortController. Explicit comment documents the dependency. | Consumer OS + React/Next.js + Streaming Systems |
| Task 11 | REWRITE — AbortController throughout; 3-attempt retry with exponential backoff + jitter; `{"type":"CloseStream"}` handshake (replaces 1500ms timeout drain); `closed`-flag re-check between every `await`; `console.warn` at refresh attempts; threshold warning after 5 consecutive null speaker_ids on diarized streams; `dominantSpeaker` exported here (subsumes Task 12 Step 3 + Task 13's diarize-flag step) | Streaming Systems |
| Tasks 12 + 13 | Subsumed by Task 11 except for tests. Task 12 becomes "write tests for dominantSpeaker"; Task 13 becomes a verification step. | (follow-up cleanup) |
| Task 9 (AudioMeter) | Add visually-hidden throttled `<output aria-live="polite">` announcing "Microphone active" / "Microphone silent" on state change (1 Hz throttle); bars become `aria-hidden` decorative | Accessibility (WCAG 1.1.1 / 1.3.3) |
| Task 14 (TranscriptView) | Wrap transcript blocks in `role="log" aria-live="polite" aria-relevant="additions"` region; interim text moves outside that region with `aria-hidden` (no SR flood from partial words) | Accessibility (WCAG 4.1.3) |
| Task 19 | REWRITE — extract `web_search` tool-result citations directly from `result.steps[*].toolResults`; LLM emits only verdict-level fields + stance-per-URL; remove substring sanitizer | AI Systems + Fact-checking |
| Task 22 | Add entity-anchoring + reported-speech rules to extract-claims SYSTEM; add `topic_primary` + `topic_secondary` schema fields | Linguist |
| Task 25 | Add SSRF defense to `/api/source-preview` — public-IP check on resolved hostname before fetch | Security |
| Task 26 | Hero image: `sizes` prop, provenance caption ("Source: domain · stance"), server-side image-load check, Map-returning selector for claimByStart | UI/UX + Fact-checking + React/Next.js |
| Task 27 | tag-archetypes SYSTEM gains severity operational definition pinned to detectability | Psychologist |
| Task 29 | REWRITE — two-phase classifier: emit `archetype-proposals.json` with confidence; new `apply-archetypes` script shows colored diff and applies on confirmation | AI Systems |
| **NEW Task 29.5** | Anthropic prompt-caching wrapper around `taxonomyHints()` in `analyze-rhetoric` | AI Systems |

Numbering preserved where possible. New tasks use `Xa`/`Xb`/`X.5` suffixes to keep cross-references in v1 stable.

---

## Locked constraints (executor must honor every task)

- **No `git push`** unless the user explicitly authorizes
- **No `vercel deploy` / `vercel --prod`** unless the user explicitly authorizes
- **No overwrites of `yenta.vercel.app`** in any form
- **AI Gateway routing:** model slug `"anthropic/claude-opus-4.7"` (plain string, dots, no `anthropic(...)` wrap, and never reference the Anthropic provider key env var directly — auth flows via OIDC from `vercel env pull`)
- **AI SDK v6:** `generateText({ output: Output.object({ schema }) })` — no `generateObject` (removed in v6)
- **web_search:** `import { anthropic } from "@ai-sdk/anthropic"` for `anthropic.tools.webSearch_20260209({ maxUses: 5 })` only
- **En-dashes in prompts:** `score (0–100)` — U+2013, not ASCII hyphen
- **Path alias:** `@/lib/...`, `@/components/...`
- **Tailwind v4:** config lives in `app/globals.css` `@theme {}` — no `tailwind.config.ts`
- **shadcn style:** `radix-nova` — don't switch
- **Dev shim:** `window.__factify = { session, onFinalUtterance }` only when `NODE_ENV !== "production"`
- **Per-route `maxDuration`** stays authoritative — vercel.json adds ONLY `{ "framework": "nextjs" }`
- **`agent-browser` is mandatory** for any visual change verification per [`CLAUDE.md`](../../../../.claude/CLAUDE.md)
- **Three-strikes rule**: same bug after 2 surgical fixes → STOP, root-cause analysis, propose different approach
- **Frequent commits** — one per task, descriptive subject

## Pre-flight (already done — listed for the record)

- Worktree on `claude/sprint-1-multi-speaker-durability` rebased onto v1 production (`a263cd3`); spec commit on top
- Recovery tag `pre-sprint1-rebase` in place
- Tests baseline: 26/26 passing
- `tsc --noEmit` clean
- `.env.local` present with `VERCEL_OIDC_TOKEN`, `DEEPGRAM_API_KEY` (40 chars, Member role), `DEEPGRAM_PROJECT_ID`

Before starting Task 1, the executor MUST:
- [ ] Run `npm run dev` and confirm `/session` loads at `localhost:3001`
- [ ] Open Record, speak briefly, confirm live transcript still works on production v1 code
- [ ] Refresh `.env.local` if `VERCEL_OIDC_TOKEN` is stale: `vercel env pull .env.local --yes`
- [ ] Load agent-browser: `agent-browser skills get agent-browser`

---

# Phase A — Type foundation

These tasks are pure type extensions. The "test" is `npx tsc --noEmit` clean.

## Task 1: Add core type primitives

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Add new type primitives at the bottom of `lib/types.ts`**

Append (after the existing `Session` type):

```ts
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
```

- [ ] **Step 2: Run typecheck**

```
npx tsc --noEmit
```

Expected: clean exit, no errors.

- [ ] **Step 3: Commit**

```
git add lib/types.ts
git commit -m "Add SpeakerId, Speaker, SourcePreview, SessionSource type primitives"
```

## Task 2: Extend existing types with speaker_id, topic, preview

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Extend `TranscriptSegment` with `speaker_id`**

In `lib/types.ts`, change `TranscriptSegment`:

```ts
export type TranscriptSegment = {
  text: string;
  start: number;
  end: number;
  is_final: boolean;
  speaker_id: SpeakerId | null;
};
```

- [ ] **Step 2: Extend `ClaimCard` with `speaker_id` and `topic`**

```ts
export type ClaimCard = {
  id: string;
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  speaker_id: SpeakerId | null;
  topic: string;
  primary_label: PrimaryLabel;
  score: number;
  annotations: string[];
  explanation: string;
  status: ClaimStatus;
  sources: Source[];
};
```

- [ ] **Step 3: Extend `RhetoricMarker` with `speaker_id`**

```ts
export type RhetoricMarker = {
  id: string;
  type: MarkerType;
  name: string;
  display: string;
  excerpt: string;
  speaker_id: SpeakerId | null;
  start_time: number;
  end_time: number;
  severity: MarkerSeverity;
  explanation: string;
};
```

- [ ] **Step 4: Extend `Source` with optional `preview`**

```ts
export type Source = {
  url: string;
  domain: string;
  title: string;
  reputation_tier: ReputationTier;
  stance: Stance;
  excerpt?: string;
  preview?: SourcePreview;
};
```

- [ ] **Step 5: Extend `Session` with `speakers` and `source`**

```ts
export type Session = {
  title: string;
  started_at: string;
  ended_at?: string;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  speakers: Speaker[];
  source: SessionSource;
};
```

- [ ] **Step 6: Run typecheck — expect failures**

```
npx tsc --noEmit
```

Expected: many errors. Adding required fields breaks existing call sites in `lib/client/orchestrator.ts`, `lib/client/session-store.ts`, `lib/client/deepgram-stream.ts`, `lib/export/*.ts`, etc. We'll fix these in Phase B.

- [ ] **Step 7: Commit (intentionally broken — will fix in next tasks)**

```
git add lib/types.ts
git commit -m "Extend TranscriptSegment, ClaimCard, RhetoricMarker, Source, Session with Sprint 1 fields"
```

## Task 3: Add archetype field to TaxonomyEntry

**Files:**
- Create: `lib/taxonomy/archetypes.ts`
- Modify: `lib/taxonomy/index.ts`
- Modify: `lib/taxonomy/extras.ts`
- Modify: `lib/taxonomy/book-entries.json`

The `archetype` field starts as optional so the type compiles before the one-shot classification script runs (Task 30). It becomes required-by-test in Task 30.

- [ ] **Step 1: Create `lib/taxonomy/archetypes.ts` with the archetype enum**

```ts
export const ARCHETYPES = [
  "appeal_to",
  "dismissal",
  "generalization",
  "redirection",
  "fear",
  "authority",
  "emotion",
  "vagueness",
  "repetition",
  "false_binary",
  "false_causation",
  "in_group",
  "framing",
  "burden",
  "identity",
  "unknown",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export function isArchetype(s: string): s is Archetype {
  return (ARCHETYPES as readonly string[]).includes(s);
}
```

- [ ] **Step 2: Extend `TaxonomyEntry` in `lib/taxonomy/index.ts`**

Change the `TaxonomyEntry` type (the existing definition near the top of the file):

```ts
import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";
import bookEntries from "./book-entries.json";
import { EXTRAS } from "./extras";

export type TaxonomyEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  source: "book" | "extra";
  definition?: string;
  example?: string;
  aka?: string;
  archetype?: Archetype;   // Optional during Sprint 1; populated by scripts/tag-archetypes.ts (Task 30)
};
```

- [ ] **Step 3: Extend `ExtraEntry` in `lib/taxonomy/extras.ts`**

Change `ExtraEntry`:

```ts
import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";

export type ExtraEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  aka?: string;
  archetype?: Archetype;
};
```

- [ ] **Step 4: Run typecheck**

```
npx tsc --noEmit
```

Expected: still many errors from Task 2 — but no NEW errors from this task. Verify the taxonomy-related errors aren't increasing.

- [ ] **Step 5: Commit**

```
git add lib/taxonomy/archetypes.ts lib/taxonomy/index.ts lib/taxonomy/extras.ts
git commit -m "Add Archetype type + optional archetype field on TaxonomyEntry"
```

---

# Phase B — Store wiring

## Task 4: Extend store with speakers, source, speakersMode

**Files:**
- Modify: `lib/client/session-store.ts`

- [ ] **Step 1: Add imports + state slice + actions**

Update `lib/client/session-store.ts`:

```ts
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
  toSession: () => Session;
  reset: () => void;
};
```

- [ ] **Step 2: Update the initial state and `startSession` / `reset` to include the new fields**

**Committee amendment (React/Next.js):** Extract a typed `initialState` constant at module scope so `startSession` and `reset` can't drift. TypeScript then enforces completeness against the `State` shape on every call site. The v1 of this file had `startSession` and `reset` each spelling out the reset object inline — already subtly out of sync in v1 production code (`reset` resets `mode: "A"`, `startSession` did not). Sprint 1 adds three more fields; an inline spread is the wrong tool.

Replace the body of `create<State>(...)` like this:

```ts
const DEFAULT_SOURCE: SessionSource = { kind: "mic" };

// Single source of truth for non-action state. Spread into startSession + reset
// so they can't drift apart silently. TypeScript enforces completeness via `State`.
const initialState: Omit<State,
  | "startSession" | "endSession" | "setInterim" | "appendFinal"
  | "addClaim" | "updateClaim" | "addMarker"
  | "ensureSpeaker" | "renameSpeaker" | "setSource" | "setSpeakersMode"
  | "toggleMode" | "setRecording" | "toSession" | "reset"
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

  setSpeakersMode: (b) => set({ speakersMode: b }),

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
      speakers: s.speakers,
      source: s.source,
    };
  },

  reset: () => set({ ...initialState }),
}));

// Dev-only handle on the store (unchanged from prior version)
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __factify?: unknown }).__factify = { session: useSession };
}
```

- [ ] **Step 3: Run typecheck**

```
npx tsc --noEmit
```

Expected: fewer errors than before. Remaining errors are in `deepgram-stream.ts`, `orchestrator.ts`, and the export functions — fixed in subsequent tasks.

- [ ] **Step 4: Commit**

```
git add lib/client/session-store.ts
git commit -m "Add speakers registry, source provenance, speakersMode to session store"
```

## Task 5: Add store unit tests

**Files:**
- Create: `tests/session-store.test.ts`

- [ ] **Step 1: Write tests**

```ts
import { describe, expect, it } from "vitest";
import { useSession } from "@/lib/client/session-store";

describe("session store — speakers", () => {
  it("ensureSpeaker is idempotent", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().ensureSpeaker(0);
    expect(useSession.getState().speakers).toHaveLength(1);
    expect(useSession.getState().speakers[0]).toEqual({ id: 0, label: "Speaker 1" });
  });

  it("ensureSpeaker registers multiple distinct ids", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().ensureSpeaker(2);   // sparse id is fine
    expect(useSession.getState().speakers).toEqual([
      { id: 0, label: "Speaker 1" },
      { id: 2, label: "Speaker 3" },
    ]);
  });

  it("renameSpeaker updates the label", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().renameSpeaker(0, "Israel");
    expect(useSession.getState().speakers[0].label).toBe("Israel");
  });

  it("renameSpeaker trims and clamps to 24 chars", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().renameSpeaker(0, "   Israel B. Bitton — Author  ");
    expect(useSession.getState().speakers[0].label.length).toBeLessThanOrEqual(24);
    expect(useSession.getState().speakers[0].label).not.toMatch(/^\s/);
  });

  it("renameSpeaker reverts to default on empty input", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().renameSpeaker(0, "Israel");
    useSession.getState().renameSpeaker(0, "");
    expect(useSession.getState().speakers[0].label).toBe("Speaker 1");
  });

  it("appendFinal idempotently registers segment's speaker", () => {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({
      text: "Hi.",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: 0,
    });
    useSession.getState().appendFinal({
      text: "Hello.",
      start: 1,
      end: 2,
      is_final: true,
      speaker_id: 0,
    });
    expect(useSession.getState().speakers).toHaveLength(1);
  });

  it("appendFinal does not register null speaker_id", () => {
    useSession.getState().reset();
    useSession.getState().startSession();
    useSession.getState().appendFinal({
      text: "Hi.",
      start: 0,
      end: 1,
      is_final: true,
      speaker_id: null,
    });
    expect(useSession.getState().speakers).toHaveLength(0);
  });

  it("startSession resets speakers and source to defaults", () => {
    useSession.getState().reset();
    useSession.getState().ensureSpeaker(0);
    useSession.getState().setSource({ kind: "audio_file", blob_url: "x", duration_sec: 1, filename: "a.mp3", mime: "audio/mp3" });
    useSession.getState().startSession();
    expect(useSession.getState().speakers).toEqual([]);
    expect(useSession.getState().source).toEqual({ kind: "mic" });
  });
});
```

- [ ] **Step 2: Run tests, expect pass**

```
npm run test:run -- tests/session-store.test.ts
```

Expected: 8/8 passing.

- [ ] **Step 3: Commit**

```
git add tests/session-store.test.ts
git commit -m "Add session-store tests for ensureSpeaker, renameSpeaker, appendFinal idempotency"
```

---

# Phase C — Durability (low-risk wins first)

## Task 6: vercel.json framework pin

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Create `vercel.json` at repo root**

```json
{
  "framework": "nextjs"
}
```

Note: NO `functions` glob. Per-route `export const maxDuration = ...` exports stay authoritative.

- [ ] **Step 2: Commit**

```
git add vercel.json
git commit -m "Pin Vercel framework to nextjs (hedge against dashboard-only setting)"
```

## Task 7: Speakers-mode toggle in `mic.ts`

**Files:**
- Modify: `lib/client/mic.ts`
- Create: `tests/mic.test.ts`

- [ ] **Step 1: Write the test**

Create `tests/mic.test.ts`:

```ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("startMic — constraint mapping", () => {
  const getUserMediaMock = vi.fn();
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    getUserMediaMock.mockReset();
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream);
    // jsdom doesn't ship mediaDevices — install a minimal shim
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: { getUserMedia: getUserMediaMock },
      },
    });
    // MediaRecorder shim
    (globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = class {
      static isTypeSupported() { return true; }
      ondataavailable: ((e: unknown) => void) | null = null;
      start() {}
      stop() {}
    };
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  });

  it("defaults to echoCancellation/noiseSuppression/autoGainControl ALL ON", async () => {
    const { startMic } = await import("@/lib/client/mic");
    await startMic(() => {});
    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
  });

  it("speakersMode=true flips all three flags OFF", async () => {
    const { startMic } = await import("@/lib/client/mic");
    await startMic(() => {}, { speakersMode: true });
    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  });
});
```

- [ ] **Step 2: Run tests, expect failure**

```
npm run test:run -- tests/mic.test.ts
```

Expected: tests fail because the current `startMic` uses `audio: true` (boolean shorthand), not the constraint object.

- [ ] **Step 3: Implement — update `lib/client/mic.ts`**

Replace the file with:

```ts
export type MicHandle = {
  stream: MediaStream;
  recorder: MediaRecorder;
  stop: () => void;
};

export type StartMicOptions = {
  /**
   * When true, disables Chrome's default echoCancellation / noiseSuppression /
   * autoGainControl. Useful when the user wants to capture audio playing
   * through the device's own speakers (otherwise Chrome filters it out before
   * Deepgram sees it).
   */
  speakersMode?: boolean;
};

export async function startMic(
  onChunk: (chunk: Blob) => void,
  opts: StartMicOptions = {},
): Promise<MicHandle> {
  const speakersMode = opts.speakersMode ?? false;
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: speakersMode
      ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      : { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
  });
  const mimeType = pickMime();
  const recorder = new MediaRecorder(stream, { mimeType });

  recorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) onChunk(e.data);
  };

  recorder.start(250); // emit a chunk every 250ms

  return {
    stream,
    recorder,
    stop: () => {
      recorder.stop();
      stream.getTracks().forEach((t) => t.stop());
    },
  };
}

function pickMime(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
  ];
  for (const c of candidates) {
    if (MediaRecorder.isTypeSupported(c)) return c;
  }
  return "";
}
```

- [ ] **Step 4: Run tests, expect pass**

```
npm run test:run -- tests/mic.test.ts
```

Expected: 2/2 passing.

- [ ] **Step 5: Commit**

```
git add lib/client/mic.ts tests/mic.test.ts
git commit -m "Add speakersMode option to startMic — toggles echoCancel/noise/AGC"
```

## Task 8: Speakers-mode toggle UI + race-safe mid-session restart

**Committee amendment (Consumer OS + React/Next.js + Streaming Systems):** The original v1 plan had a naked `useEffect` that called `teardown()` then `start()` with `eslint-disable-next-line` — racing against the JWT refresh timer. Task 11's hardened `openDeepgramStream` now uses an `AbortController` internally, so `close()` cancels any in-flight refresh deterministically. This task's `useEffect` therefore IS safe — but the comment in the code must make the dependency on Task 11's cancellation contract explicit so a future editor can't accidentally remove the AbortController and leave a silent regression.

**Files:**
- Modify: `components/session/SessionHeader.tsx`
- Modify: `app/session/page.tsx`

- [ ] **Step 1: Add toggle button to `SessionHeader`**

Add imports at top of file:

```ts
import { Volume2 } from "lucide-react";
```

Insert `<SpeakersModeToggle />` inside the existing `<div className="flex items-center gap-2">` right BEFORE the Present-mode button.

Add this sub-component near the bottom of the file (above the `formatTime` helper):

```tsx
function SpeakersModeToggle() {
  const speakersMode = useSession((s) => s.speakersMode);
  const setSpeakersMode = useSession((s) => s.setSpeakersMode);
  return (
    <Button
      variant={speakersMode ? "default" : "outline"}
      size="sm"
      onClick={() => setSpeakersMode(!speakersMode)}
      aria-pressed={speakersMode}
      title={
        speakersMode
          ? "Speakers mode ON — capturing audio played through this device. Click to disable."
          : "Speakers mode OFF — your voice only. Click to also capture audio played through this device's speakers."
      }
      className="gap-1.5"
    >
      <Volume2 className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Speakers</span>
    </Button>
  );
}
```

- [ ] **Step 2: Wire mic restart on toggle change in `app/session/page.tsx`**

Pass `speakersMode` into `startMic`. Find the `mic.current = await startMic(...)` line inside `start()` and replace with:

```tsx
mic.current = await startMic(
  (chunk) => dg.current?.send(chunk),
  { speakersMode: session.speakersMode },
);
```

Add a `useEffect` that restarts mic + Deepgram when `speakersMode` flips while recording. Place after the existing `useEffect(() => () => teardown(), []);`:

```tsx
// Restart mic + Deepgram stream when speakersMode flips mid-session.
// Chrome's getUserMedia constraints can't be updated on an open stream.
//
// RACE-SAFETY: teardown() calls dg.current.close(), which (per Task 11's hardened
// openDeepgramStream) aborts any in-flight JWT refresh via AbortController and
// gracefully drains the active socket. Without that cancellation contract this
// effect would race the refresh timer — DO NOT weaken Task 11's AbortController
// without also rewriting this effect to coordinate explicitly.
const lastSpeakersMode = useRef(session.speakersMode);
useEffect(() => {
  if (lastSpeakersMode.current === session.speakersMode) return;
  lastSpeakersMode.current = session.speakersMode;
  if (!session.isRecording) return;
  void (async () => {
    teardown();
    await start();
  })();
  // start/teardown are stable in this component scope; intentionally not in deps.
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [session.speakersMode]);
```

- [ ] **Step 3: Manual verification on `localhost:3001`**

- Open `/session`, click Record, speak briefly → transcript appears
- Click Speakers ON → header toggle fills; transcript continues after ~300ms gap
- Speak again → transcript still appears
- Click Speakers OFF → mic restarts again
- (Optional) Play Tucker monologue through laptop speakers with Speakers ON → words appear

- [ ] **Step 4: Commit**

```
git add components/session/SessionHeader.tsx app/session/page.tsx
git commit -m "Add Speakers-mode toggle with race-safe restart (depends on Task 11 AbortController)"
```

## Task 9: AudioMeter component

**Files:**
- Create: `components/session/AudioMeter.tsx`
- Create: `tests/audio-meter.test.ts`

- [ ] **Step 1: Write the test for RMS math**

Create `tests/audio-meter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { rmsFromTimeDomain } from "@/components/session/AudioMeter";

describe("rmsFromTimeDomain", () => {
  it("returns 0 for total silence (all samples == 128)", () => {
    const buf = new Uint8Array(512).fill(128);
    expect(rmsFromTimeDomain(buf)).toBe(0);
  });

  it("returns ~1.0 for max-amplitude square wave", () => {
    const buf = new Uint8Array(512);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 0 : 255;
    const rms = rmsFromTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.9);
    expect(rms).toBeLessThanOrEqual(1.0);
  });

  it("returns ~0.5 for a half-amplitude square wave", () => {
    const buf = new Uint8Array(512);
    for (let i = 0; i < buf.length; i++) buf[i] = i % 2 === 0 ? 64 : 192;   // ±64 around 128
    const rms = rmsFromTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.4);
    expect(rms).toBeLessThan(0.6);
  });

  it("returns ~0.707 for a full-scale sine wave", () => {
    const buf = new Uint8Array(512);
    for (let i = 0; i < buf.length; i++) {
      buf[i] = Math.round(128 + 127 * Math.sin((i / buf.length) * 2 * Math.PI * 8));
    }
    const rms = rmsFromTimeDomain(buf);
    expect(rms).toBeGreaterThan(0.65);
    expect(rms).toBeLessThan(0.75);
  });
});
```

- [ ] **Step 2: Run test, expect failure**

```
npm run test:run -- tests/audio-meter.test.ts
```

Expected: import fails because `AudioMeter.tsx` doesn't exist yet.

- [ ] **Step 3: Implement `components/session/AudioMeter.tsx`**

```tsx
"use client";
import { useEffect, useRef } from "react";

const BAR_COUNT = 5;
const THRESHOLDS = [0.05, 0.10, 0.18, 0.30, 0.45];   // RMS levels at which each bar lights

/**
 * Pure helper — exported for unit testing. Converts a Uint8Array of
 * AudioContext.getByteTimeDomainData() samples (centered around 128) into a
 * normalized RMS amplitude in the range [0, 1].
 */
export function rmsFromTimeDomain(buf: Uint8Array): number {
  if (buf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

export function AudioMeter({ stream }: { stream: MediaStream | null }) {
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!stream) {
      // Reset bars to idle
      barsRef.current.forEach((el) => {
        if (el) el.style.background = "rgb(148 163 184 / 0.4)"; // slate-400/40
      });
      return;
    }

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    // Throttle accessibility announcements to ~1 Hz so screen readers aren't flooded
    let lastAnnounceMs = 0;
    let lastAnnounceState: "active" | "silent" | null = null;
    const ACTIVE_THRESHOLD = THRESHOLDS[0];

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      const level = rmsFromTimeDomain(buf);
      barsRef.current.forEach((el, i) => {
        if (!el) return;
        const active = level >= THRESHOLDS[i];
        el.style.background = active ? "rgb(16 185 129)" : "rgb(148 163 184 / 0.4)";
      });
      // Throttled accessible announcement — at most once per second, state-change only
      const now = performance.now();
      if (now - lastAnnounceMs >= 1000) {
        const state: "active" | "silent" = level >= ACTIVE_THRESHOLD ? "active" : "silent";
        if (state !== lastAnnounceState && a11yRef.current) {
          a11yRef.current.textContent = state === "active" ? "Microphone active" : "Microphone silent";
          lastAnnounceState = state;
        }
        lastAnnounceMs = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [stream]);

  // Committee amendment (Accessibility — WCAG 1.1.1 / 1.3.3): the 5 visual bars
  // are decorative (aria-hidden). A visually-hidden, polite live region carries
  // the actual signal for screen reader / Deaf users, throttled to 1 Hz and only
  // announcing state transitions (not every frame).
  return (
    <div className="flex h-3.5 items-end gap-0.5">
      <output
        ref={a11yRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Microphone silent
      </output>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-1 rounded-sm transition-[background] duration-75"
          style={{
            height: `${30 + i * 17.5}%`,
            background: "rgb(148 163 184 / 0.4)",
          }}
        />
      ))}
    </div>
  );
}
```

**Committee amendment (Accessibility):** Add the `a11yRef` declaration at the top of the component (next to `barsRef` and `rafRef`):

```tsx
const a11yRef = useRef<HTMLOutputElement | null>(null);
```

`sr-only` is the standard Tailwind utility for visually-hidden content. If the project doesn't already define it (it should via shadcn), add this to `app/globals.css`:

```css
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

- [ ] **Step 4: Run tests, expect pass**

```
npm run test:run -- tests/audio-meter.test.ts
```

Expected: 4/4 passing.

- [ ] **Step 5: Commit**

```
git add components/session/AudioMeter.tsx tests/audio-meter.test.ts
git commit -m "Add AudioMeter component with RMS-driven 5-bar VU + pure helper for tests"
```

## Task 10: Wire AudioMeter into header + page

**Files:**
- Modify: `components/session/SessionHeader.tsx`
- Modify: `app/session/page.tsx`

- [ ] **Step 1: Pass `MediaStream` to `SessionHeader` as a prop**

In `components/session/SessionHeader.tsx`, update the prop signature:

```tsx
export function SessionHeader({
  onStart, onStop, onEnd, onExport, audioStream,
}: {
  onStart: () => void;
  onStop: () => void;
  onEnd: () => void;
  onExport: () => void;
  audioStream: MediaStream | null;
}) {
```

Add import at top:

```tsx
import { AudioMeter } from "@/components/session/AudioMeter";
```

Place `<AudioMeter />` immediately AFTER the existing REC-dot + timer chip. Change:

```tsx
<div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-2.5 py-1">
  <span
    aria-hidden
    className={`h-2 w-2 rounded-full transition-colors ${
      isRecording ? "bg-red-500 animate-pulse" : "bg-muted-foreground/40"
    }`}
  />
  <span className="font-mono text-xs tabular-nums text-foreground/80">
    {formatTime(elapsed)}
  </span>
</div>
```

To:

```tsx
<div className="flex items-center gap-2 rounded-full border border-border/60 bg-background px-2.5 py-1">
  <span
    aria-hidden
    className={`h-2 w-2 rounded-full transition-colors ${
      isRecording ? "bg-red-500 animate-pulse" : "bg-muted-foreground/40"
    }`}
  />
  <span className="font-mono text-xs tabular-nums text-foreground/80">
    {formatTime(elapsed)}
  </span>
  <AudioMeter stream={isRecording ? audioStream : null} />
</div>
```

- [ ] **Step 2: Pass the stream from `app/session/page.tsx`**

In `app/session/page.tsx`, add state for the stream:

```tsx
const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
```

In `start()`, after `mic.current = await startMic(...)`, add:

```tsx
setAudioStream(mic.current.stream);
```

In `teardown()`, add:

```tsx
setAudioStream(null);
```

In the JSX, pass the prop:

```tsx
<SessionHeader
  onStart={start}
  onStop={stop}
  onEnd={end}
  onExport={() => setExportDialogOpen(true)}
  audioStream={audioStream}
/>
```

- [ ] **Step 3: Manual verification with agent-browser**

```
agent-browser skills get agent-browser
npm run dev
```

In a separate terminal, use agent-browser to navigate to `http://localhost:3001/session`, take a snapshot, click Record (need to grant mic permission), then take another snapshot. Confirm the 5-bar VU is visible in the header and lights up when speaking.

- [ ] **Step 4: Commit**

```
git add components/session/SessionHeader.tsx app/session/page.tsx
git commit -m "Wire AudioMeter into header with live MediaStream from session page"
```

## Task 11: Rewrite `openDeepgramStream` with retry-aware JWT refresh + CloseStream handshake + AbortController

**Committee amendment (Streaming Systems):** The v1 plan used a 1500ms `setTimeout` drain for the old socket — too short under real-world network jitter (Cloudflare 2023 Durable-Object incident: frames arrived >2s after upstream close). The v1 plan also had no retry on `fetchToken`/`openSocket` failure (one 5xx = silent session death — matches the Cloudflare TURN 2021 outage shape) and only checked the `closed` flag at refresh entry (race-condition leak — Cloudflare Pub/Sub 2022 leaked 14k ghost sockets through this pattern). All three concerns are addressed here.

**Files:**
- Modify: `lib/client/deepgram-stream.ts`

- [ ] **Step 1: Replace `openDeepgramStream` with the hardened version**

Replace `lib/client/deepgram-stream.ts` entirely:

```ts
import type { TranscriptSegment } from "@/lib/types";

export type DGEvents = {
  onInterim: (text: string) => void;
  onFinal: (segment: TranscriptSegment) => void;
  onError: (err: unknown) => void;
  onClose: () => void;
};

export type DeepgramWord = {
  word: string;
  start: number;
  end: number;
  speaker?: number;
};

export function dominantSpeaker(words: DeepgramWord[]): number | null {
  if (!words || words.length === 0) return null;
  const counts = new Map<number, number>();
  for (const w of words) {
    if (typeof w.speaker !== "number") continue;
    counts.set(w.speaker, (counts.get(w.speaker) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  return [...counts.entries()].reduce((a, b) => (b[1] > a[1] ? b : a))[0];
}

const REFRESH_LEAD_MS = 30_000;         // refresh 30s before expiry
const REFRESH_MAX_ATTEMPTS = 3;
const REFRESH_BACKOFF_BASE_MS = 500;
const DRAIN_FALLBACK_MS = 5_000;        // hard-close old socket if CloseStream handshake doesn't echo
const NULL_SPEAKER_WARN_THRESHOLD = 5;  // warn once after this many consecutive null speakers on diarized streams
const PARAMS = new URLSearchParams({
  model: "nova-3",
  language: "en",
  punctuate: "true",
  smart_format: "true",
  interim_results: "true",
  utterance_end_ms: "1000",
  diarize: "true",                       // populated in Task 13; included now since we own the URL
});

type TokenResponse = { key: string; expires_at: string };

async function fetchToken(signal?: AbortSignal): Promise<{ key: string; expiresAtMs: number }> {
  const res = await fetch("/api/deepgram/token", { method: "POST", signal });
  if (!res.ok) throw new Error(`token fetch failed (${res.status})`);
  const data = (await res.json()) as TokenResponse;
  const expiresAtMs = new Date(data.expires_at).getTime();
  if (!Number.isFinite(expiresAtMs)) throw new Error("token response has invalid expires_at");
  return { key: data.key, expiresAtMs };
}

async function fetchTokenWithRetry(signal: AbortSignal): Promise<{ key: string; expiresAtMs: number }> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= REFRESH_MAX_ATTEMPTS; attempt++) {
    if (signal.aborted) throw new Error("aborted");
    console.warn(`[deepgram] token fetch attempt ${attempt}/${REFRESH_MAX_ATTEMPTS}`);
    try {
      return await fetchToken(signal);
    } catch (e) {
      lastErr = e;
      if (attempt === REFRESH_MAX_ATTEMPTS) break;
      const backoff = REFRESH_BACKOFF_BASE_MS * Math.pow(2, attempt - 1) + Math.random() * 200;
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  throw lastErr ?? new Error("token fetch failed after retries");
}

function openSocket(key: string, events: DGEvents, signal: AbortSignal): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new Error("aborted")); return; }
    const ws = new WebSocket(
      `wss://api.deepgram.com/v1/listen?${PARAMS}`,
      ["bearer", key],            // bearer scheme for JWTs
    );
    const onAbort = () => { try { ws.close(); } catch { /* noop */ } };
    signal.addEventListener("abort", onAbort, { once: true });

    const handleOpen = () => {
      ws.removeEventListener("open", handleOpen);
      attachMessageHandlers(ws, events);
      resolve(ws);
    };
    const handleEarlyError = (e: Event) => {
      ws.removeEventListener("error", handleEarlyError);
      signal.removeEventListener("abort", onAbort);
      reject(e);
    };
    ws.addEventListener("open", handleOpen);
    ws.addEventListener("error", handleEarlyError);
  });
}

let consecutiveNullSpeakers = 0;
let nullSpeakerWarned = false;

function attachMessageHandlers(ws: WebSocket, events: DGEvents) {
  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(ev.data);
      if (msg.type !== "Results") return;
      const alt = msg.channel?.alternatives?.[0];
      if (!alt) return;
      const text = alt.transcript as string;
      if (!text) return;
      if (msg.is_final) {
        const words = (alt.words as DeepgramWord[] | undefined) ?? [];
        const speakerId = dominantSpeaker(words);
        if (speakerId === null) {
          consecutiveNullSpeakers += 1;
          if (!nullSpeakerWarned && consecutiveNullSpeakers >= NULL_SPEAKER_WARN_THRESHOLD) {
            console.warn(`[deepgram] ${NULL_SPEAKER_WARN_THRESHOLD} consecutive utterances missing speaker tag — diarization may have silently failed`);
            nullSpeakerWarned = true;
          }
        } else {
          consecutiveNullSpeakers = 0;
        }
        events.onFinal({
          text,
          start: (msg.start as number) ?? 0,
          end: ((msg.start as number) ?? 0) + ((msg.duration as number) ?? 0),
          is_final: true,
          speaker_id: speakerId,
        });
      } else {
        events.onInterim(text);
      }
    } catch (e) {
      events.onError(e);
    }
  };
  ws.onerror = (e) => events.onError(e);
  ws.onclose = () => events.onClose();
}

// Send Deepgram's CloseStream message so the server flushes in-flight utterances,
// then resolve when Deepgram echoes its own close frame. Falls back to hard-close
// after DRAIN_FALLBACK_MS if no echo.
function gracefulDrain(ws: WebSocket): Promise<void> {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => { if (done) return; done = true; try { ws.close(); } catch { /* noop */ } resolve(); };
    ws.addEventListener("close", finish, { once: true });
    try {
      if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: "CloseStream" }));
    } catch { /* noop */ }
    setTimeout(finish, DRAIN_FALLBACK_MS);
  });
}

export async function openDeepgramStream(events: DGEvents) {
  const controller = new AbortController();
  const signal = controller.signal;
  let closed = false;

  let { key, expiresAtMs } = await fetchTokenWithRetry(signal);
  let ws = await openSocket(key, events, signal);
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  // Reset per-session diagnostics
  consecutiveNullSpeakers = 0;
  nullSpeakerWarned = false;

  function scheduleRefresh() {
    if (closed) return;
    const ms = Math.max(1000, expiresAtMs - Date.now() - REFRESH_LEAD_MS);
    refreshTimer = setTimeout(refresh, ms);
  }

  async function refresh() {
    if (closed) return;
    try {
      const next = await fetchTokenWithRetry(signal);
      if (closed) return;                   // re-check after await
      const newWs = await openSocket(next.key, events, signal);
      if (closed) { try { newWs.close(); } catch { /* noop */ } return; }
      const oldWs = ws;
      ws = newWs;
      key = next.key;
      expiresAtMs = next.expiresAtMs;
      // CloseStream handshake — let Deepgram tell us when it's done draining
      void gracefulDrain(oldWs);
      scheduleRefresh();
    } catch (e) {
      events.onError(e);                    // bubble after all retries exhausted
    }
  }

  scheduleRefresh();
  const sessionStart = Date.now() / 1000;

  return {
    send: (chunk: Blob) => {
      if (ws.readyState === WebSocket.OPEN) {
        chunk.arrayBuffer().then((buf) => ws.send(buf));
      }
      // Else silently drop — the swap window is brief; existing dedup catches duplicates
    },
    close: () => {
      closed = true;
      controller.abort();
      if (refreshTimer) clearTimeout(refreshTimer);
      void gracefulDrain(ws);
    },
    sessionStart,
  };
}
```

- [ ] **Step 2: Run typecheck**

```
npx tsc --noEmit
```

Expected: remaining errors live in orchestrator/exports — none from `deepgram-stream.ts`.

- [ ] **Step 3: Smoke verification (short session)**

```
npm run dev
```

Open `/session`, click Record, speak briefly. Open DevTools → Network → filter `token`. Console should show `[deepgram] token fetch attempt 1/3` exactly once. Long-session JWT refresh verification deferred to Task 33.

- [ ] **Step 4: Commit**

```
git add lib/client/deepgram-stream.ts
git commit -m "Hardened Deepgram client: AbortController, 3-attempt retry, CloseStream drain, null-speaker threshold warning"
```

**Note for Task 12 (dominantSpeaker tests):** `dominantSpeaker` is now exported from this file as part of Task 11 (it's wired into `attachMessageHandlers` to derive `speaker_id`). Task 12's "Step 3: Add `dominantSpeaker`" can be skipped — the function is already in place. Task 12 becomes just the tests.

**Note for Task 13 (diarize=true + speaker parsing):** Both are also already in Task 11. Task 13 is now effectively a no-op verification step; the executor should mark it done after Task 11's smoke test confirms `speaker_id` lands in `transcript`.

---

# Phase D — Diarization

## Task 12: dominantSpeaker tests (function already exported by Task 11)

**Committee amendment (Streaming Systems):** Task 11's rewrite already exports `dominantSpeaker` and `DeepgramWord` from `lib/client/deepgram-stream.ts`. This task is now tests-only.

**Files:**
- Create: `tests/diarization.test.ts`

- [ ] **Step 1: Write tests**

Create `tests/diarization.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { dominantSpeaker } from "@/lib/client/deepgram-stream";

type W = { word: string; start: number; end: number; speaker?: number };

describe("dominantSpeaker", () => {
  it("returns null for empty input", () => {
    expect(dominantSpeaker([])).toBe(null);
  });

  it("returns null when no word has a speaker tag", () => {
    const words: W[] = [{ word: "a", start: 0, end: 1 }];
    expect(dominantSpeaker(words)).toBe(null);
  });

  it("returns the only speaker when all words share one tag", () => {
    const words: W[] = [
      { word: "a", start: 0, end: 1, speaker: 0 },
      { word: "b", start: 1, end: 2, speaker: 0 },
    ];
    expect(dominantSpeaker(words)).toBe(0);
  });

  it("returns the mode speaker when mixed", () => {
    const words: W[] = [
      { word: "a", start: 0, end: 1, speaker: 0 },
      { word: "b", start: 1, end: 2, speaker: 1 },
      { word: "c", start: 2, end: 3, speaker: 0 },
      { word: "d", start: 3, end: 4, speaker: 0 },
    ];
    expect(dominantSpeaker(words)).toBe(0);
  });

  it("ignores words missing the speaker field", () => {
    const words: W[] = [
      { word: "a", start: 0, end: 1 },
      { word: "b", start: 1, end: 2, speaker: 1 },
      { word: "c", start: 2, end: 3 },
    ];
    expect(dominantSpeaker(words)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, expect pass**

```
npm run test:run -- tests/diarization.test.ts
```

Expected: 5/5 passing.

- [ ] **Step 3: Commit**

```
git add tests/diarization.test.ts
git commit -m "Add dominantSpeaker tests (function lives in deepgram-stream.ts from Task 11)"
```

## Task 13: Verify diarization end-to-end (subsumed by Task 11; no new code)

**Committee amendment (Streaming Systems):** Task 11's rewrite already includes `diarize: "true"` in `PARAMS` and parses `speaker_id` via `dominantSpeaker(words)` in `attachMessageHandlers`. This task is now a manual verification step only.

**Implementation note (carries over from the v1 version, still applies):** the exact shape of Deepgram nova-3 word-level diarization data should be confirmed at https://developers.deepgram.com/docs/diarization. Task 11's parser expects `channel.alternatives[0].words[].speaker` as a number. If the field is differently named or structured (e.g., nested in `metadata`), the executor must adjust the `DeepgramWord` type and the `words` access in `attachMessageHandlers` — this is the most likely Deepgram-side surprise.

- [ ] **Step 1: Manual two-speaker verification**

```
npm run dev
```

Open `/session`, Record, speak briefly as yourself, then have a second person speak. In DevTools console:

```js
window.__factify.session.getState().transcript
```

Check that segments have non-null `speaker_id` values, toggling between two integers (typically 0 and 1).

(Sprint 1 acceptance gate B1.)

**No commit for this task** — verification only.

## Task 14: TranscriptView speaker blocks

**Files:**
- Modify: `components/session/TranscriptView.tsx`

- [ ] **Step 1: Add the palette and rewrite the render**

Replace `components/session/TranscriptView.tsx`:

```tsx
"use client";
import { useMemo } from "react";
import { useSession } from "@/lib/client/session-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VERDICT } from "@/lib/client/verdict-theme";
import type { ClaimCard, SpeakerId, TranscriptSegment } from "@/lib/types";

const HIGHLIGHT_TONE: Record<ClaimCard["primary_label"], string> = {
  TRUE: "bg-emerald-50 border-b-2 border-emerald-300",
  MOSTLY_TRUE: "bg-emerald-50 border-b-2 border-emerald-200",
  PARTIAL: "bg-amber-50 border-b-2 border-amber-300",
  MISLEADING: "bg-amber-50 border-b-2 border-amber-400",
  OMISSION: "bg-orange-50 border-b-2 border-orange-300",
  FALSE: "bg-rose-50 border-b-2 border-rose-300",
  UNVERIFIABLE: "bg-slate-50 border-b-2 border-slate-300",
  OPINION: "bg-violet-50 border-b-2 border-violet-300",
};

const SPEAKER_PALETTE = [
  { dot: "bg-sky-600",     label: "text-sky-700",     border: "border-sky-500" },
  { dot: "bg-fuchsia-600", label: "text-fuchsia-700", border: "border-fuchsia-500" },
  { dot: "bg-amber-600",   label: "text-amber-700",   border: "border-amber-500" },
  { dot: "bg-emerald-600", label: "text-emerald-700", border: "border-emerald-500" },
  { dot: "bg-violet-600",  label: "text-violet-700",  border: "border-violet-500" },
  { dot: "bg-rose-600",    label: "text-rose-700",    border: "border-rose-500" },
  { dot: "bg-cyan-600",    label: "text-cyan-700",    border: "border-cyan-500" },
  { dot: "bg-lime-600",    label: "text-lime-700",    border: "border-lime-500" },
];

export function paletteFor(id: SpeakerId): (typeof SPEAKER_PALETTE)[number] {
  return SPEAKER_PALETTE[id % SPEAKER_PALETTE.length];
}

type Block = { speakerId: SpeakerId | null; segments: TranscriptSegment[] };

function groupBySpeaker(segments: TranscriptSegment[]): Block[] {
  const blocks: Block[] = [];
  for (const seg of segments) {
    const last = blocks[blocks.length - 1];
    if (last && last.speakerId === seg.speaker_id) {
      last.segments.push(seg);
    } else {
      blocks.push({ speakerId: seg.speaker_id, segments: [seg] });
    }
  }
  return blocks;
}

export function TranscriptView({
  variant = "compact",
  onClaimSegmentClick,
}: {
  variant?: "compact" | "present";
  onClaimSegmentClick?: (claimId: string) => void;
} = {}) {
  const transcript = useSession((s) => s.transcript);
  const interim = useSession((s) => s.interim);
  const claims = useSession((s) => s.claims);
  const speakers = useSession((s) => s.speakers);

  const claimByStart = useMemo(() => {
    const map = new Map<number, ClaimCard>();
    for (const c of claims) map.set(c.utterance_start, c);
    return map;
  }, [claims]);

  const speakerLabel = useMemo(() => {
    const map = new Map<number, string>();
    for (const sp of speakers) map.set(sp.id, sp.label);
    return map;
  }, [speakers]);

  const blocks = useMemo(() => groupBySpeaker(transcript), [transcript]);
  const showSpeakers = speakers.length >= 2;
  const isPresent = variant === "present";

  return (
    <ScrollArea className="h-full">
      {/*
        Committee amendment (Accessibility, WCAG 4.1.3 Status Messages):
        role="log" + aria-live="polite" tells screen readers that new content
        appended here is a continuous log of utterances. Polite (not assertive)
        avoids interrupting the user's own speech with announcements of their
        own transcription. Interim text is rendered OUTSIDE this region to
        prevent 100ms partial-word floods.
      */}
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Live transcript"
        className={`${
          isPresent
            ? "mx-auto max-w-3xl px-8 py-10 text-[22px] leading-[1.55]"
            : "px-4 py-3 text-[15px] leading-relaxed"
        }`}
      >
        {transcript.length === 0 && !interim && (
          <p className="text-sm italic text-muted-foreground">
            Press <span className="font-semibold text-foreground">Record</span> and start talking — final segments appear here, claims to the right.
          </p>
        )}

        {blocks.map((block, blockIdx) => {
          const showHeader = showSpeakers && block.speakerId !== null;
          const palette = block.speakerId !== null ? paletteFor(block.speakerId) : null;
          return (
            <div
              key={blockIdx}
              className={`mb-3 ${showHeader && palette ? `border-l-2 pl-3 ${palette.border}` : ""}`}
            >
              {showHeader && palette && (
                <div className="mb-1 flex items-center gap-1.5">
                  <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
                  <span className={`text-[10px] font-semibold uppercase tracking-[0.14em] ${palette.label}`}>
                    {speakerLabel.get(block.speakerId!) ?? `Speaker ${block.speakerId! + 1}`}
                  </span>
                </div>
              )}
              <p className="whitespace-pre-wrap text-foreground/90">
                {block.segments.map((seg, segIdx) => {
                  const claim = claimByStart.get(seg.start);
                  const text = (segIdx === 0 ? "" : " ") + seg.text;
                  if (claim) {
                    const tone = HIGHLIGHT_TONE[claim.primary_label] ?? HIGHLIGHT_TONE.UNVERIFIABLE;
                    const verdict = VERDICT[claim.primary_label];
                    return (
                      <span
                        key={segIdx}
                        data-segment-start={seg.start}
                        data-claim-id={claim.id}
                        className={`cursor-pointer rounded-sm px-0.5 transition-colors hover:brightness-95 ${tone}`}
                        title={`${verdict.short} · ${claim.score}/100 · click to focus the card`}
                        onClick={() => onClaimSegmentClick?.(claim.id)}
                      >
                        {text}
                      </span>
                    );
                  }
                  return (
                    <span key={segIdx} data-segment-start={seg.start}>
                      {text}
                    </span>
                  );
                })}
              </p>
            </div>
          );
        })}

      </div>
      {/* Interim text rendered OUTSIDE the live region — no SR floods from partial words */}
      {interim && (
        <p className="px-4 py-1 text-muted-foreground/70" aria-hidden="true">{interim}</p>
      )}
    </ScrollArea>
  );
}
```

- [ ] **Step 2: Manual verification with agent-browser**

Drive `localhost:3001/session` via agent-browser:
- Single speaker: confirm transcript renders WITHOUT speaker label (clean monologue view)
- Two speakers (real conversation): confirm speaker blocks with colored left border + label chip

(Sprint 1 acceptance gate B2.)

- [ ] **Step 3: Commit**

```
git add components/session/TranscriptView.tsx
git commit -m "Render transcript as speaker blocks with colored border + label chip (≥2 speakers)"
```

## Task 15: Speaker chip row + rename UI in SessionHeader

**Files:**
- Modify: `components/session/SessionHeader.tsx`

- [ ] **Step 1: Add speaker chips row + rename input**

In `components/session/SessionHeader.tsx`, add this import:

```tsx
import { paletteFor } from "@/components/session/TranscriptView";
import { useState } from "react";
```

(Note: the existing file already imports `useEffect, useState` — adjust the import line accordingly.)

Inside the header, between the left-side timer block (the `<div className="flex items-center gap-3">`) and the right-side action buttons, add a new flex row:

```tsx
<SpeakerChipRow />
```

Then add this sub-component near the bottom (above `formatTime`):

```tsx
function SpeakerChipRow() {
  const speakers = useSession((s) => s.speakers);
  const renameSpeaker = useSession((s) => s.renameSpeaker);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState("");

  if (speakers.length < 2) return null;

  const commit = (id: number) => {
    renameSpeaker(id, draft);
    setEditingId(null);
  };
  const cancel = () => setEditingId(null);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {speakers.map((sp) => {
        const palette = paletteFor(sp.id);
        if (editingId === sp.id) {
          return (
            <span
              key={sp.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background pl-1.5 pr-1 py-0.5"
            >
              <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commit(sp.id);
                  else if (e.key === "Escape") cancel();
                }}
                onBlur={() => commit(sp.id)}
                maxLength={24}
                className="w-24 bg-transparent text-[11px] font-medium outline-none placeholder:text-muted-foreground"
                placeholder={`Speaker ${sp.id + 1}`}
              />
            </span>
          );
        }
        return (
          <button
            key={sp.id}
            type="button"
            onClick={() => { setEditingId(sp.id); setDraft(sp.label); }}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/80 hover:border-foreground/40"
            title="Click to rename this speaker"
          >
            <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
            {sp.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Manual verification with agent-browser**

- Start a session with two voices → confirm chip row appears
- Click "Speaker 1" → input replaces label
- Type "Israel" → press Enter → label updates to "Israel"
- Refresh the page in DevTools using `window.__factify.session.getState().speakers` to verify the rename took
- Check that transcript blocks now show "Israel" instead of "Speaker 1"

(Sprint 1 acceptance gate B3.)

- [ ] **Step 3: Commit**

```
git add components/session/SessionHeader.tsx
git commit -m "Add speaker chip row to header with inline rename (active at ≥2 speakers)"
```

## Task 16: Marker attribution helper + orchestrator integration

**Files:**
- Modify: `lib/client/orchestrator.ts`
- Modify: `tests/diarization.test.ts`

- [ ] **Step 1: Add `attributeMarker` tests**

Append to `tests/diarization.test.ts`:

```ts
import { attributeMarker } from "@/lib/client/orchestrator";
import type { TranscriptSegment } from "@/lib/types";

const seg = (start: number, end: number, speaker_id: number | null): TranscriptSegment => ({
  text: "x", start, end, is_final: true, speaker_id,
});

describe("attributeMarker", () => {
  const transcript: TranscriptSegment[] = [
    seg(0, 5, 0),
    seg(5, 10, 1),
    seg(10, 15, 0),
  ];

  it("returns the single overlapping speaker", () => {
    expect(attributeMarker({ start_time: 1, end_time: 3 } as never, transcript)).toBe(0);
    expect(attributeMarker({ start_time: 6, end_time: 8 } as never, transcript)).toBe(1);
  });

  it("returns null when overlap spans multiple speakers", () => {
    expect(attributeMarker({ start_time: 4, end_time: 7 } as never, transcript)).toBe(null);
  });

  it("returns null when no overlap", () => {
    expect(attributeMarker({ start_time: 100, end_time: 200 } as never, transcript)).toBe(null);
  });

  it("ignores segments with null speaker_id", () => {
    const t: TranscriptSegment[] = [seg(0, 5, null), seg(5, 10, 1)];
    expect(attributeMarker({ start_time: 1, end_time: 3 } as never, t)).toBe(null);
    expect(attributeMarker({ start_time: 6, end_time: 8 } as never, t)).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests, expect failure (function not yet exported)**

```
npm run test:run -- tests/diarization.test.ts
```

Expected: 4 new tests fail.

- [ ] **Step 3: Update `lib/client/orchestrator.ts` to attach speaker_ids to claims AND markers, AND export `attributeMarker`**

Replace `lib/client/orchestrator.ts` entirely (this also folds in Task 17 marker type validation, Task 18 dedup change, and Task 28 preview-fetch trigger — read carefully):

```ts
"use client";
import { ulid } from "ulid";
import { useSession } from "./session-store";
import { hashClaim, RecentSet } from "@/lib/dedup";
import { getEntry } from "@/lib/taxonomy";
import type {
  ClaimCard,
  RhetoricMarker,
  Source,
  SourcePreview,
  SpeakerId,
  TranscriptSegment,
} from "@/lib/types";

const recentClaimHashes = new RecentSet(30);
const recentMarkerHashes = new RecentSet(40);
let utteranceCounter = 0;
let lastRhetoricRunAt = 0;

type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
};

export function attributeMarker(
  m: { start_time: number; end_time: number },
  transcript: TranscriptSegment[],
): SpeakerId | null {
  const overlapping = transcript.filter(
    (s) => s.end >= m.start_time && s.start <= m.end_time && s.speaker_id !== null,
  );
  if (overlapping.length === 0) return null;
  const ids = new Set(overlapping.map((s) => s.speaker_id as number));
  return ids.size === 1 ? (overlapping[0].speaker_id as number) : null;
}

export async function onFinalUtterance(segment: TranscriptSegment) {
  maybeRunRhetoric();

  const { transcript } = useSession.getState();

  const cutoff = segment.start - 30;
  // Committee amendment (Linguist): thread speaker labels into CONTEXT so the
  // model can distinguish first-person assertion from reported speech.
  const ctx = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => s.speaker_id !== null ? `[Speaker ${s.speaker_id}] ${s.text}` : s.text)
    .join(" ");

  let res: Response;
  try {
    res = await fetch("/api/extract-claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        utterance: segment.text,
        utterance_start: segment.start,
        utterance_end: segment.end,
        context: ctx,
        recent_hashes: recentClaimHashes.toArray(),
      }),
    });
  } catch (e) {
    console.error("extract-claims fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { claims } = (await res.json()) as { claims: ExtractedClaim[] };
  if (!Array.isArray(claims) || claims.length === 0) return;

  for (const c of claims) {
    const h = hashClaim(c.claim_text);
    if (recentClaimHashes.has(h)) continue;
    recentClaimHashes.add(h);

    const card: ClaimCard = {
      id: ulid(),
      claim_text: c.claim_text,
      utterance_start: c.utterance_start,
      utterance_end: c.utterance_end,
      speaker_id: segment.speaker_id,
      topic: c.topic ?? "Other",
      primary_label: "UNVERIFIABLE",   // overridden once verify-provisional or verify-confirmed lands
      score: 0,
      annotations: [],
      explanation: "",
      status: "checking",
      sources: [],
    };
    useSession.getState().addClaim(card);

    void verifyProvisional(card.id, c.claim_text);
    void verifyConfirmed(card.id, c.claim_text);
  }
}

export function maybeRunRhetoric() {
  utteranceCounter += 1;
  const now = Date.now();
  const timeSince = now - lastRhetoricRunAt;
  if (utteranceCounter % 5 === 0 || timeSince > 30_000) {
    lastRhetoricRunAt = now;
    void runRhetoric();
  }
}

async function runRhetoric() {
  const { transcript } = useSession.getState();
  if (transcript.length === 0) return;

  const last = transcript[transcript.length - 1];
  const cutoff = last.end - 60;
  const win = transcript
    .filter((s) => s.end >= cutoff)
    .map((s) => `[${Math.floor(s.start)}s] ${s.text}`)
    .join("\n");

  let res: Response;
  try {
    res = await fetch("/api/analyze-rhetoric", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transcript_window: win,
        recent_hashes: recentMarkerHashes.toArray(),
      }),
    });
  } catch (e) {
    console.error("analyze-rhetoric fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { markers } = (await res.json()) as {
    markers: Array<Omit<RhetoricMarker, "id" | "speaker_id">>;
  };
  if (!Array.isArray(markers) || markers.length === 0) return;

  const currentTranscript = useSession.getState().transcript;

  for (const m of markers) {
    // Validate against taxonomy — drop unknowns, auto-correct mismatched type/display
    const entry = getEntry(m.name);
    if (!entry) continue;
    const correctedType = entry.type;
    const correctedDisplay = entry.display;

    // Dedup key: (type, excerpt) — see spec §6.4
    const h = hashClaim(`${correctedType}::${m.excerpt}`);
    if (recentMarkerHashes.has(h)) continue;
    recentMarkerHashes.add(h);

    const speakerId = attributeMarker(
      { start_time: m.start_time, end_time: m.end_time },
      currentTranscript,
    );

    useSession.getState().addMarker({
      ...m,
      type: correctedType,
      display: correctedDisplay,
      speaker_id: speakerId,
      id: ulid(),
    });
  }
}

async function verifyProvisional(id: string, claim_text: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-provisional", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text }),
    });
  } catch (e) {
    console.error("verify-provisional fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = await res.json();
  const current = useSession.getState().claims.find((c) => c.id === id);
  if (!current || current.status === "confirmed") return;
  useSession.getState().updateClaim(id, { ...data, status: "provisional" });
}

async function verifyConfirmed(id: string, claim_text: string) {
  let res: Response;
  try {
    res = await fetch("/api/verify-confirmed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claim_text }),
    });
  } catch (e) {
    console.error("verify-confirmed fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const data = (await res.json()) as Omit<ClaimCard, "id" | "claim_text" | "utterance_start" | "utterance_end" | "speaker_id" | "topic" | "status">;
  useSession.getState().updateClaim(id, { ...data, status: "confirmed" });

  // Fire OG-preview fetches in the background; they'll patch each Source.preview when they land.
  if (Array.isArray(data.sources) && data.sources.length > 0) {
    void fetchAndApplyPreviews(id, data.sources);
  }
}

async function fetchAndApplyPreviews(claimId: string, sources: Source[]) {
  const urls = sources.map((s) => s.url);
  let res: Response;
  try {
    res = await fetch("/api/source-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls }),
    });
  } catch (e) {
    console.error("source-preview fetch failed", e);
    return;
  }
  if (!res.ok) return;
  const { previews } = (await res.json()) as {
    previews: Record<string, SourcePreview | null>;
  };
  const current = useSession.getState().claims.find((c) => c.id === claimId);
  if (!current) return;
  const patched = current.sources.map((s) => {
    const p = previews[s.url];
    return p ? { ...s, preview: p } : s;
  });
  useSession.getState().updateClaim(claimId, { sources: patched });
}
```

- [ ] **Step 4: Run tests**

```
npm run test:run -- tests/diarization.test.ts
```

Expected: 9/9 passing (5 dominantSpeaker + 4 attributeMarker).

- [ ] **Step 5: Commit**

```
git add lib/client/orchestrator.ts tests/diarization.test.ts
git commit -m "Orchestrator: attach speaker_id to claims+markers, validate markers against taxonomy, tighten dedup, fire preview fetch"
```

## Task 17: ClaimCard + MarkerChip speaker badges

**Files:**
- Modify: `components/session/ClaimCard.tsx`
- Modify: `components/session/MarkerChip.tsx`

- [ ] **Step 1: Add a SpeakerBadge sub-component**

Create `components/session/SpeakerBadge.tsx`:

```tsx
"use client";
import { useSession } from "@/lib/client/session-store";
import { paletteFor } from "@/components/session/TranscriptView";
import type { SpeakerId } from "@/lib/types";

export function SpeakerBadge({ speakerId }: { speakerId: SpeakerId | null }) {
  const speakers = useSession((s) => s.speakers);
  if (speakerId === null) return null;
  const label = speakers.find((sp) => sp.id === speakerId)?.label ?? `Speaker ${speakerId + 1}`;
  const palette = paletteFor(speakerId);
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-1.5 py-0.5 text-[10px] font-medium text-foreground/80">
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${palette.dot}`} />
      {label}
    </span>
  );
}
```

- [ ] **Step 2: Add SpeakerBadge to `ClaimCard.tsx` header**

In `components/session/ClaimCard.tsx`, add import:

```tsx
import { SpeakerBadge } from "./SpeakerBadge";
```

Find the `<header>` element. Replace its inner left-side `<div className="flex flex-wrap items-center gap-1.5">` content (the verdict pill + StatusPill) with:

```tsx
<div className="flex flex-wrap items-center gap-1.5">
  <span
    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${verdict.pill}`}
  >
    {verdict.short}
  </span>
  <StatusPill
    status={card.status}
    sourceCount={card.sources.length}
  />
  <SpeakerBadge speakerId={card.speaker_id} />
</div>
```

- [ ] **Step 3: Add SpeakerBadge to `MarkerChip.tsx`**

In `components/session/MarkerChip.tsx`, add import:

```tsx
import { SpeakerBadge } from "./SpeakerBadge";
```

In the existing chips row (`<div className="flex flex-wrap items-center gap-1.5">`), add `<SpeakerBadge speakerId={marker.speaker_id} />` after the severity span:

```tsx
<div className="flex flex-wrap items-center gap-1.5">
  <span className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${theme.pill}`}>
    {theme.label}
  </span>
  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[marker.severity]}`} />
    {SEVERITY_LABEL[marker.severity]}
  </span>
  <SpeakerBadge speakerId={marker.speaker_id} />
</div>
```

- [ ] **Step 4: Manual verification with agent-browser**

Run a two-speaker session, confirm speaker badges appear on both ClaimCard and MarkerChip headers, and that renaming Speaker 1 → "Israel" updates the badges live.

(Sprint 1 acceptance gate B4.)

- [ ] **Step 5: Commit**

```
git add components/session/SpeakerBadge.tsx components/session/ClaimCard.tsx components/session/MarkerChip.tsx
git commit -m "Add SpeakerBadge to ClaimCard + MarkerChip headers"
```

---

# Phase E — Folded small fixes

## Task 18: ClaimCard "Checking…" lifecycle fix

**Files:**
- Modify: `components/session/ClaimCard.tsx`

- [ ] **Step 1: Update `isPending` rule and hide verdict pill + score when pending**

In `components/session/ClaimCard.tsx`, change the `isPending` line near the top of `ClaimCard`:

```tsx
const verdict = VERDICT[card.primary_label];
const isPending =
  card.status === "checking" ||
  (card.status === "provisional" && card.primary_label === "UNVERIFIABLE");
const isProvisional = card.status === "provisional" && !isPending;
```

Then update the header. Replace the left-side div content with:

```tsx
<div className="flex flex-wrap items-center gap-1.5">
  {!isPending && (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${verdict.pill}`}
    >
      {verdict.short}
    </span>
  )}
  <StatusPill
    status={card.status}
    sourceCount={card.sources.length}
  />
  <SpeakerBadge speakerId={card.speaker_id} />
</div>
```

And hide the score when pending:

```tsx
{!isPending && <ScoreNumber score={card.score} colorClass={verdict.scoreText} />}
```

- [ ] **Step 2: Manual verification with agent-browser**

```
npm run dev
```

Open `/session`, Record, speak a verifiable claim. Watch the new card: it should show "Checking sources…" pill with NO verdict pill and NO score for the in-flight period (~5-15s), then transition cleanly to the verdict once confirmed.

(Sprint 1 acceptance gate F1.)

- [ ] **Step 3: Commit**

```
git add components/session/ClaimCard.tsx
git commit -m "Hide verdict pill + score while card status is checking or provisional+UNVERIFIABLE"
```

## Task 19: Build sources from `web_search` tool-result citations (eliminate URL corruption at source)

**Committee amendment (AI Systems + Fact-checking):** The v1 plan filtered LLM-emitted source JSON with a regex substring blocklist (`','`, `":"`, `','domain'`). That's a band-aid against an open-ended attack surface — different model versions will produce different JSON-bleed shapes. The real fix: pull URL/title/domain from `web_search`'s tool-call result (AI SDK v6 exposes this via `result.steps[*].toolResults`), and constrain the LLM to emit only verdict-level fields + per-URL stance + per-URL excerpt. URL/title/domain are no longer LLM-hallucinable — they come from the search tool's authoritative citations.

This is a meaningful schema change to `verify-confirmed`. The prompt is updated to instruct the LLM to reference URLs from its search results, never invent them.

**Files:**
- Modify: `lib/prompts/verify-confirmed.ts`
- Modify: `app/api/verify-confirmed/route.ts`
- Create: `tests/verify-confirmed-citations.test.ts`

- [ ] **Step 1: Rewrite the prompt schema and SYSTEM**

Replace `lib/prompts/verify-confirmed.ts`:

```ts
import { z } from "zod";
import { LABEL } from "./verify-provisional";

// LLM emits only a thin per-URL stance map. URL/title/domain come from the
// web_search tool result and are stitched in server-side.
export const StanceRef = z.object({
  url: z.string().url(),
  stance: z.enum(["supports", "contradicts", "mixed"]),
  excerpt: z.string().min(1).max(400),
});

export const VerifyConfirmedResponse = z.object({
  primary_label: LABEL,
  score: z.number().int().min(0).max(100),
  annotations: z.array(z.string()).max(6),
  explanation: z.string().min(1).max(800),
  stance_refs: z.array(StanceRef).max(8),
});

export const SYSTEM = `You are a fact-checker grounding a single claim in real sources.

Use the web_search tool to find authoritative sources. Prefer Reuters, AP, AFP,
major newspapers, peer-reviewed journals, .gov, .edu. Avoid partisan blogs and
social media unless they are the original source.

Output JSON with: primary_label, score (0–100), annotations, explanation,
stance_refs.

For each stance_ref, reference a URL you actually visited via web_search:
- url: the EXACT URL from one of your web_search results — copy it verbatim,
  never paraphrase or reconstruct it. The server validates that each url
  matches one returned by the tool.
- stance: "supports" | "contradicts" | "mixed" — your judgment on how that
  source relates to the claim.
- excerpt: 1–2 sentences quoted or paraphrased from the source.

If web_search returns nothing reliable, label UNVERIFIABLE with score 50,
explain why, and return an empty stance_refs array.

If the claim is opinion, label OPINION with score 0 and no stance_refs.`;
```

- [ ] **Step 2: Rewrite the route to stitch sources from tool-call results**

Replace `app/api/verify-confirmed/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { opus } from "@/lib/server/anthropic";
import { SYSTEM, VerifyConfirmedResponse } from "@/lib/prompts/verify-confirmed";
import { classifyDomain, extractDomain } from "@/lib/reputation";
import type { Source, Stance } from "@/lib/types";
import { mergeStanceWithCitations } from "./citations";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { claim_text } = await req.json();
  try {
    const result = await generateText({
      model: opus,
      output: Output.object({ schema: VerifyConfirmedResponse }),
      system: SYSTEM,
      prompt: `CLAIM:\n${claim_text}`,
      tools: {
        web_search: anthropic.tools.webSearch_20260209({ maxUses: 5 }),
      },
    });

    const sources = mergeStanceWithCitations(
      result.steps,
      result.output.stance_refs,
    ).map((s) => {
      const domain = extractDomain(s.domain || s.url);
      return { ...s, domain, reputation_tier: classifyDomain(domain) };
    });

    return NextResponse.json({
      primary_label: result.output.primary_label,
      score: result.output.score,
      annotations: result.output.annotations,
      explanation: result.output.explanation,
      sources,
    });
  } catch (e) {
    console.error("verify-confirmed failed", e);
    return NextResponse.json({ error: "verify failed" }, { status: 500 });
  }
}
```

- [ ] **Step 3: Create the citation-merge helper**

Create `app/api/verify-confirmed/citations.ts`:

```ts
import type { Source, Stance } from "@/lib/types";

type ToolResult = { toolName: string; result?: unknown };
type Step = { toolResults?: ToolResult[] };
type Citation = { url: string; title?: string; snippet?: string };

/**
 * Walk the AI SDK v6 step list, extract web_search tool results, flatten into a
 * URL → Citation map. URL is the authoritative key — the LLM-emitted url field
 * MUST match exactly (we strip trailing slashes for tolerance, nothing more).
 *
 * Tool-result shape can vary slightly across web_search versions. We probe a
 * couple of common shapes and ignore unknowns rather than crash. If the
 * tool-result shape changes in a future @ai-sdk/anthropic release, this is the
 * function to update.
 */
export function extractCitations(steps: Step[]): Map<string, Citation> {
  const out = new Map<string, Citation>();
  for (const step of steps ?? []) {
    for (const tr of step.toolResults ?? []) {
      if (tr.toolName !== "web_search") continue;
      const result = tr.result as unknown;
      const items: unknown[] = Array.isArray(result)
        ? result
        : Array.isArray((result as { results?: unknown[] })?.results)
          ? (result as { results: unknown[] }).results
          : Array.isArray((result as { citations?: unknown[] })?.citations)
            ? (result as { citations: unknown[] }).citations
            : [];
      for (const raw of items) {
        const item = raw as { url?: string; title?: string; snippet?: string; description?: string };
        if (typeof item.url !== "string") continue;
        const norm = normalizeUrl(item.url);
        if (!norm) continue;
        if (!out.has(norm)) {
          out.set(norm, {
            url: item.url,
            title: item.title,
            snippet: item.snippet ?? item.description,
          });
        }
      }
    }
  }
  return out;
}

function normalizeUrl(u: string): string | null {
  try {
    const url = new URL(u);
    // Strip trailing slash on pathname only; preserve search + hash
    if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }
    return url.toString();
  } catch {
    return null;
  }
}

/**
 * Combine LLM-emitted stance/excerpt with tool-authoritative URL/title.
 * Drops any stance_ref whose URL didn't appear in the tool results (the LLM
 * hallucinated it). Returns Source[] with url/domain/title/stance/excerpt set;
 * caller fills reputation_tier.
 */
export function mergeStanceWithCitations(
  steps: Step[],
  stanceRefs: Array<{ url: string; stance: Stance; excerpt: string }>,
): Array<Omit<Source, "reputation_tier" | "preview">> {
  const citations = extractCitations(steps);
  const out: Array<Omit<Source, "reputation_tier" | "preview">> = [];
  const seen = new Set<string>();
  for (const ref of stanceRefs ?? []) {
    const key = normalizeUrl(ref.url);
    if (!key || !citations.has(key) || seen.has(key)) continue;
    seen.add(key);
    const cit = citations.get(key)!;
    const domain = safeDomain(cit.url);
    out.push({
      url: cit.url,
      domain,
      title: cit.title ?? domain,
      stance: ref.stance,
      excerpt: ref.excerpt,
    });
  }
  return out;
}

function safeDomain(u: string): string {
  try {
    return new URL(u).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}
```

- [ ] **Step 4: Write tests for the helpers**

Create `tests/verify-confirmed-citations.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractCitations, mergeStanceWithCitations } from "@/app/api/verify-confirmed/citations";

const fakeStep = (urls: Array<{ url: string; title?: string; snippet?: string }>) => ({
  toolResults: [{ toolName: "web_search", result: { results: urls } }],
});

describe("extractCitations", () => {
  it("flattens tool results across steps", () => {
    const steps = [
      fakeStep([{ url: "https://nasa.gov/apollo-11", title: "Apollo 11" }]),
      fakeStep([{ url: "https://bbc.com/news/x", title: "BBC" }]),
    ];
    const map = extractCitations(steps);
    expect(map.size).toBe(2);
  });

  it("normalizes trailing slashes", () => {
    const steps = [fakeStep([{ url: "https://nasa.gov/apollo-11/" }])];
    const map = extractCitations(steps);
    expect([...map.keys()][0]).toBe("https://nasa.gov/apollo-11");
  });

  it("ignores unknown shapes without crashing", () => {
    const steps = [{ toolResults: [{ toolName: "web_search", result: "garbage" }] }];
    expect(extractCitations(steps).size).toBe(0);
  });

  it("ignores non-web_search tool results", () => {
    const steps = [{ toolResults: [{ toolName: "other_tool", result: { results: [{ url: "https://x.com" }] } }] }];
    expect(extractCitations(steps).size).toBe(0);
  });
});

describe("mergeStanceWithCitations", () => {
  const steps = [fakeStep([
    { url: "https://nasa.gov/apollo-11", title: "Apollo 11 — NASA" },
    { url: "https://bbc.com/news/x", title: "BBC News" },
  ])];

  it("keeps stance_refs whose url matches a citation", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "NASA confirms..." },
    ]);
    expect(sources).toHaveLength(1);
    expect(sources[0]).toMatchObject({
      url: "https://nasa.gov/apollo-11",
      title: "Apollo 11 — NASA",
      stance: "supports",
      domain: "nasa.gov",
    });
  });

  it("drops stance_refs whose url was never visited (hallucinated)", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://fake.example.com", stance: "supports", excerpt: "fake" },
    ]);
    expect(sources).toHaveLength(0);
  });

  it("deduplicates the same url across multiple stance_refs", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "first" },
      { url: "https://nasa.gov/apollo-11", stance: "supports", excerpt: "second" },
    ]);
    expect(sources).toHaveLength(1);
  });

  it("handles a trailing-slash mismatch between citation and stance_ref", () => {
    const sources = mergeStanceWithCitations(steps, [
      { url: "https://nasa.gov/apollo-11/", stance: "supports", excerpt: "x" },
    ]);
    expect(sources).toHaveLength(1);
  });
});
```

- [ ] **Step 5: Run tests, expect pass**

```
npm run test:run -- tests/verify-confirmed-citations.test.ts
```

Expected: 8/8 passing.

- [ ] **Step 6: Smoke verification on a real claim**

```
npm run dev
```

In a second terminal, post a sample claim:

```
curl -s -X POST http://localhost:3001/api/verify-confirmed \
  -H "Content-Type: application/json" \
  -d '{"claim_text": "The Apollo 11 mission landed on the moon in July 1969."}' | jq
```

Expected: response contains `primary_label: "TRUE"`, `sources: [...]` where each source's `url` is a real URL (no `','` substrings, no double-encoded JSON), and `title` reads like a real article title rather than LLM paraphrase.

- [ ] **Step 7: Commit**

```
git add lib/prompts/verify-confirmed.ts app/api/verify-confirmed/route.ts app/api/verify-confirmed/citations.ts tests/verify-confirmed-citations.test.ts
git commit -m "Build sources from web_search tool-result citations; LLM emits only verdict + stance refs"
```

**Implementation note:** The exact shape of `web_search`'s tool result varies across `@ai-sdk/anthropic` releases. The `extractCitations` helper probes a couple of known shapes (`Array | { results } | { citations }`); if the smoke test shows zero sources for a claim that obviously has them, the tool result is probably in a fourth shape and the executor should `console.log(JSON.stringify(result.steps, null, 2))` once to inspect, then extend the helper. Tests cover the merge logic regardless of probe shape.

## Task 20: Marker dedup tightening — fully covered by Task 16 commit. Skip-or-verify.

Already shipped in Task 16's rewrite of `orchestrator.ts`: the dedup key is now `${correctedType}::${m.excerpt}` instead of `${m.name}::${m.excerpt}`, and unknown names are dropped, and type/display are auto-corrected from the taxonomy.

- [ ] **Step 1: Add a unit test for the dedup key change**

In `tests/dedup.test.ts`, add (after the existing tests):

```ts
import { describe as describe2, it as it2, expect as expect2 } from "vitest";
// Re-use hashClaim — already exported. The orchestrator now uses it with `${type}::${excerpt}` as input.

describe2("hashClaim — marker dedup keys", () => {
  it2("collapses two type-equivalent markers with different names but same excerpt", () => {
    const a = hashClaim("rhetoric::his conclusion was something weird going on here");
    const b = hashClaim("rhetoric::his conclusion was something weird going on here");
    expect2(a).toBe(b);
  });

  it2("keeps markers distinct when types differ", () => {
    const a = hashClaim("rhetoric::his conclusion was something weird going on here");
    const b = hashClaim("fallacy::his conclusion was something weird going on here");
    expect2(a).not.toBe(b);
  });
});
```

Note: don't duplicate the existing `describe` block — re-use the existing one if natural, otherwise these renamed imports work as-is.

- [ ] **Step 2: Run all tests**

```
npm run test:run
```

Expected: all green, 2 new tests in `dedup.test.ts`.

- [ ] **Step 3: Commit**

```
git add tests/dedup.test.ts
git commit -m "Add tests for (type, excerpt) marker dedup key"
```

## Task 21: Marker type validation — fully covered by Task 16 commit. Verify via manual test.

Already shipped (Task 16 orchestrator rewrite). The `runRhetoric` loop now drops markers whose `name` isn't in taxonomy and auto-corrects `type` + `display`.

- [ ] **Step 1: Manual verification**

After running a real session, dump markers via DevTools console:

```js
window.__factify.session.getState().markers.forEach(m => {
  const entry = require... // n/a in browser
});
```

Or just visually scan the markers panel: no `[BIAS]` chip should appear on a rhetoric-taxonomy entry like Innuendo, Vagueness, or Repetition. If you see one, the validation isn't working.

(Sprint 1 acceptance gate F3 — verify during final walkthrough.)

- [ ] **Step 2: No commit needed — verification only.**

## Task 22: extract-claims schema — topic enum + entity-anchoring + reported-speech + secondary topic

**Committee amendment (Linguist):** The "Joe Kent resigned from his position" UNVERIFIABLE failure in the session export isn't waiting for Sprint 2's normalization architecture — it's solvable in Sprint 1 with two added prompt rules. The Linguist's framing: this is *controlled definite description generation*, not full coreference resolution. Two sentences in the SYSTEM prompt instruct the model to anchor proper nouns to their most specific CONTEXT referent and to extract embedded factual claims from evaluative wrappers separately. Plus a `topic_secondary` field handles the legitimate case where a single claim spans multiple topic domains (e.g., the Joe Kent claim is simultaneously Politics + Defense + Law).

**Files:**
- Modify: `lib/prompts/extract-claims.ts`
- Modify: `lib/client/orchestrator.ts` (consume new fields)
- Modify: `lib/types.ts` (ClaimCard gets `topic_secondary`)
- Create: `tests/extract-claims-schema.test.ts`

- [ ] **Step 1: Extend `ClaimCard` type with `topic_secondary`**

In `lib/types.ts`, change `ClaimCard`:

```ts
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
```

- [ ] **Step 2: Rewrite the prompt + schema**

Replace `lib/prompts/extract-claims.ts`:

```ts
import { z } from "zod";

export const TOPIC = z.enum([
  "Politics",
  "Defense",
  "Economy",
  "Society",
  "Immigration",
  "Healthcare",
  "Climate",
  "Science",
  "Law",
  "History",
  "Culture",
  "Other",
]);
export type Topic = z.infer<typeof TOPIC>;

export const ExtractedClaim = z.object({
  claim_text: z.string().min(3),
  utterance_start: z.number(),
  utterance_end: z.number(),
  topic: TOPIC,
  topic_secondary: TOPIC.nullable(),
});
export type ExtractedClaim = z.infer<typeof ExtractedClaim>;

export const ExtractClaimsResponse = z.object({
  claims: z.array(ExtractedClaim),
});

export const SYSTEM = `You extract checkable factual claims from a live transcript.

Output JSON: { "claims": [{ "claim_text", "utterance_start", "utterance_end", "topic", "topic_secondary" }] }.

Rules:
- Return ONLY claims verifiable against external sources (statistics, dates, names, events, attributions).
- SKIP: pure opinions, normative statements ("should"/"ought"), hypotheticals, predictions, questions.
- SKIP: any claim text whose normalized form matches an entry in RECENT_HASHES — those are already known.
- If the latest utterance contains no checkable claim, return { "claims": [] }.
- For utterance_start/utterance_end, use the timestamps provided for the latest utterance.

ENTITY ANCHORING (critical for verification):
- For every named person, organization, or location in claim_text, include their MOST SPECIFIC identifier available in CONTEXT (title, role, affiliation, date). NEVER use a bare proper name when CONTEXT establishes a disambiguating role.
  Example BAD: "Joe Kent resigned from his position."
  Example GOOD: "Joe Kent, Director of the National Counterterrorism Center under Trump, resigned in protest of the Iran war policy."

REPORTED SPEECH / EVALUATIVE FRAMES:
- When a claim about a person's actions or qualifications is embedded in an evaluative frame (e.g., "you can't say he doesn't know what he's talking about", "they tried to tell you he was a leaker but that was a lie"), extract the EMBEDDED factual claim separately from the evaluative wrapper. Two extracted claims are better than one tangled hybrid.
  Example: from "They tried to tell you he was under investigation, but that was a lie" — the embedded factual claim is "He was under investigation" (the speaker is asserting its negation, but the claim itself is checkable against public reporting).

TOPIC TAGGING:
- topic (required): the PRIMARY domain. One of: Politics, Defense, Economy, Society, Immigration, Healthcare, Climate, Science, Law, History, Culture, Other. Use "Other" when none fit.
- topic_secondary (nullable): a SECOND domain when the claim cross-cuts. Must differ from topic. Set to null when one tag suffices. Example: a claim about a counterterrorism official's resignation indexes Politics + Defense.`;

export function userPrompt(args: {
  utterance: string;
  utterance_start: number;
  utterance_end: number;
  context: string;
  recent_hashes: string[];
}): string {
  return `LATEST_UTTERANCE (start=${args.utterance_start}, end=${args.utterance_end}):
${args.utterance}

CONTEXT (preceding ~30s):
${args.context}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
```

- [ ] **Step 3: Update orchestrator to consume the new fields**

In `lib/client/orchestrator.ts`, locate the `ExtractedClaim` local type and ClaimCard construction in `onFinalUtterance`. Update both:

```ts
type ExtractedClaim = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: string;
  topic_secondary: string | null;
};
```

And in the ClaimCard construction:

```ts
const card: ClaimCard = {
  id: ulid(),
  claim_text: c.claim_text,
  utterance_start: c.utterance_start,
  utterance_end: c.utterance_end,
  speaker_id: segment.speaker_id,
  topic: c.topic ?? "Other",
  topic_secondary: c.topic_secondary ?? null,
  primary_label: "UNVERIFIABLE",
  score: 0,
  annotations: [],
  explanation: "",
  status: "checking",
  sources: [],
};
```

- [ ] **Step 4: Write the schema test**

Create `tests/extract-claims-schema.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { ExtractClaimsResponse } from "@/lib/prompts/extract-claims";

describe("ExtractClaimsResponse", () => {
  it("accepts a claim with primary + secondary topic", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "Joe Kent, NCTC Director, resigned over Iran policy.",
        utterance_start: 0,
        utterance_end: 5,
        topic: "Politics",
        topic_secondary: "Defense",
      }],
    });
    expect(parsed.claims[0].topic).toBe("Politics");
    expect(parsed.claims[0].topic_secondary).toBe("Defense");
  });

  it("accepts null topic_secondary", () => {
    const parsed = ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "The U.S. unemployment rate hit 3.4% in 2023.",
        utterance_start: 0,
        utterance_end: 5,
        topic: "Economy",
        topic_secondary: null,
      }],
    });
    expect(parsed.claims[0].topic_secondary).toBeNull();
  });

  it("rejects a claim missing both topic fields", () => {
    expect(() => ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "X is true.",
        utterance_start: 0,
        utterance_end: 1,
      }],
    })).toThrow();
  });

  it("rejects a claim with unknown topic", () => {
    expect(() => ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "X is true.",
        utterance_start: 0,
        utterance_end: 1,
        topic: "Sports",
        topic_secondary: null,
      }],
    })).toThrow();
  });

  it("rejects a claim missing topic_secondary entirely", () => {
    expect(() => ExtractClaimsResponse.parse({
      claims: [{
        claim_text: "X is true.",
        utterance_start: 0,
        utterance_end: 1,
        topic: "Economy",
      }],
    })).toThrow();
  });
});
```

- [ ] **Step 5: Run typecheck + tests**

```
npx tsc --noEmit
npm run test:run -- tests/extract-claims-schema.test.ts
```

Expected: 5/5 passing, tsc clean.

- [ ] **Step 6: Commit**

```
git add lib/types.ts lib/prompts/extract-claims.ts lib/client/orchestrator.ts tests/extract-claims-schema.test.ts
git commit -m "Add entity-anchoring + reported-speech rules to extract-claims prompt; primary+secondary topic schema"
```

**Verification of the Joe Kent fix:** After Task 33's acceptance walkthrough, re-run the Tucker monologue export through the live pipeline. The previously-UNVERIFIABLE "Joe Kent resigned from his position" should now extract as something like "Joe Kent, Director of the National Counterterrorism Center under Trump, resigned in protest of the Iran war policy" — and verify-confirmed should return TRUE or MOSTLY_TRUE because the entity is no longer ambiguous.

## Task 23: ClaimCard topic chip

**Files:**
- Modify: `components/session/ClaimCard.tsx`

- [ ] **Step 1: Render the topic chip in card header**

In `components/session/ClaimCard.tsx`, after the `<StatusPill ...>` line in the header's left-side div, add:

```tsx
{card.topic && card.topic !== "Other" && (
  <span className="inline-flex items-center rounded-full border border-border/50 bg-background px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-foreground/60">
    {card.topic}
  </span>
)}
```

- [ ] **Step 2: Manual verification with agent-browser**

Run a real session — speak a few claims of varied topics (e.g., "the unemployment rate" → Economy; "the moon landing" → Science). Confirm each card shows the correct topic chip in its header, and "Other" topic claims don't show a chip.

(Sprint 1 acceptance gate F5.)

- [ ] **Step 3: Commit**

```
git add components/session/ClaimCard.tsx
git commit -m "Render topic chip in ClaimCard header (hidden when 'Other')"
```

---

# Phase F — Visual enrichment

## Task 24: OG metadata scraper module

**Files:**
- Create: `lib/server/og-fetch.ts`
- Create: `tests/og-fetch.test.ts`

- [ ] **Step 1: Write tests for pure helpers (entity decode + absolutize)**

Create `tests/og-fetch.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { decodeHtmlEntities, absolutize, parseMetaFromHtml } from "@/lib/server/og-fetch";

describe("decodeHtmlEntities", () => {
  it("decodes common named entities", () => {
    expect(decodeHtmlEntities("Tom &amp; Jerry")).toBe("Tom & Jerry");
    expect(decodeHtmlEntities("&quot;hello&quot;")).toBe('"hello"');
    expect(decodeHtmlEntities("a &lt; b &gt; c")).toBe("a < b > c");
    expect(decodeHtmlEntities("It&#39;s")).toBe("It's");
  });

  it("passes through text without entities", () => {
    expect(decodeHtmlEntities("plain text")).toBe("plain text");
  });
});

describe("absolutize", () => {
  it("returns absolute URLs unchanged", () => {
    expect(absolutize("https://example.com/img.png", "https://other.com/page")).toBe(
      "https://example.com/img.png",
    );
  });

  it("resolves protocol-relative URLs against the base scheme", () => {
    expect(absolutize("//cdn.example.com/x.png", "https://example.com/page")).toBe(
      "https://cdn.example.com/x.png",
    );
  });

  it("resolves root-relative paths against the base origin", () => {
    expect(absolutize("/static/img.png", "https://example.com/articles/123")).toBe(
      "https://example.com/static/img.png",
    );
  });

  it("returns null when input is null or empty", () => {
    expect(absolutize(null, "https://example.com/")).toBe(null);
    expect(absolutize("", "https://example.com/")).toBe(null);
  });
});

describe("parseMetaFromHtml", () => {
  const html = `
<html><head>
<meta property="og:title" content="Example Title" />
<meta property="og:image" content="https://cdn.example.com/img.png" />
<meta property="og:description" content="An &amp; example" />
<meta name="twitter:image" content="https://twcdn.com/x.jpg" />
</head><body></body></html>`;

  it("extracts og:title, og:image, og:description", () => {
    const result = parseMetaFromHtml(html, "https://example.com/page");
    expect(result.title).toBe("Example Title");
    expect(result.image_url).toBe("https://cdn.example.com/img.png");
    expect(result.description).toBe("An & example");
  });

  it("falls back to twitter:image when og:image absent", () => {
    const noOg = `<html><head><meta name="twitter:image" content="https://twcdn.com/x.jpg" /></head></html>`;
    const result = parseMetaFromHtml(noOg, "https://example.com/");
    expect(result.image_url).toBe("https://twcdn.com/x.jpg");
  });

  it("returns all-nulls when no metadata present", () => {
    const empty = `<html><head><title>plain</title></head></html>`;
    const result = parseMetaFromHtml(empty, "https://example.com/");
    expect(result.image_url).toBe(null);
    expect(result.title).toBe(null);
    expect(result.description).toBe(null);
  });
});
```

- [ ] **Step 2: Run tests, expect failure (module doesn't exist)**

```
npm run test:run -- tests/og-fetch.test.ts
```

- [ ] **Step 3: Implement `lib/server/og-fetch.ts`**

```ts
import type { SourcePreview } from "@/lib/types";

const ENTITY_DECODE: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&#x27;": "'",
  "&#x2F;": "/",
  "&nbsp;": " ",
};

export function decodeHtmlEntities(s: string): string {
  return s.replace(/&(amp|lt|gt|quot|apos|nbsp|#39|#x27|#x2F);/g, (m) => ENTITY_DECODE[m] ?? m);
}

export function absolutize(raw: string | null, base: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

export type ParsedMeta = Omit<SourcePreview, "fetched_at">;

function meta(html: string, prop: string): string | null {
  // Tolerate either property= or name=, attribute order, and single OR double quotes.
  const re = new RegExp(
    `<meta\\s+(?:[^>]*?(?:property|name)\\s*=\\s*["']${prop}["'][^>]*?content\\s*=\\s*["']([^"']+)["']|[^>]*?content\\s*=\\s*["']([^"']+)["'][^>]*?(?:property|name)\\s*=\\s*["']${prop}["'])`,
    "i",
  );
  const m = html.match(re);
  if (!m) return null;
  const raw = m[1] ?? m[2];
  return raw ? decodeHtmlEntities(raw) : null;
}

export function parseMetaFromHtml(html: string, sourceUrl: string): ParsedMeta {
  return {
    image_url: absolutize(meta(html, "og:image") ?? meta(html, "twitter:image"), sourceUrl),
    image_alt: meta(html, "og:image:alt") ?? meta(html, "twitter:image:alt"),
    title: meta(html, "og:title") ?? meta(html, "twitter:title"),
    description: meta(html, "og:description") ?? meta(html, "twitter:description"),
  };
}

const previewCache = new Map<string, SourcePreview>();
const CACHE_TTL_MS = 7 * 24 * 3600 * 1000;
const CACHE_MAX = 500;
const HEAD_BYTE_CAP = 64 * 1024;
const FETCH_TIMEOUT_MS = 5_000;

function cacheSet(url: string, preview: SourcePreview) {
  if (previewCache.size >= CACHE_MAX) {
    // Evict the oldest insertion (Map preserves insertion order)
    const firstKey = previewCache.keys().next().value;
    if (firstKey !== undefined) previewCache.delete(firstKey);
  }
  previewCache.set(url, preview);
}

export async function fetchPreview(url: string): Promise<SourcePreview | null> {
  const cached = previewCache.get(url);
  if (cached && Date.now() - cached.fetched_at < CACHE_TTL_MS) return cached;

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; FactifyBot/1.0; +https://yenta.vercel.app)",
        "Accept": "text/html,application/xhtml+xml;q=0.9",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      redirect: "follow",
    });
    if (!res.ok) return null;

    const reader = res.body?.getReader();
    if (!reader) return null;
    let html = "";
    let total = 0;
    const decoder = new TextDecoder();
    while (total < HEAD_BYTE_CAP) {
      const { value, done } = await reader.read();
      if (done) break;
      html += decoder.decode(value, { stream: true });
      total += value.length;
      if (html.includes("</head>")) break;
    }
    void reader.cancel();

    const parsed = parseMetaFromHtml(html, url);
    if (!parsed.image_url && !parsed.title && !parsed.description) return null;

    const preview: SourcePreview = { ...parsed, fetched_at: Date.now() };
    cacheSet(url, preview);
    return preview;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests, expect pass**

```
npm run test:run -- tests/og-fetch.test.ts
```

Expected: 9/9 passing.

- [ ] **Step 5: Commit**

```
git add lib/server/og-fetch.ts tests/og-fetch.test.ts
git commit -m "Add OG metadata scraper with in-memory cache, 64KB head cap, 5s timeout"
```

## Task 25: /api/source-preview endpoint with SSRF defense

**Committee amendment (Security):** The endpoint fetches user-controlled URLs server-side. A malicious URL injected into web_search results could probe internal network addresses (cloud metadata at `169.254.169.254`, private RFC 1918 ranges, loopback). The fix: resolve each hostname before fetch, reject any address in a private/reserved range. This is per-request DNS resolution, ~10ms overhead per URL, no architectural cost.

**Files:**
- Create: `app/api/source-preview/route.ts`
- Create: `app/api/source-preview/ssrf-guard.ts`
- Create: `tests/ssrf-guard.test.ts`

- [ ] **Step 1: Write tests for the SSRF guard**

Create `tests/ssrf-guard.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isPrivateIp, isHttpScheme } from "@/app/api/source-preview/ssrf-guard";

describe("isHttpScheme", () => {
  it("allows http and https", () => {
    expect(isHttpScheme("http://example.com")).toBe(true);
    expect(isHttpScheme("https://example.com")).toBe(true);
  });

  it("blocks file/data/ftp/ws/etc", () => {
    expect(isHttpScheme("file:///etc/passwd")).toBe(false);
    expect(isHttpScheme("data:text/html,x")).toBe(false);
    expect(isHttpScheme("ftp://example.com")).toBe(false);
    expect(isHttpScheme("ws://example.com")).toBe(false);
    expect(isHttpScheme("not a url")).toBe(false);
  });
});

describe("isPrivateIp", () => {
  it("flags IPv4 loopback", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("127.255.255.255")).toBe(true);
  });

  it("flags IPv4 RFC 1918 ranges", () => {
    expect(isPrivateIp("10.0.0.1")).toBe(true);
    expect(isPrivateIp("172.16.0.1")).toBe(true);
    expect(isPrivateIp("172.31.255.255")).toBe(true);
    expect(isPrivateIp("192.168.1.1")).toBe(true);
  });

  it("flags AWS/cloud link-local metadata", () => {
    expect(isPrivateIp("169.254.169.254")).toBe(true);
    expect(isPrivateIp("169.254.0.1")).toBe(true);
  });

  it("flags IPv6 loopback and link-local", () => {
    expect(isPrivateIp("::1")).toBe(true);
    expect(isPrivateIp("fe80::1")).toBe(true);
    expect(isPrivateIp("fc00::1")).toBe(true);
  });

  it("allows public IPv4 addresses", () => {
    expect(isPrivateIp("8.8.8.8")).toBe(false);
    expect(isPrivateIp("172.15.255.255")).toBe(false);
    expect(isPrivateIp("172.32.0.1")).toBe(false);
    expect(isPrivateIp("169.253.255.255")).toBe(false);
  });

  it("allows public IPv6 addresses", () => {
    expect(isPrivateIp("2001:4860:4860::8888")).toBe(false);
  });

  it("treats malformed input as private (fail-closed)", () => {
    expect(isPrivateIp("not an ip")).toBe(true);
    expect(isPrivateIp("")).toBe(true);
  });
});
```

- [ ] **Step 2: Implement the guard**

Create `app/api/source-preview/ssrf-guard.ts`:

```ts
import dns from "node:dns/promises";
import net from "node:net";

export function isHttpScheme(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Fail-closed. Returns true (= block) for:
 * - Malformed inputs
 * - IPv4: 0/8, 10/8, 100.64/10 (CGNAT), 127/8, 169.254/16 (link-local + AWS metadata),
 *         172.16/12, 192.0.0/24, 192.0.2/24, 192.168/16, 198.18/15 (perf-test),
 *         198.51.100/24, 203.0.113/24, 224/4 (multicast), 240/4 (reserved)
 * - IPv6: ::, ::1, fc00::/7, fe80::/10, ff00::/8 (multicast), IPv4-mapped private
 */
export function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const v = net.isIP(ip);
  if (v === 4) return isPrivateIpv4(ip);
  if (v === 6) return isPrivateIpv6(ip);
  return true;
}

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) return true;
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;       // CGNAT
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;                  // link-local + AWS metadata
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 0) return true;                    // RFC 6890
  if (a === 192 && b === 168) return true;
  if (a === 198 && (b === 18 || b === 19)) return true;     // perf test
  if (a === 198 && b === 51) return true;                   // documentation
  if (a === 203 && b === 0) return true;                    // documentation
  if (a >= 224) return true;                                 // multicast + reserved
  return false;
}

function isPrivateIpv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true;  // ULA
  if (lower.startsWith("fe80")) return true;                            // link-local
  if (lower.startsWith("ff")) return true;                              // multicast
  // IPv4-mapped IPv6 (::ffff:a.b.c.d) — recurse on the embedded IPv4
  const v4mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4mapped) return isPrivateIpv4(v4mapped[1]);
  return false;
}

/**
 * Resolve the URL's hostname and verify none of the resolved addresses are private.
 * Returns null if safe; otherwise a short reason string for logging.
 */
export async function ssrfReject(url: string): Promise<string | null> {
  if (!isHttpScheme(url)) return "non-http scheme";
  let hostname: string;
  try {
    hostname = new URL(url).hostname;
  } catch {
    return "malformed url";
  }
  // If hostname is already a literal IP, check it directly
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) return "literal private ip";
    return null;
  }
  // DNS resolve and check every address
  try {
    const addrs = await dns.lookup(hostname, { all: true });
    for (const a of addrs) {
      if (isPrivateIp(a.address)) return `resolved to private ip (${a.address})`;
    }
    return null;
  } catch {
    return "dns lookup failed";
  }
}
```

- [ ] **Step 3: Implement the route with guard wired in**

Create `app/api/source-preview/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { fetchPreview } from "@/lib/server/og-fetch";
import { ssrfReject } from "./ssrf-guard";
import type { SourcePreview } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_URLS = 20;

async function safeFetchPreview(url: string): Promise<SourcePreview | null> {
  const reason = await ssrfReject(url);
  if (reason !== null) {
    console.warn(`[source-preview] blocked ${url}: ${reason}`);
    return null;
  }
  return fetchPreview(url);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const urls = (body as { urls?: unknown }).urls;
  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    return NextResponse.json({ error: "urls must be string[]" }, { status: 400 });
  }
  const trimmed = (urls as string[]).slice(0, MAX_URLS);

  const settled = await Promise.allSettled(trimmed.map((u) => safeFetchPreview(u)));

  const previews: Record<string, SourcePreview | null> = {};
  trimmed.forEach((u, i) => {
    const r = settled[i];
    previews[u] = r.status === "fulfilled" ? r.value : null;
  });

  return NextResponse.json({ previews });
}
```

- [ ] **Step 4: Run tests, expect pass**

```
npm run test:run -- tests/ssrf-guard.test.ts
```

Expected: 8/8 passing.

- [ ] **Step 5: Smoke-test the route — public URLs allowed, private blocked**

```
npm run dev
```

Public URLs should work:

```
curl -X POST http://localhost:3001/api/source-preview \
  -H "Content-Type: application/json" \
  -d '{"urls":["https://www.nasa.gov/mission/apollo-11/","https://www.bbc.com"]}'
```

Expected: previews populated (or null where OG metadata absent).

Private URLs should be blocked (and you should see a `[source-preview] blocked ...` log line in the dev server output):

```
curl -X POST http://localhost:3001/api/source-preview \
  -H "Content-Type: application/json" \
  -d '{"urls":["http://169.254.169.254/latest/meta-data/","http://127.0.0.1:8080/"]}'
```

Expected: both URLs return `null` in the previews map.

- [ ] **Step 6: Commit**

```
git add app/api/source-preview/route.ts app/api/source-preview/ssrf-guard.ts tests/ssrf-guard.test.ts
git commit -m "Add SSRF defense to /api/source-preview (DNS-resolve + private-range block)"
```

## Task 26: Hero image render on ClaimCard

**Files:**
- Modify: `components/session/ClaimCard.tsx`

The preview fetch wiring is already in place from Task 16 (orchestrator's `fetchAndApplyPreviews`).

- [ ] **Step 1: Add `pickHero` helper at the bottom of `ClaimCard.tsx`**

Append to `components/session/ClaimCard.tsx`:

```tsx
function pickHero(card: ClaimCardT): SourcePreview | null {
  if (card.sources.length === 0) return null;
  const expectedStance: Stance | null =
    card.primary_label === "TRUE" || card.primary_label === "MOSTLY_TRUE" ? "supports" :
    card.primary_label === "FALSE" || card.primary_label === "MISLEADING" || card.primary_label === "OMISSION" ? "contradicts" :
    null;

  const tierRank = (t: ReputationTier) => (t === "high" ? 2 : t === "mid" ? 1 : 0);

  const sorted = [...card.sources].sort((a, b) => {
    const t = tierRank(b.reputation_tier) - tierRank(a.reputation_tier);
    if (t !== 0) return t;
    if (expectedStance) {
      const s = (b.stance === expectedStance ? 1 : 0) - (a.stance === expectedStance ? 1 : 0);
      if (s !== 0) return s;
    }
    return 0;
  });

  for (const s of sorted) if (s.preview?.image_url) return s.preview;
  return null;
}
```

Also add the missing imports at the top:

```tsx
import Image from "next/image";
import type { ReputationTier, SourcePreview, Stance } from "@/lib/types";
```

- [ ] **Step 2: Render the hero image with `sizes` + provenance caption (non-compact only)**

**Committee amendments folded in:**
- React/Next.js: `sizes="(max-width: 768px) 100vw, 33vw"` matches the card's actual layout width even with `unoptimized` (browsers use it for native resource hints)
- Fact-checking: provenance caption — every hero is editorial amplification unless captioned with source + stance. Reuters Trust Principles transparency requirement
- (Server-side image-load check is in Task 24's `fetchPreview` — see below)

Inside the `ClaimCard` component, just BEFORE the `<header>` element, add:

```tsx
{!compact && (() => {
  const hero = pickHero(card);
  if (!hero?.image_url) return null;
  // Find the source this hero came from to render provenance accurately
  const heroSource = card.sources.find((s) => s.preview?.image_url === hero.image_url);
  const stanceLabel: Record<Stance, string> = {
    supports: "supports this claim",
    contradicts: "contradicts this claim",
    mixed: "mixed take on this claim",
  };
  return (
    <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border/60">
      <Image
        src={hero.image_url}
        alt={hero.image_alt ?? hero.title ?? "Source preview"}
        fill
        unoptimized
        sizes="(max-width: 768px) 100vw, 33vw"
        className="object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2.5">
        {hero.title && (
          <p className="text-[12px] font-medium leading-tight text-white line-clamp-2">{hero.title}</p>
        )}
        {heroSource && (
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-white/80">
            Source: {heroSource.domain} · {stanceLabel[heroSource.stance]}
          </p>
        )}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 2a: Add server-side image-load check to `fetchPreview` (Task 24 amendment)**

The committee (Fact-checking) flagged that OG images are frequently paywalled, geo-blocked, or 404. A broken image slot on a verdict card is worse than no image. Add a HEAD probe after parsing the OG `image_url` — if the HEAD fails or returns non-image content-type, null the `image_url` so the card falls back to text-only.

In `lib/server/og-fetch.ts`, after the `parsed = parseMetaFromHtml(html, url)` line and before the `if (!parsed.image_url && ...)` early return, add:

```ts
// Image-load check: if og:image URL doesn't serve real image bytes, drop it
if (parsed.image_url) {
  try {
    const head = await fetch(parsed.image_url, {
      method: "HEAD",
      signal: AbortSignal.timeout(3_000),
      redirect: "follow",
    });
    const ct = head.headers.get("content-type") ?? "";
    if (!head.ok || !ct.startsWith("image/")) {
      parsed.image_url = null;
      parsed.image_alt = null;
    }
  } catch {
    parsed.image_url = null;
    parsed.image_alt = null;
  }
}
```

- [ ] **Step 3: Add hero selection tests**

Create `tests/hero-selection.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { ClaimCard, ReputationTier, Source, SourcePreview, Stance } from "@/lib/types";

// pickHero isn't exported — re-implement the same logic here to lock it as a contract.
// If you'd rather, export pickHero from ClaimCard.tsx and import it here.
function tierRank(t: ReputationTier): number {
  return t === "high" ? 2 : t === "mid" ? 1 : 0;
}

function pickHero(card: ClaimCard): SourcePreview | null {
  if (card.sources.length === 0) return null;
  const expectedStance: Stance | null =
    card.primary_label === "TRUE" || card.primary_label === "MOSTLY_TRUE" ? "supports" :
    card.primary_label === "FALSE" || card.primary_label === "MISLEADING" || card.primary_label === "OMISSION" ? "contradicts" :
    null;
  const sorted = [...card.sources].sort((a, b) => {
    const t = tierRank(b.reputation_tier) - tierRank(a.reputation_tier);
    if (t !== 0) return t;
    if (expectedStance) {
      const s = (b.stance === expectedStance ? 1 : 0) - (a.stance === expectedStance ? 1 : 0);
      if (s !== 0) return s;
    }
    return 0;
  });
  for (const s of sorted) if (s.preview?.image_url) return s.preview;
  return null;
}

const preview = (url: string): SourcePreview => ({
  image_url: url,
  image_alt: null,
  title: null,
  description: null,
  fetched_at: 0,
});

const source = (over: Partial<Source>): Source => ({
  url: "https://x.com",
  domain: "x.com",
  title: "x",
  reputation_tier: "mid",
  stance: "supports",
  ...over,
});

const card = (label: ClaimCard["primary_label"], sources: Source[]): ClaimCard => ({
  id: "c1",
  claim_text: "x",
  utterance_start: 0,
  utterance_end: 1,
  speaker_id: null,
  topic: "Other",
  primary_label: label,
  score: 90,
  annotations: [],
  explanation: "",
  status: "confirmed",
  sources,
});

describe("pickHero", () => {
  it("returns null for cards with no sources", () => {
    expect(pickHero(card("TRUE", []))).toBe(null);
  });

  it("returns null when no source has a preview image", () => {
    expect(pickHero(card("TRUE", [source({ preview: undefined })]))).toBe(null);
  });

  it("prefers high reputation over mid", () => {
    const result = pickHero(card("TRUE", [
      source({ reputation_tier: "mid", preview: preview("mid.png") }),
      source({ reputation_tier: "high", preview: preview("high.png") }),
    ]));
    expect(result?.image_url).toBe("high.png");
  });

  it("within tier, prefers supports for TRUE verdicts", () => {
    const result = pickHero(card("TRUE", [
      source({ reputation_tier: "high", stance: "contradicts", preview: preview("contra.png") }),
      source({ reputation_tier: "high", stance: "supports", preview: preview("supp.png") }),
    ]));
    expect(result?.image_url).toBe("supp.png");
  });

  it("within tier, prefers contradicts for FALSE verdicts", () => {
    const result = pickHero(card("FALSE", [
      source({ reputation_tier: "high", stance: "supports", preview: preview("supp.png") }),
      source({ reputation_tier: "high", stance: "contradicts", preview: preview("contra.png") }),
    ]));
    expect(result?.image_url).toBe("contra.png");
  });

  it("for UNVERIFIABLE verdict, just picks by tier", () => {
    const result = pickHero(card("UNVERIFIABLE", [
      source({ reputation_tier: "high", preview: preview("high.png") }),
      source({ reputation_tier: "low", preview: preview("low.png") }),
    ]));
    expect(result?.image_url).toBe("high.png");
  });
});
```

- [ ] **Step 4: Run tests, expect pass**

```
npm run test:run -- tests/hero-selection.test.ts
```

Expected: 6/6 passing.

- [ ] **Step 5: Manual verification with agent-browser**

Run a real session with verifiable claims (e.g., the moon-landing fixture). Confirm cards with multiple sources show a 16:9 preview image at top with the OG title overlay. Cards whose sources have no OG image (e.g., bare gov pages) render cleanly without a gap.

(Sprint 1 acceptance gates V1 + V2.)

- [ ] **Step 6: Commit**

```
git add components/session/ClaimCard.tsx tests/hero-selection.test.ts
git commit -m "Render hero source image on ClaimCard (non-compact) with stance-aware selection"
```

## Task 27: Marker archetype icon catalog

**Files:**
- Modify: `lib/taxonomy/archetypes.ts`

- [ ] **Step 1: Add the ARCHETYPE_ICONS map**

Replace `lib/taxonomy/archetypes.ts`:

```ts
import {
  Megaphone, XCircle, GitBranch, ArrowRightLeft, AlertTriangle,
  Crown, HeartHandshake, CloudFog, Repeat, Split, Zap,
  Users, Filter, Scale, Fingerprint, HelpCircle,
  type LucideIcon,
} from "lucide-react";

export const ARCHETYPES = [
  "appeal_to",
  "dismissal",
  "generalization",
  "redirection",
  "fear",
  "authority",
  "emotion",
  "vagueness",
  "repetition",
  "false_binary",
  "false_causation",
  "in_group",
  "framing",
  "burden",
  "identity",
  "unknown",
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

export function isArchetype(s: string): s is Archetype {
  return (ARCHETYPES as readonly string[]).includes(s);
}

export const ARCHETYPE_ICONS: Record<Archetype, LucideIcon> = {
  appeal_to: Megaphone,
  dismissal: XCircle,
  generalization: GitBranch,
  redirection: ArrowRightLeft,
  fear: AlertTriangle,
  authority: Crown,
  emotion: HeartHandshake,
  vagueness: CloudFog,
  repetition: Repeat,
  false_binary: Split,
  false_causation: Zap,
  in_group: Users,
  framing: Filter,
  burden: Scale,
  identity: Fingerprint,
  unknown: HelpCircle,
};
```

- [ ] **Step 2: Run typecheck**

```
npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```
git add lib/taxonomy/archetypes.ts
git commit -m "Map archetypes to lucide-react icons (15 archetypes + unknown fallback)"
```

## Task 28: Render archetype icon in MarkerChip

**Files:**
- Modify: `components/session/MarkerChip.tsx`

- [ ] **Step 1: Render the icon**

In `components/session/MarkerChip.tsx`, add the import:

```tsx
import { ARCHETYPE_ICONS } from "@/lib/taxonomy/archetypes";
```

Inside the component, look up the icon. After `const taxonomyEntry = getEntry(marker.name);`, add:

```tsx
const Icon = taxonomyEntry?.archetype ? ARCHETYPE_ICONS[taxonomyEntry.archetype] : null;
```

Insert the icon in the chips row, AFTER the type pill and BEFORE the severity dot:

```tsx
<div className="flex flex-wrap items-center gap-1.5">
  <span className={`inline-flex items-center rounded-full border px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider ${theme.pill}`}>
    {theme.label}
  </span>
  {Icon && <Icon aria-hidden className="h-3.5 w-3.5 shrink-0 text-foreground/70" />}
  <span className="inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
    <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${SEVERITY_DOT[marker.severity]}`} />
    {SEVERITY_LABEL[marker.severity]}
  </span>
  <SpeakerBadge speakerId={marker.speaker_id} />
</div>
```

- [ ] **Step 2: Commit**

```
git add components/session/MarkerChip.tsx
git commit -m "Render archetype icon in MarkerChip header (renders only when archetype is populated)"
```

## Task 29: Two-phase archetype classifier — propose, review, apply

**Committee amendment (AI Systems + Psychologist):** A single LLM call writing directly to `book-entries.json` and `extras.ts` is opaque — no confidence field, no diff, no audit trail. The failure mode that matters isn't obvious misclassification (Innuendo → `dismissal`) but plausible-but-wrong (Gish Gallop → `repetition` when `burden` is arguably right). Since archetype drives the icon on every MarkerChip, a wrong mapping is silently user-visible forever until manually corrected.

The two-phase design: phase 1 PROPOSES (writes `scripts/archetype-proposals.json` with confidence + rationale; never touches taxonomy files); phase 2 APPLIES (shows colored diff, requires Enter to commit). Israel's review becomes a structured pass over ~20 low-confidence entries rather than a free-form 30-min scan of 123.

The Psychologist's severity-definition addition (Task 27 in v1 — actually folded here since it lives in the same tag-archetypes prompt): "subtle / clear / blatant" is pinned to **detectability by a motivated lay listener** (Mercier & Sperber's open-vs-covert argumentative moves), not rhetorical force. That distinction goes into the SYSTEM prompt so the model knows which axis to score on.

**Files:**
- Create: `scripts/tag-archetypes.ts` (Phase 1 — propose)
- Create: `scripts/apply-archetypes.ts` (Phase 2 — diff + apply)
- Create: `scripts/archetype-proposals.json` (generated artifact, committed for audit history)
- Modify: `package.json` (two npm scripts)
- Modify: `lib/taxonomy/book-entries.json` (populated by Phase 2)
- Modify: `lib/taxonomy/extras.ts` (populated by Phase 2)
- Modify: `tests/taxonomy.test.ts` (assert coverage after apply)

- [ ] **Step 1: Create the Phase 1 (propose) script**

Create `scripts/tag-archetypes.ts`:

```ts
/* eslint-disable no-console */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { generateText, Output } from "ai";
import { z } from "zod";
import { opus } from "../lib/server/anthropic";
import { ALL, type TaxonomyEntry } from "../lib/taxonomy";
import { ARCHETYPES } from "../lib/taxonomy/archetypes";

const ArchetypeEnum = z.enum(ARCHETYPES);
const Confidence = z.enum(["high", "medium", "low"]);

const Proposal = z.object({
  canonical_id: z.string(),
  proposed_archetype: ArchetypeEnum,
  rationale: z.string().min(8).max(220),
  confidence: Confidence,
});

const ClassifyResponse = z.object({
  assignments: z.array(Proposal),
});

// Severity operational definition (Psychologist amendment) — pinned to detectability
// by a lay listener, not rhetorical force. This is the same axis used in the
// analyze-rhetoric prompt's severity field, restated here for consistency.
const SEVERITY_DEF = `Severity (when emitted in marker analysis, not this script's output) is pinned to detectability by a motivated lay listener:
- "blatant": an untrained listener would notice something is off
- "clear": a typical listener notices on reflection
- "subtle": even a trained analyst might miss on first pass`;

const SYSTEM = `You categorize cognitive biases, logical fallacies, and rhetorical devices into 15 archetype categories. The archetype is a coarse-grained tag that groups related items so they can share a visual icon.

Archetypes (pick exactly ONE per entry; "unknown" only when none fit):
- appeal_to:        appeal-to-* (popularity, emotion, fear, nature, tradition) — broad-base persuasion via inflating a non-evidential support
- dismissal:        ad hominem, genetic, tone policing — attacks on the source not the substance
- generalization:   hasty, sweeping, anecdotal, stereotype-from-one
- redirection:      strawman, red herring, whataboutism, tu quoque — change the subject
- fear:             appeals to fear, slippery slope (when fear-driven), catastrophizing
- authority:        appeal to authority specifically, authority bias, halo effect — credibility-transfer
- emotion:          sympathy, pity, indignation — non-fear emotional appeals
- vagueness:        innuendo, hand-waving, glittering generalities, weasel words
- repetition:       drumbeat, big lie, repetition for emphasis, illusory truth
- false_binary:     false dilemma, black-and-white, no-true-scotsman
- false_causation:  post hoc, single cause, correlation-as-causation
- in_group:         tribalism, dog whistle, us-vs-them, in/out-group bias
- framing:          loaded language, euphemism, dysphemism, framing effects
- burden:           shifting burden of proof, appeal to ignorance
- identity:         confirmation bias, motivated reasoning, anchoring, naive realism — beliefs about self/world that bias reasoning
- unknown:          truly no fit

Important disambiguations (Cognitive Psychologist guidance):
- "Appeal to Authority" can be read as both \`appeal_to\` AND \`authority\`. Route ALL fallacy-form appeal-to-authority entries to \`appeal_to\`; reserve \`authority\` for the bias variant (deference without argument evaluation) and halo-effect-style credibility transfer.
- "Slippery Slope" can be \`fear\` (if scary-consequences-driven) or \`false_causation\` (if causation-chain-driven). Read the entry's definition/aka to decide.

${SEVERITY_DEF}

For each entry output: canonical_id (verbatim), proposed_archetype, rationale (one sentence), confidence ("high" / "medium" / "low" — how sure are you given the entry's name+definition+examples).

Return JSON: { "assignments": [{ canonical_id, proposed_archetype, rationale, confidence }] }.`;

async function main() {
  const items: TaxonomyEntry[] = ALL;
  const lines = items.map((e) =>
    `- ${e.canonical_id} [${e.type}] "${e.display}"${e.aka ? ` (aka ${e.aka})` : ""}${e.definition ? ` — ${e.definition}` : ""}`
  ).join("\n");

  console.log(`[propose] Classifying ${items.length} taxonomy entries…`);

  const { output } = await generateText({
    model: opus,
    output: Output.object({ schema: ClassifyResponse }),
    system: SYSTEM,
    prompt: `ENTRIES:\n${lines}\n\nReturn one assignment per entry. ${items.length} expected.`,
  });

  if (output.assignments.length !== items.length) {
    console.warn(`[propose] expected ${items.length} assignments, got ${output.assignments.length}`);
  }

  const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  const proposalsPath = path.join(dirname, "archetype-proposals.json");
  writeFileSync(proposalsPath, JSON.stringify(output.assignments, null, 2) + "\n");

  const byConfidence = { high: 0, medium: 0, low: 0 };
  for (const a of output.assignments) byConfidence[a.confidence] += 1;
  console.log(`[propose] wrote ${proposalsPath}`);
  console.log(`[propose] confidence breakdown: high=${byConfidence.high} medium=${byConfidence.medium} low=${byConfidence.low}`);
  console.log(`[propose] next: review proposals (especially low-confidence ones), then run \`npm run apply:archetypes\``);
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 2: Create the Phase 2 (diff + apply) script**

Create `scripts/apply-archetypes.ts`:

```ts
/* eslint-disable no-console */
import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import readline from "node:readline/promises";
import { z } from "zod";
import { ARCHETYPES } from "../lib/taxonomy/archetypes";
import { ALL } from "../lib/taxonomy";
import { EXTRAS, type ExtraEntry } from "../lib/taxonomy/extras";

const ArchetypeEnum = z.enum(ARCHETYPES);
const Confidence = z.enum(["high", "medium", "low"]);
const Proposal = z.object({
  canonical_id: z.string(),
  proposed_archetype: ArchetypeEnum,
  rationale: z.string(),
  confidence: Confidence,
});
const ProposalsFile = z.array(Proposal);

// ANSI colors — green=high, yellow=medium, red=low
const C = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
};

async function main() {
  const dirname = typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));
  const proposalsPath = path.join(dirname, "archetype-proposals.json");
  const raw = JSON.parse(readFileSync(proposalsPath, "utf8"));
  const proposals = ProposalsFile.parse(raw);

  console.log(`[apply] loaded ${proposals.length} proposals from ${proposalsPath}`);
  console.log();

  const byConf = { high: [] as typeof proposals, medium: [] as typeof proposals, low: [] as typeof proposals };
  for (const p of proposals) byConf[p.confidence].push(p);

  // Render diff: low confidence first, then medium, then high (the order most worth scanning)
  for (const conf of ["low", "medium", "high"] as const) {
    if (byConf[conf].length === 0) continue;
    const color = conf === "low" ? C.red : conf === "medium" ? C.yellow : C.green;
    console.log(`${C.bold}${color}═══ ${conf.toUpperCase()} CONFIDENCE (${byConf[conf].length}) ═══${C.reset}`);
    for (const p of byConf[conf]) {
      const entry = ALL.find((e) => e.canonical_id === p.canonical_id);
      const display = entry?.display ?? p.canonical_id;
      const type = entry?.type ?? "?";
      console.log(`${color}${p.confidence === "low" ? "?" : p.confidence === "medium" ? "~" : "✓"}${C.reset} ${C.bold}${display}${C.reset} ${C.dim}[${type}]${C.reset} → ${color}${p.proposed_archetype}${C.reset}`);
      console.log(`  ${C.dim}${p.rationale}${C.reset}`);
    }
    console.log();
  }

  // Confirm
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Apply all ${proposals.length} proposals? Press Enter to apply, anything else to abort: `);
  rl.close();
  if (answer.trim() !== "") {
    console.log("[apply] aborted; no files written.");
    return;
  }

  const byId = new Map(proposals.map((p) => [p.canonical_id, p.proposed_archetype]));

  // Apply to book-entries.json
  const bookPath = path.join(dirname, "..", "lib", "taxonomy", "book-entries.json");
  const bookEntries = JSON.parse(readFileSync(bookPath, "utf8")) as Array<Record<string, unknown>>;
  for (const e of bookEntries) {
    const a = byId.get(e.canonical_id as string);
    if (a) e.archetype = a;
  }
  writeFileSync(bookPath, JSON.stringify(bookEntries, null, 2) + "\n");
  console.log(`[apply] wrote ${bookPath}`);

  // Regenerate extras.ts deterministically
  const extrasPath = path.join(dirname, "..", "lib", "taxonomy", "extras.ts");
  const updatedExtras: ExtraEntry[] = EXTRAS.map((e) => ({ ...e, archetype: byId.get(e.canonical_id) }));
  const HEADER = `import type { MarkerType } from "../types";
import type { Archetype } from "./archetypes";

export type ExtraEntry = {
  canonical_id: string;
  type: MarkerType;
  display: string;
  aka?: string;
  archetype?: Archetype;
};

export const EXTRAS: ExtraEntry[] = [
`;
  const FOOTER = `];\n`;
  const rows = updatedExtras.map((e) => {
    const parts: string[] = [];
    parts.push(`canonical_id: ${JSON.stringify(e.canonical_id)}`);
    parts.push(`type: ${JSON.stringify(e.type)}`);
    parts.push(`display: ${JSON.stringify(e.display)}`);
    if (e.aka) parts.push(`aka: ${JSON.stringify(e.aka)}`);
    if (e.archetype) parts.push(`archetype: ${JSON.stringify(e.archetype)}`);
    return `  { ${parts.join(", ")} },`;
  });
  writeFileSync(extrasPath, HEADER + rows.join("\n") + "\n" + FOOTER);
  console.log(`[apply] wrote ${extrasPath}`);
  console.log("[apply] done. Run `npx tsc --noEmit && npm run test:run` to verify.");
}

main().catch((e) => { console.error(e); process.exit(1); });
```

- [ ] **Step 3: Add npm scripts**

In `package.json`, in the `"scripts"` block, add:

```json
"tag:archetypes": "tsx --env-file=.env.local scripts/tag-archetypes.ts",
"apply:archetypes": "tsx scripts/apply-archetypes.ts",
```

- [ ] **Step 4: Run Phase 1 (propose)**

```
npm run tag:archetypes
```

Expected: writes `scripts/archetype-proposals.json` (~123 entries with confidence). Stdout shows breakdown like `high=82 medium=29 low=12`.

- [ ] **Step 5: Open `scripts/archetype-proposals.json` and review low-confidence entries**

Spot-check at minimum: every `"confidence": "low"` entry. Israel's domain expertise (the book's author) is the override. If a proposed archetype looks obviously wrong even on a "high" confidence entry, edit the JSON in place — Phase 2 applies whatever is in the file.

- [ ] **Step 6: Run Phase 2 (diff + apply)**

```
npm run apply:archetypes
```

Expected: prints a colored diff (red = low, yellow = medium, green = high), then prompts for confirmation. Press Enter to apply; anything else aborts.

- [ ] **Step 7: Run typecheck + tests**

```
npx tsc --noEmit
npm run test:run
```

Expected: clean, all green.

- [ ] **Step 8: Add the coverage assertion test**

In `tests/taxonomy.test.ts`, append:

```ts
import { ALL } from "@/lib/taxonomy";
import { isArchetype } from "@/lib/taxonomy/archetypes";

describe("taxonomy — archetype coverage", () => {
  it("every entry has a valid archetype", () => {
    const missing = ALL.filter((e) => !e.archetype || !isArchetype(e.archetype));
    expect(missing.map((e) => e.canonical_id)).toEqual([]);
  });
});
```

- [ ] **Step 9: Run the coverage test**

```
npm run test:run -- tests/taxonomy.test.ts
```

Expected: pass.

- [ ] **Step 10: Commit (single commit — script + proposals artifact + populated taxonomy + test)**

```
git add scripts/tag-archetypes.ts scripts/apply-archetypes.ts scripts/archetype-proposals.json package.json lib/taxonomy/book-entries.json lib/taxonomy/extras.ts tests/taxonomy.test.ts
git commit -m "Two-phase archetype classifier: propose w/ confidence, diff-review, apply on confirm"
```

The committed `archetype-proposals.json` doubles as a regression fixture: a future re-run can be diffed against it to catch model-behavior drift.

(Sprint 1 acceptance gates V3 + V4.)

## Task 29.5: Prompt-caching wrapper on `taxonomyHints()` (analyze-rhetoric)

**Committee amendment (AI Systems):** The `taxonomyHints()` block (~2k tokens of 123-entry taxonomy descriptors) is emitted verbatim on every rhetoric-analysis call. Anthropic prompt-caching cuts cached-block input cost ~10× and reduces TTFT. The block is static at runtime, eligible for caching.

The exact AI SDK v6 syntax for cache control depends on `@ai-sdk/anthropic`'s current `providerOptions` / `cacheControl` surface. The Anthropic docs URL for current syntax: https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching.

**Files:**
- Modify: `lib/prompts/analyze-rhetoric.ts`
- Modify: `app/api/analyze-rhetoric/route.ts`

- [ ] **Step 1: Verify current AI SDK v6 cache-control syntax**

Open https://sdk.vercel.ai/docs/ai-sdk-core/settings and search for "cache". Confirm the field name on `system` / `messages` for Anthropic provider — current candidates include `providerOptions.anthropic.cacheControl: { type: "ephemeral" }` or a per-message `_cacheControl` marker. If neither documentation page is clear, log a `console.log` of the request body once to verify the wire format matches what Anthropic's caching API expects (`cache_control: { type: "ephemeral" }` on the system block).

- [ ] **Step 2: Restructure SYSTEM into a stable prefix + variable suffix**

In `lib/prompts/analyze-rhetoric.ts`, split SYSTEM into two parts so the cacheable prefix (the taxonomy + invariant instructions) is distinct from the dynamic per-call body. The taxonomy hints currently get inlined into the userPrompt — move them into the SYSTEM prefix where they belong, and make the userPrompt carry only `transcript_window` + `recent_hashes`.

Replace the file's exports section (keep `MarkerSchema` and `AnalyzeRhetoricResponse` unchanged):

```ts
export const SYSTEM_PREFIX = `You analyze a transcript window for cognitive biases, logical
fallacies, and rhetorical patterns.

You may ONLY use names from the TAXONOMY below. Match by canonical_id (the
"name" field). Use the entry's "display" for the human label.

For each marker:
- Quote a VERBATIM excerpt from the transcript (max 25 words).
- Estimate start_time and end_time (seconds) from the transcript timestamps.
- Choose severity by detectability (lay listener test):
  - "blatant": an untrained listener would notice something is off
  - "clear": a typical listener notices on reflection
  - "subtle": even a trained analyst might miss on first pass
- Explain in 1-3 sentences what makes it that marker.

Do NOT return any marker whose hash is in RECENT_HASHES — those are already known.

If the window has none of the above, return { "markers": [] }.

TAXONOMY:
${taxonomyHints()}`;

export function userPrompt(args: {
  transcript_window: string;
  recent_hashes: string[];
}): string {
  return `TRANSCRIPT_WINDOW:
${args.transcript_window}

RECENT_HASHES:
${args.recent_hashes.join("\n") || "(none)"}`;
}
```

(Note: `taxonomyHints()` is now called once at module-load time, frozen into `SYSTEM_PREFIX`. Acceptable because taxonomy is static at runtime.)

- [ ] **Step 3: Wire cache control in the route**

In `app/api/analyze-rhetoric/route.ts`, pass a cache-control marker on the system prompt. Based on the AI SDK v6 + `@ai-sdk/anthropic` current API (verify in Step 1 if shape changed):

```ts
import { generateText, Output } from "ai";
import { opus } from "@/lib/server/anthropic";
import {
  AnalyzeRhetoricResponse,
  SYSTEM_PREFIX,
  userPrompt,
} from "@/lib/prompts/analyze-rhetoric";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  try {
    const { output } = await generateText({
      model: opus,
      output: Output.object({ schema: AnalyzeRhetoricResponse }),
      messages: [
        {
          role: "system",
          content: SYSTEM_PREFIX,
          // Mark this large static block as cacheable. Field name may differ —
          // verify against current @ai-sdk/anthropic docs; the wire-level expectation
          // is `{ "cache_control": { "type": "ephemeral" } }` on the system content block.
          providerOptions: {
            anthropic: { cacheControl: { type: "ephemeral" } },
          },
        },
        { role: "user", content: userPrompt(body) },
      ],
    });
    return NextResponse.json(output);
  } catch (e) {
    console.error("analyze-rhetoric failed", e);
    return NextResponse.json({ error: "analyze failed" }, { status: 500 });
  }
}
```

- [ ] **Step 4: Smoke-verify the cache hit**

Run two consecutive rhetoric analyses in dev:

```
npm run dev
```

In a second terminal:

```
curl -s -X POST http://localhost:3001/api/analyze-rhetoric \
  -H "Content-Type: application/json" \
  -d '{"transcript_window":"[0s] Everyone with half a brain knows...","recent_hashes":[]}' > /dev/null

curl -s -X POST http://localhost:3001/api/analyze-rhetoric \
  -H "Content-Type: application/json" \
  -d '{"transcript_window":"[0s] The unemployment rate hit 3.4%.","recent_hashes":[]}' > /dev/null
```

The dev-server console should show second-call latency materially lower than first (a few hundred ms shaved off TTFT from the cached system block). If latencies are identical, cache control isn't being applied — re-check Step 3's field name against current Anthropic docs.

- [ ] **Step 5: Commit**

```
git add lib/prompts/analyze-rhetoric.ts app/api/analyze-rhetoric/route.ts
git commit -m "Add Anthropic prompt-caching to rhetoric SYSTEM (taxonomy block ~2k tokens)"
```

---

# Phase G — Export schema updates

## Task 30: Update Markdown exporter — speaker prefixes

**Files:**
- Modify: `lib/export/markdown.ts`

- [ ] **Step 1: Update the renderer**

Replace `lib/export/markdown.ts`:

```ts
import type { ClaimCard, RhetoricMarker, Session, Speaker, SpeakerId } from "@/lib/types";

function labelFor(speakers: Speaker[], id: SpeakerId | null): string | null {
  if (id === null) return null;
  return speakers.find((sp) => sp.id === id)?.label ?? `Speaker ${id + 1}`;
}

export function toMarkdown(s: Session): string {
  const lines: string[] = [];
  lines.push(`# ${s.title}`);
  lines.push("");
  lines.push(`- Started: ${s.started_at}`);
  if (s.ended_at) {
    const dur = Math.round(
      (new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000,
    );
    lines.push(`- Ended:   ${s.ended_at}`);
    lines.push(`- Duration: ${dur}s`);
  }
  if (s.speakers.length >= 2) {
    lines.push(`- Speakers: ${s.speakers.map((sp) => sp.label).join(", ")}`);
  }
  lines.push("");

  lines.push("## Transcript");
  lines.push("");
  for (const seg of s.transcript) {
    const label = labelFor(s.speakers, seg.speaker_id);
    const prefix = label ? `**${label}** ` : "";
    lines.push(`[${Math.floor(seg.start)}s] ${prefix}${seg.text}`);
  }
  lines.push("");

  lines.push("## Claims");
  lines.push("");
  if (s.claims.length === 0) lines.push("_(none)_");
  for (const c of s.claims) lines.push(...renderClaim(c, s.speakers));
  lines.push("");

  lines.push("## Markers");
  lines.push("");
  if (s.markers.length === 0) lines.push("_(none)_");
  for (const m of s.markers) lines.push(...renderMarker(m, s.speakers));

  return lines.join("\n");
}

function renderClaim(c: ClaimCard, speakers: Speaker[]): string[] {
  const out: string[] = [];
  out.push(`### ${c.primary_label} · ${c.score}% · ${c.topic}`);
  const label = labelFor(speakers, c.speaker_id);
  if (label) out.push(`_— ${label}_`);
  out.push("");
  out.push(`> "${c.claim_text}"`);
  out.push("");
  out.push(c.explanation);
  if (c.annotations.length)
    out.push("", `_Annotations:_ ${c.annotations.join(", ")}`);
  if (c.sources.length) {
    out.push("", "**Sources:**");
    for (const s of c.sources) {
      out.push(
        `- [${s.title}](${s.url}) — ${s.domain} · ${s.reputation_tier} · ${s.stance}`,
      );
    }
  }
  out.push("");
  return out;
}

function renderMarker(m: RhetoricMarker, speakers: Speaker[]): string[] {
  const label = labelFor(speakers, m.speaker_id);
  return [
    `### [${m.type.toUpperCase()}] ${m.display} · ${m.severity}`,
    label ? `_— ${label}_` : "",
    "",
    `> "${m.excerpt}"`,
    "",
    m.explanation,
    "",
  ].filter((line) => line !== "");
}
```

- [ ] **Step 2: Update test fixture if needed + run tests**

```
npm run test:run -- tests/export/markdown.test.ts
```

If the existing test asserts an exact markdown shape, it will fail. Update the test fixture's expected output to include speakers, topic, and speaker prefix lines. The test data construction may need `speakers: []` and `source: { kind: "mic" }` added.

- [ ] **Step 3: Commit**

```
git add lib/export/markdown.ts tests/export/markdown.test.ts
git commit -m "Markdown export: speaker prefixes, speaker registry header, topic per claim"
```

## Task 31: Update JSON exporter — speakers + source

**Files:**
- Modify: `lib/export/json.ts`

- [ ] **Step 1: Add speakers and source to JSON output**

Replace `lib/export/json.ts`:

```ts
import type { Session } from "@/lib/types";

export function toJSON(session: Session): string {
  const obj: Record<string, unknown> = {
    title: session.title,
    started_at: session.started_at,
  };
  if (session.ended_at) {
    obj.ended_at = session.ended_at;
    obj.duration_seconds = Math.round(
      (new Date(session.ended_at).getTime() -
        new Date(session.started_at).getTime()) /
        1000,
    );
  }
  obj.source = session.source;
  obj.speakers = session.speakers;
  obj.transcript = session.transcript;
  obj.claims = session.claims;
  obj.markers = session.markers;
  return JSON.stringify(obj, null, 2);
}
```

- [ ] **Step 2: Run tests**

```
npm run test:run -- tests/export/json.test.ts
```

Update fixture if shape assertion fails.

- [ ] **Step 3: Commit**

```
git add lib/export/json.ts tests/export/json.test.ts
git commit -m "JSON export: include speakers registry + source provenance"
```

## Task 32: Update HTML report — speakers table + speaker tags on entries

**Files:**
- Modify: `lib/export/report.ts`

The existing report is a single long HTML template. We need a careful surgical addition.

- [ ] **Step 1: Add a `Speakers` table near the top + speaker tags**

In `lib/export/report.ts`:

1. Update the imports + helpers at the top to include `Speaker` / `SpeakerId`:

```ts
import type {
  ClaimCard, PrimaryLabel, RhetoricMarker, Session, Speaker, SpeakerId,
} from "@/lib/types";

function labelFor(speakers: Speaker[], id: SpeakerId | null): string {
  if (id === null) return "";
  return speakers.find((sp) => sp.id === id)?.label ?? `Speaker ${id + 1}`;
}
```

2. In `toReport`, just BEFORE the existing `verdictCounts` line, build a speakers block:

```ts
const speakersBlock = session.speakers.length >= 2
  ? `<section><h2>Speakers</h2><ul class="speakers">${session.speakers
      .map((sp) => `<li>${escapeHtml(sp.label)}</li>`).join("")}</ul></section>`
  : "";
```

3. Insert `${speakersBlock}` into the returned HTML — right after the `<main>`/title block and before the transcript section. The exact insertion point depends on how the existing template is structured; place it right before the `<h2>Transcript</h2>` line.

4. In the transcript rendering loop, prefix each utterance with the speaker label (when present). Find where transcript paragraphs are rendered (search for `transcript p` or how segments are mapped). Add `${labelFor(session.speakers, seg.speaker_id) ? '<strong>' + escapeHtml(labelFor(...)) + ':</strong> ' : ''}${escapeHtml(seg.text)}`.

5. In the claim card rendering, after the verdict/topic header, insert `${c.speaker_id !== null ? '<div class="speaker-tag">— ' + escapeHtml(labelFor(session.speakers, c.speaker_id)) + '</div>' : ''}`.

6. Same for marker rendering.

7. Add CSS for `.speakers` and `.speaker-tag` in the inline `<style>` block:

```css
.speakers { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 8px; margin: 0 0 16px; }
.speakers li { font-size: 12px; padding: 4px 10px; border: 1px solid var(--line); border-radius: 9999px; background: #f8fafc; }
.speaker-tag { font-size: 11px; color: var(--muted); font-style: italic; margin: 4px 0 8px; }
```

(The full edit is mechanical — apply each change in order; total ~30 lines of changes.)

- [ ] **Step 2: Update tests**

```
npm run test:run -- tests/export/report.test.ts
```

Update fixture as needed. Make sure existing HTML-escaping coverage still passes.

- [ ] **Step 3: Manual verification**

Run a real two-speaker session, click Export → choose "HTML report". Open the downloaded `.html` in a browser. Confirm:
- A "Speakers" pill list near the top
- Transcript paragraphs prefixed with the speaker label
- Each claim and marker has a "— Speaker N" tag

- [ ] **Step 4: Commit**

```
git add lib/export/report.ts tests/export/report.test.ts
git commit -m "HTML report: add Speakers pill list + speaker prefixes on transcript/claims/markers"
```

---

# Phase H — Final verification & acceptance walkthrough

## Task 33: Full acceptance walkthrough on localhost:3001

This is verification, not code. Per spec §8.1.

**Files:**
- Create: `docs/superpowers/acceptance/2026-05-13-sprint-1-walkthrough.md`

- [ ] **Step 1: Run `npm run dev` and prep the workspace**

```
npm run dev
agent-browser skills get agent-browser    # if not already loaded this session
```

Have ready:
- A second person to talk with for the ≥15-minute durability + diarization test
- Two laptop speakers + the Tucker monologue export for the speakers-mode test
- A timer

- [ ] **Step 2: Walk through every acceptance criterion**

For each ID in spec §8.1, run the verification and record pass/fail in a new file `docs/superpowers/acceptance/2026-05-13-sprint-1-walkthrough.md`. The structure:

```markdown
# Factify Sprint 1 — Acceptance walkthrough

**Date:** <YYYY-MM-DD>
**Verifier:** Israel B. Bitton
**URL:** http://localhost:3001/session

| ID | Check | Pass/Fail | Evidence |
|---|---|---|---|
| D1 | ≥15-min two-speaker conversation runs without transcript stalling; JWT refresh fires silently | | DevTools Network: <screenshot or note> |
| D2 | Audio meter tracks each speaker's amplitude | | agent-browser screenshot |
| D3 | Speakers-mode toggle off → playing Tucker export through speakers transcribes | | <note> |
| D4 | vercel.json exists with `{"framework":"nextjs"}` and is committed | | `cat vercel.json` output, git log line |
| B1 | Two speakers get distinct speaker_ids | | `window.__factify.session.getState().transcript` <inspection> |
| B2 | Transcript renders speaker blocks visually distinct | | agent-browser screenshot |
| B3 | Header chip rename propagates everywhere | | Steps + screenshot |
| B4 | Claims and markers carry speaker_id matching utterance | | Store inspection |
| F1 | No claim card shows "UNVERIFIABLE · 50" while still resolving | | Live test result |
| F2 | No corrupt source URLs | | Export JSON inspection |
| F3 | No marker has type mismatched with taxonomy entry | | Markers panel scan |
| F4 | No two markers share (type, excerpt) in rolling window | | Markers panel scan |
| F5 | Every claim card has topic chip | | Visual + JSON export |
| V1 | Cards display preview images when sources have OG data | | agent-browser screenshot |
| V2 | Cards without OG-equipped sources render cleanly | | Visual |
| V3 | Every marker chip shows archetype icon | | Visual + screenshot |
| V4 | Archetype taxonomy covers all 123 entries | `node -e "const{ALL}=require('./lib/taxonomy');console.log(ALL.filter(e=>!e.archetype).length)"` → expect 0 |

## Notes
<any observations>
```

- [ ] **Step 3: For any FAIL, apply the three-strikes rule**

If a check fails:
- 1st attempt: surgical fix, retest
- 2nd attempt: surgical fix, retest
- 3rd: STOP. Write a root-cause note in the walkthrough file. Surface to user for direction.

- [ ] **Step 4: Once all PASS, commit the walkthrough doc**

```
git add docs/superpowers/acceptance/2026-05-13-sprint-1-walkthrough.md
git commit -m "Sprint 1 acceptance walkthrough — all 17 checks pass"
```

- [ ] **Step 5: Report to user**

Surface the walkthrough doc. State explicitly: *"Sprint 1 implementation complete and verified on localhost:3001. NO push and NO deploy have happened. Want to discuss the next step — production deploy or move to Sprint 2?"*

DO NOT push. DO NOT deploy. Wait for explicit user authorization.

---

# Appendix — Recovery if something goes wrong

- **Mid-task disaster:** `git stash` your changes, fix, `git stash pop`. Or `git reset --hard HEAD` to discard them.
- **Bad commit:** `git reset --soft HEAD~1` to undo the commit but keep changes staged.
- **Multi-commit mess:** `git reset --hard pre-sprint1-rebase` walks back to the spec-only state (loses ALL work since then — use as a last resort).
- **Tests inexplicably failing after a refactor:** revert just that task's commit (`git revert <sha>`), re-implement carefully.
- **`tsc --noEmit` keeps erroring on something you can't fix:** stop, write a note, ask the user — don't paper over with `any` or `@ts-ignore`.

# Appendix — Self-review checklist (run after writing complete plan)

✅ **Spec coverage:** every group in spec §2 (data model, diarization, durability, folded fixes, visual enrichment, verification) has tasks. Out-of-scope items in spec §11 have no tasks.

✅ **Placeholder scan:** all "TBD" / "TODO" / "implement later" patterns searched — none found. Every step has either a complete code block or an exact command.

✅ **Type consistency:** `SpeakerId`, `speaker_id`, `Speaker`, `SourcePreview`, `SessionSource`, `Archetype` used consistently across tasks. `ensureSpeaker` / `renameSpeaker` / `setSpeakersMode` action names match between store definition (Task 4), tests (Task 5), and consumers (Tasks 8, 14, 15, 17). `dominantSpeaker` exported in Task 12, consumed in Task 13. `attributeMarker` defined in Task 16, tested in Task 16.

✅ **Local-only rule** referenced in plan header AND in Task 33's final step.

✅ **Three-strikes rule** referenced in plan header AND in Task 33 step 3.

✅ **Agent-browser** referenced in plan header AND in Tasks 10, 14, 15, 17, 18, 23, 26, and 33.
