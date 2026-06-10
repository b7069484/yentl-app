import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DevilAdvocateRequest,
  userPrompt,
} from "@/lib/prompts/devil-advocate";
import type { ClaimCard, SessionSource, TranscriptSegment } from "@/lib/types";

describe("devil advocate claim ownership context", () => {
  it("accepts ownership-aware claim summaries in the request schema", () => {
    const parsed = DevilAdvocateRequest.parse({
      utterances: [
        { speaker_id: 0, text: "The audit was hidden.", start: 0, end: 3 },
        { speaker_id: 1, text: "That sounds like a quote from the article.", start: 3, end: 7 },
        { speaker_id: 0, text: "The article said officials denied it.", start: 7, end: 11 },
      ],
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
          explanation: "Public records show the audit was published.",
        },
      ],
      markers: [],
    });

    expect(parsed.claims).toHaveLength(1);
    expect(parsed.claims[0].stance).toBe("reported");
    expect(parsed.claims[0].attribution_status).toBe("uncertain");
    expect(parsed.claims[0].attribution_reasons).toEqual(["quoted_or_reported_speech"]);
  });

  it("adds stance and attribution context so Grok does not treat uncertain claims as direct assertions", () => {
    const prompt = userPrompt({
      utterances: [
        { speaker_id: 0, text: "The audit was hidden.", start: 0, end: 3 },
        { speaker_id: 1, text: "That sounds like a quote from the article.", start: 3, end: 7 },
        { speaker_id: 0, text: "The article said officials denied it.", start: 7, end: 11 },
      ],
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
          explanation: "Public records show the audit was published.",
        },
      ],
      markers: [],
    });

    expect(prompt).toContain("[Unknown owner]");
    expect(prompt).toContain("topic=Law");
    expect(prompt).toContain("stance=reported");
    expect(prompt).toContain("attribution=uncertain");
    expect(prompt).toContain("quoted_or_reported_speech");
  });
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

function makeSeg(text: string, i: number): TranscriptSegment {
  return {
    text,
    start: i * 10,
    end: i * 10 + 8,
    is_final: true,
    speaker_id: i % 2,
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

function successResponse(url: string) {
  const body = url === "/api/devil-advocate"
    ? {
        stance: "A skeptic would challenge whether the false claim belongs to the current speaker.",
        strongest_counterarguments: ["one", "two", "three"],
        weakest_assumption: "The claim owner is known.",
        questions: ["Who owns the proposition?", "Was this quoted speech?"],
        confidence: "medium",
      }
    : {
        text: "Ownership-aware synthesis.",
        headlines: ["H1", "H2", "H3"],
      };

  return Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);
}

async function seedSession() {
  const { useSession } = await import("@/lib/client/session-store");
  const source: SessionSource = { kind: "text_doc", filename: "doc.txt", mime: "text/plain", byte_count: 42 };
  useSession.getState().reset();
  useSession.getState().setSource(source);
  useSession.getState().startSession("Ownership devil advocate");
  useSession.getState().appendFinal(makeSeg("The audit was hidden.", 0));
  useSession.getState().appendFinal(makeSeg("That sounds like a quote from the article.", 1));
  useSession.getState().appendFinal(makeSeg("The article said officials denied it.", 2));
  useSession.getState().addClaim(makeClaim());
}

describe("orchestrator devil advocate payload", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => successResponse(url));
  });

  it("sends claim summaries with ownership into /api/devil-advocate", async () => {
    await seedSession();

    const { runFinalSynthesis } = await import("@/lib/client/orchestrator");
    await runFinalSynthesis();

    const devilCall = mockFetch.mock.calls.find(([url]) => url === "/api/devil-advocate");
    expect(devilCall).toBeDefined();
    const body = JSON.parse(devilCall![1].body as string);

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
      explanation: "Public records show the audit was published.",
    });
  });
});
