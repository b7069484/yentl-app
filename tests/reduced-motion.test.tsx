import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { SessionHeader } from "@/components/session/SessionHeader";

vi.mock("@/lib/client/session-store", () => {
  const state = {
    isRecording: true,
    mode: "A" as const,
    toggleMode: vi.fn(),
    title: "Test session",
    startedAt: new Date().toISOString(),
    transcript: [] as unknown[],
    claims: [] as unknown[],
    markers: [] as unknown[],
    speakers: [] as unknown[],
    speakersMode: false,
    setSpeakersMode: vi.fn(),
    renameSpeaker: vi.fn(),
  };
  return {
    useSession: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});

vi.mock("@/components/session/AudioMeter", () => ({
  AudioMeter: () => null,
}));

describe("prefers-reduced-motion", () => {
  it("SessionHeader recording beacon has motion-reduce:animate-none class", () => {
    const { container } = render(
      <SessionHeader
        onStart={vi.fn()}
        onStop={vi.fn()}
        onEnd={vi.fn()}
        onExport={vi.fn()}
        audioStream={null}
      />
    );
    const header = container.querySelector("header");
    expect(header?.innerHTML).toContain("motion-reduce:animate-none");
  });
});
