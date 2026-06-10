import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetRateLimitForTests } from "@/lib/server/rate-limit";

const aiMocks = vi.hoisted(() => ({
  generateText: vi.fn(),
}));

vi.mock("ai", () => ({
  generateText: aiMocks.generateText,
  Output: {
    object: vi.fn(({ schema }: { schema: unknown }) => schema),
  },
}));

vi.mock("@/lib/server/anthropic", () => ({
  opus: { provider: "test" },
}));

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/analyze-rhetoric", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("analyze-rhetoric cache control (Phase 1a)", () => {
  beforeEach(() => {
    aiMocks.generateText.mockReset();
    resetRateLimitForTests();
  });

  it("uses gateway-supported ephemeral Anthropic cache control for the static rhetoric system prefix", async () => {
    aiMocks.generateText.mockResolvedValue({
      output: { markers: [] },
    });

    const { POST } = await import("@/app/api/analyze-rhetoric/route");
    const res = await POST(jsonRequest({
      transcript_window: "Hello world",
      recent_hashes: [],
      source_context: "",
    }));

    expect(res.status).toBe(200);
    expect(aiMocks.generateText).toHaveBeenCalledTimes(1);
    const callArg = aiMocks.generateText.mock.calls[0][0];
    expect(callArg.providerOptions?.anthropic?.cacheControl?.type).toBe("ephemeral");
  });
});
