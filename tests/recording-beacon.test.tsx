import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";

// Mocked store — handles BOTH useSession() and useSession(selector)
const mockEndSession = vi.fn();
const mockStore: {
  isRecording: boolean;
  startedAt: string | null;
  endSession: () => void;
} = {
  isRecording: true,
  startedAt: new Date(Date.now() - 5_000).toISOString(),
  endSession: mockEndSession,
};

vi.mock("@/lib/client/session-store", () => ({
  useSession: <T,>(selector?: (s: typeof mockStore) => T) =>
    selector ? selector(mockStore) : mockStore,
}));

async function renderBeacon() {
  // Dynamic import so each test sees the current mockStore values.
  const { RecordingBeacon } = await import(
    "@/components/session/RecordingBeacon"
  );
  return render(<RecordingBeacon />);
}

describe("RecordingBeacon (yentl-this-week-actions clause 5)", () => {
  beforeEach(() => {
    mockEndSession.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  // (a) Renders when session.isRecording === true
  it("(a) renders when isRecording is true", async () => {
    mockStore.isRecording = true;
    mockStore.startedAt = new Date(Date.now() - 1000).toISOString();
    await renderBeacon();
    expect(screen.getByTestId("recording-beacon")).toBeTruthy();
    expect(screen.getByText(/Rec/i)).toBeTruthy();
  });

  // (b) Does not render the visible beacon when isRecording is false
  it("(b) does not render the visible beacon when isRecording is false", async () => {
    mockStore.isRecording = false;
    mockStore.startedAt = null;
    await renderBeacon();
    expect(screen.queryByTestId("recording-beacon")).toBeNull();
    // The aria-live announcer still mounts (sr-only) so transitions can be announced.
    expect(screen.getByTestId("recording-beacon-announcer")).toBeTruthy();
  });

  // (c) Timer increments per second (with fake timers)
  it("(c) timer increments per second with fake timers", async () => {
    vi.useFakeTimers();
    const start = new Date("2026-05-20T20:00:00.000Z").getTime();
    vi.setSystemTime(new Date(start));
    mockStore.isRecording = true;
    mockStore.startedAt = new Date(start).toISOString();

    await renderBeacon();
    const beacon = screen.getByTestId("recording-beacon");
    expect(beacon.textContent).toContain("00:00:00");

    // Advance 5 seconds wrapped in act() so React flushes the setInterval-
    // driven state update before we assert.
    // Vitest's fake timers advance both the tick clock AND Date.now() via
    // vi.advanceTimersByTime — don't combine with setSystemTime mid-test or
    // the two shifts compound.
    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    expect(beacon.textContent).not.toContain("00:00:00");
    expect(beacon.textContent).toMatch(/00:00:0[1-9]/);
  });

  // (d) End button click calls session.endSession()
  it("(d) End button calls endSession()", async () => {
    mockStore.isRecording = true;
    mockStore.startedAt = new Date(Date.now() - 1000).toISOString();
    await renderBeacon();
    fireEvent.click(screen.getByRole("button", { name: /End recording/i }));
    expect(mockEndSession).toHaveBeenCalledTimes(1);
  });

  // (e) Has motion-reduce:animate-none class for reduced motion
  it("(e) pulsing dot includes motion-reduce:animate-none", async () => {
    mockStore.isRecording = true;
    mockStore.startedAt = new Date(Date.now() - 1000).toISOString();
    const { container } = await renderBeacon();
    const dot = container.querySelector(".animate-pulse");
    expect(dot).not.toBeNull();
    expect(dot?.className).toContain("motion-reduce:animate-none");
  });

  // (f) aria-live region present
  it("(f) aria-live polite announcer region is present", async () => {
    mockStore.isRecording = true;
    mockStore.startedAt = new Date(Date.now() - 1000).toISOString();
    await renderBeacon();
    const announcer = screen.getByTestId("recording-beacon-announcer");
    expect(announcer.getAttribute("aria-live")).toBe("polite");
  });
});
