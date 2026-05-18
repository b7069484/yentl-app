import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionHeader } from "@/components/session/SessionHeader";

vi.mock("@/lib/client/session-store", () => ({
  useSession: () => ({
    isRecording: true,
    mode: "A",
    toggleMode: vi.fn(),
    title: "Test session",
    startedAt: new Date().toISOString(),
  }),
}));

describe("SessionHeader — Pause > End hierarchy", () => {
  it("Pause button has primary brand-blue class when recording", () => {
    render(
      <SessionHeader onStart={vi.fn()} onStop={vi.fn()} onEnd={vi.fn()} />
    );
    const pauseBtn = screen.getByRole("button", { name: /Pause/i });
    expect(pauseBtn.className).toContain("bg-[#2563EB]");
  });

  it("End session button has destructive-outline style", () => {
    render(
      <SessionHeader onStart={vi.fn()} onStop={vi.fn()} onEnd={vi.fn()} />
    );
    const endBtn = screen.getByRole("button", { name: /End session/i });
    expect(endBtn.className).toContain("session-header-end");
  });
});
