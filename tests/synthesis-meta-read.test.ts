import { describe, expect, it } from "vitest";
import { SynthesizeRequest, type SpeakerVerdict, type SynthesisMetaRead } from "@/lib/prompts/synthesize";
import {
  assessSynthesisMetaReadQuality,
  buildSynthesisMetaRead,
  sanitizeSynthesisMetaRead,
} from "@/lib/synthesis-meta-read";

function request(overrides: Partial<Parameters<typeof SynthesizeRequest.parse>[0]> = {}) {
  return SynthesizeRequest.parse({
    utterances: [{ speaker_id: 0, text: "The audit was published.", start: 0, end: 3 }],
    counters: { claims: 0, false: 0, partial: 0, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
    speakers: [{ id: 0, label: "Speaker" }],
    claims: [],
    source_context: "",
    ...overrides,
  });
}

function claim(text: string, verdict: string, overrides = {}) {
  return {
    text,
    verdict,
    score: 90,
    speaker_id: 0,
    topic: "Law",
    stance: "asserted",
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    ...overrides,
  };
}

const GOOD_VERDICT: SpeakerVerdict = {
  speaker_id: 0,
  label: "Speaker",
  factual_grade: "mostly_factual",
  faith_grade: "good_faith",
  one_liner: "Claims stay close to the record.",
};

describe("synthesis meta-read scoring", () => {
  it("keeps thin live windows insufficient when claims and source context are missing", () => {
    const metaRead = buildSynthesisMetaRead(request(), []);

    expect(metaRead).toMatchObject({
      posture: "insufficient",
      source_health: "unknown",
      scope: "live_window",
    });
    expect(metaRead.uncertainty).toContain("source context is thin");
  });

  it("allows a strong full-session good-faith read only with clean claims and source context", () => {
    const metaRead = buildSynthesisMetaRead(
      request({
        counters: { claims: 2, false: 0, partial: 0, true: 2, fallacy: 0, bias: 0, rhetoric: 0 },
        claims: [
          claim("The audit was published.", "TRUE"),
          claim("The release log was posted.", "MOSTLY_TRUE"),
        ],
        source_context: "source: public audit archive\nsource: release log",
        analysis_scope: { mode: "full_session", total_utterances: 2, included_utterances: 2 },
      }),
      [GOOD_VERDICT],
    );

    expect(metaRead).toMatchObject({
      posture: "good_faith",
      source_health: "strong",
      scope: "full_session",
    });
    expect(metaRead.summary).toContain("full session");
  });

  it("does not count quoted or reported claims as clean owned claims", () => {
    const metaRead = buildSynthesisMetaRead(
      request({
        counters: { claims: 2, false: 1, partial: 1, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
        claims: [
          claim("The file vanished.", "FALSE", { stance: "quoted", attribution_status: "quote_or_clip" }),
          claim("The release date was questioned.", "PARTIAL", { stance: "reported", attribution_status: "uncertain" }),
        ],
      }),
      [],
    );

    expect(metaRead).toMatchObject({
      posture: "insufficient",
      source_health: "unknown",
    });
    expect(metaRead.uncertainty).toContain("2 claims have uncertain ownership or stance");
  });

  it("downgrades overconfident posture and source health from model output when evidence is thin", () => {
    const sanitized = sanitizeSynthesisMetaRead(
      {
        posture: "good_faith",
        source_health: "strong",
        scope: "full_session",
        summary: "",
        uncertainty: "",
        key_question: "",
      } satisfies SynthesisMetaRead,
      request({ analysis_scope: { mode: "live_window", total_utterances: 1, included_utterances: 1 } }),
    );

    expect(sanitized).toMatchObject({
      posture: "insufficient",
      source_health: "unknown",
      scope: "live_window",
    });
    expect(sanitized.summary.length).toBeGreaterThan(0);
    expect(sanitized.uncertainty.length).toBeGreaterThan(0);
    expect(sanitized.key_question.length).toBeGreaterThan(0);
  });

  it("reports meta-read quality mismatches before sanitization", () => {
    const input = request({
      analysis_scope: { mode: "live_window", total_utterances: 1, included_utterances: 1 },
    });
    const assessment = assessSynthesisMetaReadQuality(
      {
        posture: "good_faith",
        source_health: "strong",
        scope: "full_session",
        summary: "The conversation is well supported.",
        uncertainty: "Later details could change the read.",
        key_question: "Which source confirms it?",
      },
      input,
    );

    expect(assessment.ok).toBe(false);
    expect(assessment.score).toBeLessThan(100);
    expect(assessment.mismatches.map((mismatch) => mismatch.field)).toEqual(
      expect.arrayContaining(["posture", "source_health", "scope", "uncertainty"]),
    );
    expect(assessment.expected).toMatchObject({
      posture: "insufficient",
      source_health: "unknown",
      scope: "live_window",
    });
  });

  it("passes quality assessment after sanitization", () => {
    const input = request({
      analysis_scope: { mode: "live_window", total_utterances: 1, included_utterances: 1 },
    });
    const sanitized = sanitizeSynthesisMetaRead(
      {
        posture: "good_faith",
        source_health: "strong",
        scope: "full_session",
        summary: "",
        uncertainty: "",
        key_question: "",
      } satisfies SynthesisMetaRead,
      input,
    );

    const assessment = assessSynthesisMetaReadQuality(sanitized, input);

    expect(assessment.ok).toBe(true);
    expect(assessment.score).toBe(100);
    expect(assessment.mismatches).toEqual([]);
  });
});
