import { describe, expect, it, beforeEach } from "vitest";
import { useSession } from "@/lib/client/session-store";
import type { SpeakerVerdict, SynthesisState } from "@/lib/client/session-store";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const SPEAKER_VERDICTS: SpeakerVerdict[] = [
  {
    speaker_id: 0,
    label: "Speaker 1",
    factual_grade: "mostly_factual",
    faith_grade: "good_faith",
    one_liner: "Largely accurate and straightforward.",
  },
  {
    speaker_id: 1,
    label: "Speaker 2",
    factual_grade: "mixed",
    faith_grade: "bad_faith",
    one_liner: "Several misleading claims detected.",
  },
];

const FRESH_SYNTHESIS: SynthesisState = {
  state: "fresh",
  text: "This 90-minute podcast covered three main claims. Speaker 1 was largely factual; Speaker 2 made several misleading assertions.",
  headlines: ["Speaker 1 was mostly truthful", "Speaker 2 overstated statistics", "No major fallacies detected"],
  per_speaker_verdicts: SPEAKER_VERDICTS,
  at: 1_716_000_000_000,
};

const REFRESHING_SYNTHESIS: SynthesisState = {
  state: "refreshing",
  text: "Refreshed analysis pending. Previous: mostly accurate conversation.",
  headlines: ["Prior analysis: good faith debate"],
  per_speaker_verdicts: SPEAKER_VERDICTS,
  at: 1_716_000_001_000,
};

const WARMING_SYNTHESIS: SynthesisState = {
  state: "warming",
  at: 1_716_000_002_000,
};

const ERROR_SYNTHESIS: SynthesisState = {
  state: "error",
  at: 1_716_000_003_000,
  lastError: "Rate limit exceeded",
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function seedStore(synthesis: SynthesisState) {
  useSession.getState().reset();
  useSession.getState().setSynthesis(synthesis);
}

// ─── toSession() synthesis persistence ────────────────────────────────────────

describe("toSession() — synthesis persistence", () => {
  beforeEach(() => {
    useSession.getState().reset();
  });

  it("includes synthesis when state is 'fresh'", () => {
    seedStore(FRESH_SYNTHESIS);
    const session = useSession.getState().toSession();

    expect(session.synthesis).toBeDefined();
    expect(session.synthesis!.text).toBe(FRESH_SYNTHESIS.text);
    expect(session.synthesis!.headlines).toEqual(FRESH_SYNTHESIS.headlines);
    expect(session.synthesis!.per_speaker_verdicts).toEqual(SPEAKER_VERDICTS);
    expect(session.synthesis!.at).toBe(FRESH_SYNTHESIS.at);
  });

  it("includes synthesis when state is 'refreshing' (has valid text)", () => {
    seedStore(REFRESHING_SYNTHESIS);
    const session = useSession.getState().toSession();

    expect(session.synthesis).toBeDefined();
    expect(session.synthesis!.text).toBe(REFRESHING_SYNTHESIS.text);
    expect(session.synthesis!.headlines).toEqual(REFRESHING_SYNTHESIS.headlines);
    expect(session.synthesis!.per_speaker_verdicts).toEqual(SPEAKER_VERDICTS);
    expect(session.synthesis!.at).toBe(REFRESHING_SYNTHESIS.at);
  });

  it("does NOT include synthesis when state is 'warming'", () => {
    seedStore(WARMING_SYNTHESIS);
    const session = useSession.getState().toSession();
    expect(session.synthesis).toBeUndefined();
  });

  it("does NOT include synthesis when state is 'error'", () => {
    seedStore(ERROR_SYNTHESIS);
    const session = useSession.getState().toSession();
    expect(session.synthesis).toBeUndefined();
  });

  it("does NOT include synthesis when synthesis is null", () => {
    seedStore(null);
    const session = useSession.getState().toSession();
    expect(session.synthesis).toBeUndefined();
  });

  it("persisted synthesis has no 'state' field (PersistedSynthesis shape)", () => {
    seedStore(FRESH_SYNTHESIS);
    const session = useSession.getState().toSession();
    expect(session.synthesis).toBeDefined();
    // PersistedSynthesis must not carry the discriminant 'state' field
    expect((session.synthesis as Record<string, unknown>)["state"]).toBeUndefined();
  });
});

// ─── restoreSession() synthesis rehydration ────────────────────────────────────

describe("restoreSession() — synthesis rehydration", () => {
  beforeEach(() => {
    useSession.getState().reset();
  });

  it("populates synthesis as 'fresh' when session.synthesis is present", () => {
    // Build a session that carries saved synthesis
    seedStore(FRESH_SYNTHESIS);
    const saved = useSession.getState().toSession();

    // Reset and restore
    useSession.getState().reset();
    useSession.getState().restoreSession(saved);

    const restored = useSession.getState().synthesis;
    expect(restored).not.toBeNull();
    expect(restored!.state).toBe("fresh");
    if (restored?.state === "fresh") {
      expect(restored.text).toBe(FRESH_SYNTHESIS.text);
      expect(restored.headlines).toEqual(FRESH_SYNTHESIS.headlines);
      expect(restored.per_speaker_verdicts).toEqual(SPEAKER_VERDICTS);
      expect(restored.at).toBe(FRESH_SYNTHESIS.at);
    }
  });

  it("downgrades 'refreshing' to 'fresh' on restore", () => {
    // A 'refreshing' synthesis saves with valid text
    seedStore(REFRESHING_SYNTHESIS);
    const saved = useSession.getState().toSession();

    useSession.getState().reset();
    useSession.getState().restoreSession(saved);

    const restored = useSession.getState().synthesis;
    expect(restored).not.toBeNull();
    // Must be downgraded — 'refreshing' implies a live job we don't have
    expect(restored!.state).toBe("fresh");
    if (restored?.state === "fresh") {
      expect(restored.text).toBe(REFRESHING_SYNTHESIS.text);
      expect(restored.at).toBe(REFRESHING_SYNTHESIS.at);
    }
  });

  it("leaves synthesis null when session has no saved synthesis", () => {
    seedStore(WARMING_SYNTHESIS);
    const saved = useSession.getState().toSession();

    // Verify warming was not persisted
    expect(saved.synthesis).toBeUndefined();

    useSession.getState().reset();
    useSession.getState().restoreSession(saved);

    expect(useSession.getState().synthesis).toBeNull();
  });

  it("leaves synthesis null when session.synthesis is absent (error state not persisted)", () => {
    seedStore(ERROR_SYNTHESIS);
    const saved = useSession.getState().toSession();

    expect(saved.synthesis).toBeUndefined();

    useSession.getState().reset();
    useSession.getState().restoreSession(saved);

    expect(useSession.getState().synthesis).toBeNull();
  });

  it("round-trips per_speaker_verdicts faithfully", () => {
    seedStore(FRESH_SYNTHESIS);
    const saved = useSession.getState().toSession();

    useSession.getState().reset();
    useSession.getState().restoreSession(saved);

    const restored = useSession.getState().synthesis;
    if (restored?.state === "fresh") {
      expect(restored.per_speaker_verdicts).toHaveLength(SPEAKER_VERDICTS.length);
      expect(restored.per_speaker_verdicts![0].factual_grade).toBe("mostly_factual");
      expect(restored.per_speaker_verdicts![1].faith_grade).toBe("bad_faith");
    } else {
      throw new Error(`Expected 'fresh' state, got: ${restored?.state}`);
    }
  });

  it("works when synthesis has no per_speaker_verdicts", () => {
    const noVerdicts: SynthesisState = {
      state: "fresh",
      text: "Summary without per-speaker breakdown.",
      headlines: ["Headline A"],
      at: 1_716_000_005_000,
      // no per_speaker_verdicts
    };
    seedStore(noVerdicts);
    const saved = useSession.getState().toSession();

    useSession.getState().reset();
    useSession.getState().restoreSession(saved);

    const restored = useSession.getState().synthesis;
    expect(restored).not.toBeNull();
    expect(restored!.state).toBe("fresh");
    if (restored?.state === "fresh") {
      expect(restored.per_speaker_verdicts).toBeUndefined();
    }
  });
});
