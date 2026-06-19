import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  VerifyClaimContext,
  userPrompt as provisionalUserPrompt,
} from "@/lib/prompts/verify-provisional";
import { userPrompt as confirmedUserPrompt } from "@/lib/prompts/verify-confirmed";
import type { SessionSource, TranscriptSegment } from "@/lib/types";

describe("verification claim ownership context", () => {
  it("accepts stance and attribution context for verification prompts", () => {
    const parsed = VerifyClaimContext.parse({
      speaker_id: null,
      topic: "Law",
      stance: "reported",
      attribution_status: "uncertain",
      attribution_reasons: ["quoted_or_reported_speech"],
    });

    expect(parsed.stance).toBe("reported");
    expect(parsed.attribution_status).toBe("uncertain");
    expect(parsed.attribution_reasons).toEqual(["quoted_or_reported_speech"]);
  });

  it("adds ownership context to provisional verification without treating it as evidence", () => {
    const prompt = provisionalUserPrompt({
      claim_text: "The audit was hidden.",
      source_context: "A pasted article about a city audit.",
      claim_context: {
        speaker_id: null,
        topic: "Law",
        stance: "reported",
        attribution_status: "uncertain",
        attribution_reasons: ["quoted_or_reported_speech"],
      },
    });

    expect(prompt).toContain("CLAIM_CONTEXT");
    expect(prompt).toContain("[Unknown owner]");
    expect(prompt).toContain("topic=Law");
    expect(prompt).toContain("stance=reported");
    expect(prompt).toContain("attribution=uncertain");
    expect(prompt).toContain("quoted_or_reported_speech");
    expect(prompt).toContain("not evidence");
  });

  it("adds ownership context to confirmed verification before web search", () => {
    const prompt = confirmedUserPrompt({
      claim_text: "The audit was hidden.",
      claim_context: {
        speaker_id: 1,
        topic: "Law",
        stance: "denied",
        attribution_status: "probable",
        attribution_reasons: ["explicit_denial"],
      },
    });

    expect(prompt).toContain("[Speaker 2]");
    expect(prompt).toContain("stance=denied");
    expect(prompt).toContain("attribution=probable");
    expect(prompt).toContain("explicit_denial");
  });
});

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const claimOwnership = {
  owner_speaker_id: null,
  attribution_status: "uncertain" as const,
  attribution_reasons: ["quoted_or_reported_speech" as const],
  stance: "reported" as const,
  confidence: 0.38,
  source_turn_ids: ["turn-1"],
  source_segment_ids: ["seg-1"],
};

function makeSegment(): TranscriptSegment {
  return {
    id: "seg-1",
    text: "The article said the audit was hidden.",
    start: 0,
    end: 6,
    is_final: true,
    speaker_id: 0,
    turn_id: "turn-1",
    attribution_status: "uncertain",
    attribution_reasons: ["quoted_or_reported_speech"],
    source_audio_kind: "text_import",
    document_anchor: {
      kind: "speaker_turn",
      block_index: 0,
      line_start: 1,
      line_end: 1,
      speaker_label: "David",
      char_start: 0,
      char_end: "The article said the audit was hidden.".length,
      quote_text: "The article said the audit was hidden.",
    },
  };
}

function successResponse(url: string) {
  const body = url === "/api/extract-claims"
    ? {
        claims: [
          {
            claim_text: "The audit was hidden.",
            utterance_start: 0,
            utterance_end: 6,
            topic: "Law",
            topic_secondary: null,
            stance: "reported",
            ownership: claimOwnership,
          },
        ],
      }
    : url === "/api/verify-confirmed"
    ? {
        primary_label: "FALSE",
        score: 85,
        annotations: ["published record"],
        explanation: "Confirmed public records contradict the claim.",
        sources: [],
      }
    : {
        primary_label: "UNVERIFIABLE",
        score: 45,
        annotations: ["needs source"],
        explanation: "The claim needs source-backed verification.",
      };

  return Promise.resolve({
    ok: true,
    json: async () => body,
  } as Response);
}

async function seedSession() {
  const { useSession } = await import("@/lib/client/session-store");
  const source: SessionSource = {
    kind: "text_doc",
    filename: "audit.pdf",
    mime: "application/pdf",
    byte_count: 42,
    initial_text: "David: The article said the audit was hidden.\n\nMira: The source later corrected it.",
    document_meta: {
      extraction_kind: "pdf_text_layer",
      page_count: 2,
      outline: [
        {
          kind: "heading",
          label: "Audit timeline",
          preview: "The first section describes publication and later correction.",
          line_start: 1,
        },
      ],
    },
  };
  useSession.getState().reset();
  useSession.getState().setSource(source);
  useSession.getState().startSession("Verification ownership");
}

describe("orchestrator verification payload", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockFetch.mockImplementation((url: string) => successResponse(url));
  });

  it("sends claim ownership context to both verification endpoints", async () => {
    await seedSession();

    const { onFinalUtterance } = await import("@/lib/client/orchestrator");
    const { useSession } = await import("@/lib/client/session-store");
    const segment = makeSegment();
    useSession.getState().appendFinal(segment);
    await onFinalUtterance(segment);

    const extractCall = mockFetch.mock.calls.find(([url]) => url === "/api/extract-claims");
    const provisionalCall = mockFetch.mock.calls.find(([url]) => url === "/api/verify-provisional");
    const confirmedCall = mockFetch.mock.calls.find(([url]) => url === "/api/verify-confirmed");

    expect(extractCall).toBeDefined();
    expect(provisionalCall).toBeDefined();
    expect(confirmedCall).toBeDefined();

    const extractBody = JSON.parse(extractCall![1].body as string);
    const provisionalBody = JSON.parse(provisionalCall![1].body as string);
    const confirmedBody = JSON.parse(confirmedCall![1].body as string);

    expect(extractBody.document_anchor).toMatchObject({
      kind: "speaker_turn",
      block_index: 0,
      speaker_label: "David",
    });
    expect(extractBody.context).toContain("CURRENT_DOCUMENT_POSITION");
    expect(extractBody.context).toContain("document overview");
    expect(extractBody.context).toContain("document extraction: pdf_text_layer");
    expect(extractBody.context).toContain("document pages: 2");
    expect(extractBody.context).toContain("document outline");
    expect(extractBody.context).toContain("Audit timeline");
    expect(extractBody.context).toContain("[Turn 1 (David)] [text_import] [Speaker 0]");
    expect(useSession.getState().claims[0].document_anchor).toMatchObject({
      kind: "speaker_turn",
      block_index: 0,
      speaker_label: "David",
      char_start: 0,
      char_end: "The article said the audit was hidden.".length,
      quote_text: "The article said the audit was hidden.",
    });

    expect(provisionalBody.claim_context).toMatchObject({
      speaker_id: null,
      topic: "Law",
      stance: "reported",
      attribution_status: "uncertain",
      attribution_reasons: ["quoted_or_reported_speech"],
    });
    expect(confirmedBody.claim_context).toEqual(provisionalBody.claim_context);
  });

  it("does not include future bulk-import transcript lines in claim extraction context", async () => {
    const { onFinalUtterance } = await import("@/lib/client/orchestrator");
    const { useSession } = await import("@/lib/client/session-store");

    useSession.getState().reset();
    useSession.getState().setSource({
      kind: "youtube",
      video_id: "fixture-video",
      url: "https://www.youtube.com/watch?v=fixture-video",
      title: "Fixture video",
      channel: "Fixture channel",
    });
    useSession.getState().startSession("YouTube bulk context");

    const prior: TranscriptSegment = {
      text: "Earlier context should stay available.",
      start: 8,
      end: 9,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "youtube_caption",
    };
    const current: TranscriptSegment = {
      text: "The speaker says the budget doubled.",
      start: 10,
      end: 12,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "youtube_caption",
    };
    const future: TranscriptSegment = {
      text: "Future caption should not be sent as prior context.",
      start: 600,
      end: 603,
      is_final: true,
      speaker_id: 0,
      source_audio_kind: "youtube_caption",
    };

    useSession.getState().appendFinal(prior);
    useSession.getState().appendFinal(current);
    useSession.getState().appendFinal(future);

    await onFinalUtterance(current);

    const extractCall = mockFetch.mock.calls.find(([url]) => url === "/api/extract-claims");
    expect(extractCall).toBeDefined();
    const extractBody = JSON.parse(extractCall![1].body as string);
    expect(extractBody.context).toContain("Earlier context should stay available.");
    expect(extractBody.context).toContain("The speaker says the budget doubled.");
    expect(extractBody.context).not.toContain("Future caption should not be sent");
  });
});
