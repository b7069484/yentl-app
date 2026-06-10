import { describe, expect, it, vi, beforeEach } from "vitest";
import { SynthesizeRequest, userPrompt } from "@/lib/prompts/synthesize";
import type { ClaimCard, SessionSource, TranscriptSegment } from "@/lib/types";

describe("synthesis claim ownership context", () => {
  it("accepts ownership-aware claim summaries in the request schema", () => {
    const parsed = SynthesizeRequest.parse({
      utterances: [{
        speaker_id: 0,
        text: "The audit was hidden.",
        start: 0,
        end: 3,
        source_audio_kind: "text_import",
        anchor: "Paragraph 2",
      }],
      counters: { claims: 1, false: 1, partial: 0, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
      speakers: [{ id: 0, label: "Mira" }],
      claims: [
        {
          text: "The audit was hidden.",
          verdict: "FALSE",
          score: 82,
          speaker_id: 0,
          topic: "Law",
          stance: "reported",
          attribution_status: "uncertain",
          attribution_reasons: ["quoted_or_reported_speech"],
        },
      ],
      source_context: "source type: text_doc\nfilename: audit.txt",
    });

    expect(parsed.claims).toHaveLength(1);
    expect(parsed.claims[0].stance).toBe("reported");
    expect(parsed.claims[0].attribution_status).toBe("uncertain");
    expect(parsed.source_context).toContain("audit.txt");
    expect(parsed.utterances[0].anchor).toBe("Paragraph 2");
  });

  it("adds a CLAIMS section so synthesis can judge by ownership, not counters only", () => {
    const prompt = userPrompt({
      utterances: [{
        speaker_id: 0,
        text: "The audit was hidden.",
        start: 0,
        end: 3,
        source_audio_kind: "text_import",
        anchor: "Paragraph 2",
      }],
      counters: { claims: 1, false: 1, partial: 0, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
      speakers: [{ id: 0, label: "Mira" }],
      claims: [
        {
          text: "The audit was hidden.",
          verdict: "FALSE",
          score: 82,
          speaker_id: null,
          topic: "Law",
          stance: "reported",
          attribution_status: "uncertain",
          attribution_reasons: ["quoted_or_reported_speech"],
        },
      ],
      source_context: "source type: text_doc\ndocument overview: city audit article",
    });

    expect(prompt).toContain("SOURCE_CONTEXT:");
    expect(prompt).toContain("document overview: city audit article");
    expect(prompt).toContain("[Paragraph 2] [source=text_import] [Mira]");
    expect(prompt).toContain("CLAIMS:");
    expect(prompt).toContain("[Unknown owner]");
    expect(prompt).toContain("stance=reported");
    expect(prompt).toContain("attribution=uncertain");
    expect(prompt).toContain("quoted_or_reported_speech");
  });
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function successResponse() {
  return Promise.resolve({
    ok: true,
    json: async () => ({
      text: "Ownership-aware synthesis.",
      headlines: ["H1", "H2", "H3"],
    }),
  } as Response);
}

function makeSeg(text: string, i: number): TranscriptSegment {
  return {
    text,
    start: i * 10,
    end: i * 10 + 8,
    is_final: true,
    speaker_id: 0,
    source_audio_kind: "text_import",
    document_anchor: {
      kind: "paragraph",
      block_index: i,
      paragraph_index: i,
      line_start: i + 1,
      line_end: i + 1,
    },
  };
}

function makeClaim(): ClaimCard {
  return {
    id: "claim-1",
    claim_text: "The audit was hidden.",
    utterance_start: 0,
    utterance_end: 3,
    speaker_id: null,
    topic: "Law",
    topic_secondary: null,
    primary_label: "FALSE",
    score: 82,
    annotations: [],
    explanation: "Public records show the audit was published.",
    status: "confirmed",
    sources: [],
    stance: "reported",
    ownership: {
      owner_speaker_id: null,
      attribution_status: "uncertain",
      attribution_reasons: ["quoted_or_reported_speech"],
      stance: "reported",
      confidence: 0.38,
      source_turn_ids: ["turn-1"],
      source_segment_ids: ["seg-1"],
    },
  };
}

async function seedSession() {
  const { useSession } = await import("@/lib/client/session-store");
  const source: SessionSource = {
    kind: "text_doc",
    filename: "doc.txt",
    mime: "text/plain",
    byte_count: 42,
    initial_text: "The audit story opens with a city claim.\n\nThe second block adds public-record context.",
  };
  useSession.getState().reset();
  useSession.getState().setSource(source);
  useSession.getState().startSession("Ownership synthesis");
  useSession.getState().appendFinal(makeSeg("The audit was hidden.", 0));
  useSession.getState().addClaim(makeClaim());
}

describe("orchestrator synthesis payload", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockReturnValue(successResponse());
  });

  it("sends claim summaries with ownership into /api/synthesize", async () => {
    await seedSession();

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const synthesisCall = mockFetch.mock.calls.find(([url]) => url === "/api/synthesize");
    expect(synthesisCall).toBeDefined();
    const body = JSON.parse(synthesisCall![1].body as string);

    expect(body.claims).toHaveLength(1);
    expect(body.claims[0]).toMatchObject({
      text: "The audit was hidden.",
      verdict: "FALSE",
      score: 82,
      speaker_id: null,
      topic: "Law",
      stance: "reported",
      attribution_status: "uncertain",
      attribution_reasons: ["quoted_or_reported_speech"],
    });
    expect(body.source_context).toContain("document overview");
    expect(body.source_context).toContain("doc.txt");
    expect(body.utterances[0]).toMatchObject({
      source_audio_kind: "text_import",
      anchor: "Paragraph 1",
    });
  });
});
