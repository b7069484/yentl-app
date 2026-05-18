import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import { toast } from "sonner";

vi.mock("sonner", () => ({ toast: vi.fn() }));

let mockIsRecording = true;
let mockStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();

vi.mock("@/lib/client/session-store", () => ({
  useSession: () => ({
    isRecording: mockIsRecording,
    startedAt: mockStartedAt,
  }),
}));

describe("SessionTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("fires toast at 30:00 with verbatim text", async () => {
    mockIsRecording = true;
    mockStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { SessionTimer } = await import("@/components/session/SessionTimer");
    render(<SessionTimer />);
    vi.advanceTimersByTime(1001);
    expect(toast).toHaveBeenCalledWith(
      "Still rolling at 30:00. Pause anytime."
    );
  });

  it("does not fire toast if session is paused (isRecording=false)", async () => {
    mockIsRecording = false;
    mockStartedAt = new Date(Date.now() - 31 * 60 * 1000).toISOString();

    const { SessionTimer } = await import("@/components/session/SessionTimer");
    render(<SessionTimer />);
    vi.advanceTimersByTime(2000);
    expect(toast).not.toHaveBeenCalled();
  });

  it("toast text matches verbatim brand-voice copy", async () => {
    mockIsRecording = true;
    mockStartedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { SessionTimer } = await import("@/components/session/SessionTimer");
    render(<SessionTimer />);
    vi.advanceTimersByTime(1001);
    expect(toast).toHaveBeenCalledWith("Still rolling at 30:00. Pause anytime.");
  });
});
