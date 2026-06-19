import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSynthesisNow } from "@/lib/client/orchestrator";
import { useSession, type SpeakerVerdict, type SynthesisMetaRead } from "@/lib/client/session-store";
import type { TranscriptSegment } from "@/lib/types";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch as typeof fetch;

const SPEAKER_VERDICTS: SpeakerVerdict[] = [
  {
    speaker_id: 0,
    label: "Mira",
    factual_grade: "mostly_factual",
    faith_grade: "good_faith",
    one_liner: "Mira stays close to sourced claims.",
  },
  {
    speaker_id: 1,
    label: "Jon",
    factual_grade: "mixed",
    faith_grade: "bad_faith",
    one_liner: "Jon repeats a disputed frame after correction.",
  },
];

const META_READ: SynthesisMetaRead = {
  posture: "mixed",
  source_health: "thin",
  scope: "live_window",
  summary: "The prior read is mixed but still useful.",
  uncertainty: "Evidence strength is still thin.",
  key_question: "Which disputed claim has the clearest source trail?",
};

function responseJson(body: unknown): Response {
  return {
    ok: true,
    json: async () => body,
  } as Response;
}

function seedSessionWithSynthesis() {
  const segment: TranscriptSegment = {
    text: "The audit was published, but the speaker keeps calling it hidden.",
    start: 0,
    end: 6,
    is_final: true,
    speaker_id: 0,
  };

  useSession.getState().reset();
  useSession.getState().setSource({
    kind: "text_doc",
    filename: "audit.txt",
    mime: "text/plain",
    byte_count: 80,
  });
  useSession.getState().startSession("Synthesis refresh");
  useSession.getState().appendFinal(segment);
  useSession.getState().setSynthesis({
    state: "fresh",
    text: "Original Yentl Opinion.",
    headlines: ["Audit claim is disputed"],
    per_speaker_verdicts: SPEAKER_VERDICTS,
    meta_read: META_READ,
    at: Date.now(),
  });
}

describe("orchestrator synthesis state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSession.getState().reset();
  });

  it("preserves speaker verdicts while a synthesis refresh is in flight", async () => {
    let resolveResponse: (response: Response) => void = () => {};
    mockFetch.mockReturnValue(
      new Promise<Response>((resolve) => {
        resolveResponse = resolve;
      }),
    );

    seedSessionWithSynthesis();
    const running = runSynthesisNow();

    const refreshing = useSession.getState().synthesis;
    expect(refreshing?.state).toBe("refreshing");
    expect(refreshing && "per_speaker_verdicts" in refreshing
      ? refreshing.per_speaker_verdicts
      : undefined).toEqual(SPEAKER_VERDICTS);
    expect(refreshing && "meta_read" in refreshing
      ? refreshing.meta_read
      : undefined).toEqual(META_READ);

    resolveResponse(responseJson({
      text: "Updated Yentl Opinion.",
      headlines: ["Updated headline"],
      per_speaker_verdicts: SPEAKER_VERDICTS,
      meta_read: {
        ...META_READ,
        summary: "Updated read.",
      },
    }));
    await running;

    const fresh = useSession.getState().synthesis;
    expect(fresh && "meta_read" in fresh ? fresh.meta_read?.summary : undefined).toBe("Updated read.");
  });

  it("preserves speaker verdicts when a synthesis refresh fails", async () => {
    mockFetch.mockRejectedValue(new Error("offline"));

    seedSessionWithSynthesis();
    await runSynthesisNow();

    const errored = useSession.getState().synthesis;
    expect(errored?.state).toBe("error");
    expect(errored && "per_speaker_verdicts" in errored
      ? errored.per_speaker_verdicts
      : undefined).toEqual(SPEAKER_VERDICTS);
    expect(errored && "meta_read" in errored
      ? errored.meta_read
      : undefined).toEqual(META_READ);
    expect(errored && "text" in errored ? errored.text : undefined).toBe("Original Yentl Opinion.");
  });

  it("omits absent document anchors from synthesis payloads instead of sending null", async () => {
    mockFetch.mockResolvedValue(responseJson({
      text: "Updated Yentl Opinion.",
      headlines: ["Updated headline"],
      per_speaker_verdicts: SPEAKER_VERDICTS,
      meta_read: META_READ,
    }));

    seedSessionWithSynthesis();
    await runSynthesisNow();

    const body = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
    expect(body.utterances[0]).not.toHaveProperty("anchor");
  });
});
