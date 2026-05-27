import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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

// AudioMeter pulls in browser-only AudioContext APIs jsdom doesn't ship.
// Stub it so SessionHeader renders cleanly under the test runtime.
vi.mock("@/components/session/AudioMeter", () => ({
  AudioMeter: () => null,
}));

const baseProps = {
  onStart: vi.fn(),
  onStop: vi.fn(),
  onEnd: vi.fn(),
  onExport: vi.fn(),
  audioStream: null,
};

describe("SessionHeader — Pause > End hierarchy", () => {
  it("Pause button has primary brand-blue class when recording", () => {
    render(<SessionHeader {...baseProps} />);
    const pauseBtn = screen.getByRole("button", { name: /Pause/i });
    expect(pauseBtn.className).toContain("bg-[#2563EB]");
  });

  it("End session button has destructive-outline style", () => {
    render(<SessionHeader {...baseProps} />);
    const endBtn = screen.getByRole("button", { name: /End session/i });
    expect(endBtn.className).toContain("session-header-end");
  });

  it("header command buttons keep comfortable touch targets", () => {
    render(<SessionHeader {...baseProps} />);
    expect(screen.getByRole("button", { name: /Present mode/i }).className).toContain("h-11");
    expect(screen.getByRole("button", { name: /Pause/i }).className).toContain("h-11");
    expect(screen.getByRole("button", { name: /Export/i }).className).toContain("h-11");
    expect(screen.getByRole("button", { name: /End session/i }).className).toContain("h-11");
  });
});
