import { describe, it, expect, vi, beforeEach } from "vitest";
import { SynthesizeResponse } from "@/lib/prompts/synthesize";

// ---------------------------------------------------------------------------
// Schema tests (no mocking needed)
// ---------------------------------------------------------------------------

describe("SynthesizeResponse schema", () => {
  it("accepts valid payload with exactly 3 headlines", () => {
    const parsed = SynthesizeResponse.parse({
      text: "A short paragraph.",
      headlines: ["Headline one", "Headline two", "Headline three"],
    });
    expect(parsed.headlines).toHaveLength(3);
    expect(parsed.text).toBe("A short paragraph.");
  });

  it("rejects payload with fewer than 3 headlines", () => {
    expect(() =>
      SynthesizeResponse.parse({
        text: "A paragraph.",
        headlines: ["H1", "H2"],
      }),
    ).toThrow();
  });

  it("rejects payload with more than 3 headlines", () => {
    expect(() =>
      SynthesizeResponse.parse({
        text: "A paragraph.",
        headlines: ["H1", "H2", "H3", "H4"],
      }),
    ).toThrow();
  });

  it("rejects payload missing text", () => {
    expect(() =>
      SynthesizeResponse.parse({
        headlines: ["H1", "H2", "H3"],
      }),
    ).toThrow();
  });

  it("rejects payload missing headlines", () => {
    expect(() =>
      SynthesizeResponse.parse({
        text: "A paragraph.",
      }),
    ).toThrow();
  });

  it("accepts valid payload with per_speaker_verdicts", () => {
    const parsed = SynthesizeResponse.parse({
      text: "A paragraph.",
      headlines: ["H1", "H2", "H3"],
      per_speaker_verdicts: [
        {
          speaker_id: 0,
          label: "Alice",
          factual_grade: "mostly_factual",
          faith_grade: "good_faith",
          one_liner: "Alice made well-sourced, accurate claims throughout.",
        },
        {
          speaker_id: 1,
          label: "Bob",
          factual_grade: "mostly_inaccurate",
          faith_grade: "bad_faith",
          one_liner: "Bob repeatedly used fallacies and misleading statistics.",
        },
      ],
    });
    expect(parsed.per_speaker_verdicts).toHaveLength(2);
    expect(parsed.per_speaker_verdicts![0].factual_grade).toBe("mostly_factual");
    expect(parsed.per_speaker_verdicts![1].faith_grade).toBe("bad_faith");
  });

  it("accepts valid payload without per_speaker_verdicts (optional)", () => {
    const parsed = SynthesizeResponse.parse({
      text: "A paragraph.",
      headlines: ["H1", "H2", "H3"],
    });
    expect(parsed.per_speaker_verdicts).toBeUndefined();
  });

  it("rejects per_speaker_verdicts entry with invalid factual_grade", () => {
    expect(() =>
      SynthesizeResponse.parse({
        text: "A paragraph.",
        headlines: ["H1", "H2", "H3"],
        per_speaker_verdicts: [
          {
            speaker_id: 0,
            label: "Alice",
            factual_grade: "perfect",   // invalid
            faith_grade: "good_faith",
            one_liner: "Short.",
          },
        ],
      }),
    ).toThrow();
  });

  it("rejects per_speaker_verdicts entry with invalid faith_grade", () => {
    expect(() =>
      SynthesizeResponse.parse({
        text: "A paragraph.",
        headlines: ["H1", "H2", "H3"],
        per_speaker_verdicts: [
          {
            speaker_id: 0,
            label: "Alice",
            factual_grade: "mixed",
            faith_grade: "dishonest",   // invalid
            one_liner: "Short.",
          },
        ],
      }),
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Route tests — mock the AI SDK
// ---------------------------------------------------------------------------

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

vi.mock("@/lib/server/anthropic", () => ({
  opus: "mock-opus-model",
}));

describe("POST /api/synthesize route", () => {
  const validBody = {
    utterances: [
      { speaker_id: 0, text: "The earth is flat.", start: 0, end: 3 },
    ],
    counters: { claims: 1, false: 1, partial: 0, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
    speakers: [{ id: 0, label: "Alice" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns text + 3 headlines on valid input", async () => {
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
    mockGenerateText.mockResolvedValue({
      output: {
        text: "A synthesis paragraph.",
        headlines: ["Insight one", "Insight two", "Insight three"],
      },
    });

    const { POST } = await import("@/app/api/synthesize/route");
    const req = new Request("http://localhost/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe("A synthesis paragraph.");
    expect(json.headlines).toHaveLength(3);
  });

  it("forwards per_speaker_verdicts from model output", async () => {
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
    const mockVerdicts = [
      {
        speaker_id: 0,
        label: "Alice",
        factual_grade: "mostly_factual",
        faith_grade: "good_faith",
        one_liner: "Alice backed claims with solid evidence.",
      },
    ];
    mockGenerateText.mockResolvedValue({
      output: {
        text: "A synthesis paragraph.",
        headlines: ["Insight one", "Insight two", "Insight three"],
        per_speaker_verdicts: mockVerdicts,
      },
    });

    const { POST } = await import("@/app/api/synthesize/route");
    const req = new Request("http://localhost/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.per_speaker_verdicts).toHaveLength(1);
    expect(json.per_speaker_verdicts[0].factual_grade).toBe("mostly_factual");
    expect(json.per_speaker_verdicts[0].faith_grade).toBe("good_faith");
    expect(json.per_speaker_verdicts[0].one_liner).toBe("Alice backed claims with solid evidence.");
  });

  it("returns 200 when per_speaker_verdicts is absent from model output", async () => {
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
    mockGenerateText.mockResolvedValue({
      output: {
        text: "A synthesis paragraph.",
        headlines: ["Insight one", "Insight two", "Insight three"],
        // no per_speaker_verdicts
      },
    });

    const { POST } = await import("@/app/api/synthesize/route");
    const req = new Request("http://localhost/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.text).toBe("A synthesis paragraph.");
    // per_speaker_verdicts absent or undefined is fine
    expect(json.per_speaker_verdicts == null || Array.isArray(json.per_speaker_verdicts)).toBe(true);
  });

  it("returns 400 when body is missing required fields", async () => {
    const { POST } = await import("@/app/api/synthesize/route");
    const req = new Request("http://localhost/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ utterances: [] }), // missing counters + speakers
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBeDefined();
  });

  it("returns 500 when generateText throws", async () => {
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
    mockGenerateText.mockRejectedValue(new Error("AI SDK failure"));

    const { POST } = await import("@/app/api/synthesize/route");
    const req = new Request("http://localhost/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("synthesis failed");
  });

  it("calls generateText with top-level system param (not messages[])", async () => {
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
    mockGenerateText.mockResolvedValue({
      output: {
        text: "Para.",
        headlines: ["H1", "H2", "H3"],
      },
    });

    const { POST } = await import("@/app/api/synthesize/route");
    const req = new Request("http://localhost/api/synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    await POST(req as never);
    expect(mockGenerateText).toHaveBeenCalledOnce();
    const callArg = mockGenerateText.mock.calls[0][0];
    // MUST have top-level system: field
    expect(callArg.system).toBeDefined();
    expect(typeof callArg.system).toBe("string");
    // Must NOT have a messages array with role:"system"
    if (callArg.messages) {
      const systemMsg = callArg.messages.find((m: { role: string }) => m.role === "system");
      expect(systemMsg).toBeUndefined();
    }
  });
});
