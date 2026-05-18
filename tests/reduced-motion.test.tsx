import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
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

describe("prefers-reduced-motion", () => {
  it("SessionHeader recording beacon has motion-reduce:animate-none class", () => {
    const { container } = render(
      <SessionHeader onStart={vi.fn()} onStop={vi.fn()} onEnd={vi.fn()} />
    );
    const header = container.querySelector("header");
    expect(header?.innerHTML).toContain("motion-reduce:animate-none");
  });
});
