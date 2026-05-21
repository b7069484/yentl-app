import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DevilAdvocateResponse,
  parseDevilAdvocateText,
} from "@/lib/prompts/devil-advocate";

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return {
    ...actual,
    generateText: vi.fn(),
  };
});

vi.mock("@/lib/server/grok", () => ({
  grok: "mock-grok-model",
}));

describe("DevilAdvocateResponse schema", () => {
  it("requires exactly three counterarguments and two questions", () => {
    const parsed = DevilAdvocateResponse.parse({
      stance: "A skeptic would challenge the missing source.",
      strongest_counterarguments: ["one", "two", "three"],
      weakest_assumption: "The transcript contains enough evidence.",
      questions: ["Question one?", "Question two?"],
      confidence: "medium",
    });

    expect(parsed.strongest_counterarguments).toHaveLength(3);
    expect(parsed.questions).toHaveLength(2);
  });

  it("rejects malformed confidence values", () => {
    expect(() =>
      DevilAdvocateResponse.parse({
        stance: "A skeptic would challenge the missing source.",
        strongest_counterarguments: ["one", "two", "three"],
        weakest_assumption: "The transcript contains enough evidence.",
        questions: ["Question one?", "Question two?"],
        confidence: "certain",
      }),
    ).toThrow();
  });

  it("parses fenced JSON from Grok text", () => {
    const parsed = parseDevilAdvocateText(`\`\`\`json
{
  "stance": "A skeptic would challenge the missing source.",
  "strongest_counterarguments": ["one", "two", "three"],
  "weakest_assumption": "The transcript contains enough evidence.",
  "questions": ["Question one?", "Question two?"],
  "confidence": "low"
}
\`\`\``);

    expect(parsed.confidence).toBe("low");
  });
});

describe("POST /api/devil-advocate route", () => {
  const validBody = {
    utterances: [
      { speaker_id: 0, text: "The city doubled the library budget.", start: 0, end: 4 },
      { speaker_id: 1, text: "The audit has not been released yet.", start: 4, end: 8 },
      { speaker_id: 0, text: "Officials said weekend hours would expand.", start: 8, end: 12 },
    ],
    claims: [
      {
        text: "The city doubled the library budget.",
        verdict: "UNVERIFIABLE",
        score: 40,
        speaker_id: 0,
        explanation: "No official source is attached.",
      },
    ],
    markers: [
      {
        display: "Premature certainty",
        severity: "clear",
        excerpt: "doubled the budget",
        speaker_id: 0,
        explanation: "The phrase may outrun the evidence.",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("routes the devil's advocate request to Grok through the AI Gateway model", async () => {
    const { generateText } = await import("ai");
    const mockGenerateText = generateText as ReturnType<typeof vi.fn>;
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        stance: "A skeptic would ask whether the budget baseline is missing.",
        strongest_counterarguments: ["one", "two", "three"],
        weakest_assumption: "The clip contains the full fiscal context.",
        questions: ["What is the base year?", "Where is the budget document?"],
        confidence: "medium",
      }),
    });

    const { POST } = await import("@/app/api/devil-advocate/route");
    const req = new Request("http://localhost/api/devil-advocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validBody),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(200);
    expect(mockGenerateText).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "mock-grok-model",
        temperature: 0.2,
      }),
    );

    const json = await res.json();
    expect(json.model).toBe("mock-grok-model");
    expect(json.strongest_counterarguments).toHaveLength(3);
  });

  it("returns 400 for missing transcript input", async () => {
    const { POST } = await import("@/app/api/devil-advocate/route");
    const req = new Request("http://localhost/api/devil-advocate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claims: [], markers: [] }),
    });

    const res = await POST(req as never);
    expect(res.status).toBe(400);
  });
});
