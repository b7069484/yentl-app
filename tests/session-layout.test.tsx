import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/session",
  useSearchParams: () => new URLSearchParams(""),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

// ─── Mock SessionShell to a simple passthrough ───────────────────────────────

vi.mock("@/components/session/session-shell", () => ({
  SessionShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="session-shell">{children}</div>
  ),
}));

// ─── Mock mic + deepgram-stream ───────────────────────────────────────────────

const mockMicStop = vi.fn();
const mockDgClose = vi.fn();
const mockDgSend = vi.fn();

let mockOpenDeepgramStream = vi.fn().mockResolvedValue({
  close: mockDgClose,
  send: mockDgSend,
});

let mockStartMic = vi.fn().mockResolvedValue({
  stream: {},
  recorder: {},
  stop: mockMicStop,
});

vi.mock("@/lib/client/deepgram-stream", () => ({
  openDeepgramStream: (...args: unknown[]) => mockOpenDeepgramStream(...args),
}));

vi.mock("@/lib/client/mic", () => ({
  startMic: (...args: unknown[]) => mockStartMic(...args),
}));

// ─── Mock orchestrator ────────────────────────────────────────────────────────

vi.mock("@/lib/client/orchestrator", () => ({
  onFinalUtterance: vi.fn(),
}));

// ─── Mock session store ───────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";
import SessionLayout from "@/app/session/layout";

// ─── Store helpers ────────────────────────────────────────────────────────────

type StoreState = {
  startedAt: string | null;
  endedAt: string | null;
  isRecording: boolean;
  speakersMode: boolean;
  source: { kind: string };
  prerecordStage: "picker" | "selected";
  setInterim: (t: string) => void;
  appendFinal: (seg: unknown) => void;
  setRecording: (b: boolean) => void;
  setMicStream: (stream: MediaStream | null) => void;
  startSession: () => void;
};

function makeStore(overrides: Partial<StoreState> = {}): StoreState {
  return {
    startedAt: null,
    endedAt: null,
    isRecording: false,
    speakersMode: false,
    source: { kind: "mic" },
    prerecordStage: "picker",
    setInterim: vi.fn(),
    appendFinal: vi.fn(),
    setRecording: vi.fn(),
    setMicStream: vi.fn(),
    startSession: vi.fn(),
    ...overrides,
  };
}

function mockStore(state: StoreState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector?: (s: StoreState) => unknown) =>
      selector ? selector(state) : state,
  );
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockOpenDeepgramStream = vi.fn().mockResolvedValue({
    close: mockDgClose,
    send: mockDgSend,
  });
  mockStartMic = vi.fn().mockResolvedValue({
    stream: {},
    recorder: {},
    stop: mockMicStop,
  });
  mockStore(makeStore());
});

// ─── 1. Renders SessionShell with children ────────────────────────────────────

describe("SessionLayout – shell + children", () => {
  it("renders SessionShell wrapper", () => {
    mockStore(makeStore());
    render(
      <SessionLayout>
        <div data-testid="child">Child content</div>
      </SessionLayout>,
    );
    expect(screen.getByTestId("session-shell")).toBeTruthy();
  });

  it("renders children inside the shell", () => {
    mockStore(makeStore());
    render(
      <SessionLayout>
        <div data-testid="child">Child content</div>
      </SessionLayout>,
    );
    expect(screen.getByTestId("child")).toBeTruthy();
    expect(screen.getByTestId("child").textContent).toBe("Child content");
  });
});

// ─── 2. Error banner renders and can be dismissed ────────────────────────────

describe("SessionLayout – error banner", () => {
  it("no error banner by default", () => {
    mockStore(makeStore());
    render(
      <SessionLayout>
        <div>child</div>
      </SessionLayout>,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("error banner appears when mic permission is denied", async () => {
    // Arrange: mic throws a permission error
    mockStartMic = vi.fn().mockRejectedValue(new Error("NotAllowedError: permission denied"));
    const startedAt = new Date().toISOString();
    mockStore(makeStore({ startedAt, isRecording: true }));

    await act(async () => {
      render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("Microphone access was blocked");
  });

  it("error banner appears when deepgram token fetch fails", async () => {
    mockOpenDeepgramStream = vi.fn().mockRejectedValue(new Error("token refresh failed"));
    const startedAt = new Date().toISOString();
    mockStore(makeStore({ startedAt, isRecording: true }));

    await act(async () => {
      render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
    });

    const alert = screen.queryByRole("alert");
    expect(alert).toBeTruthy();
    expect(alert?.textContent).toContain("transcription service");
  });

  it("Dismiss button clears the error banner", async () => {
    mockStartMic = vi.fn().mockRejectedValue(new Error("NotAllowedError: permission denied"));
    const startedAt = new Date().toISOString();
    mockStore(makeStore({ startedAt, isRecording: true }));

    await act(async () => {
      render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
    });

    // Banner is visible
    expect(screen.getByRole("alert")).toBeTruthy();

    // Click dismiss
    fireEvent.click(screen.getByRole("button", { name: /Dismiss/i }));
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

// ─── 3. Lifecycle: no mic started when startedAt is null ─────────────────────

describe("SessionLayout – lifecycle: pre-record", () => {
  it("does not start mic when startedAt is null (even if isRecording is true)", async () => {
    // Technically impossible via the store but guard the layout independently
    mockStore(makeStore({ startedAt: null, isRecording: true }));

    await act(async () => {
      render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
    });

    expect(mockOpenDeepgramStream).not.toHaveBeenCalled();
    expect(mockStartMic).not.toHaveBeenCalled();
  });
});

// ─── 4. Lifecycle: teardown on unmount ───────────────────────────────────────

describe("SessionLayout – lifecycle: unmount teardown", () => {
  it("calls mic.stop and dg.close on unmount after recording started", async () => {
    const startedAt = new Date().toISOString();
    const store = makeStore({ startedAt, isRecording: true });
    mockStore(store);

    let unmount: () => void;
    await act(async () => {
      const result = render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
      unmount = result.unmount;
    });

    act(() => {
      unmount();
    });

    // Both teardown paths called
    expect(mockMicStop).toHaveBeenCalled();
    expect(mockDgClose).toHaveBeenCalled();
    expect(store.setMicStream).toHaveBeenCalledWith(null);
  });
});

// ─── 5. Lifecycle: start triggered when isRecording flips true ────────────────

describe("SessionLayout – lifecycle: start on isRecording", () => {
  it("opens deepgram stream and mic when startedAt set + isRecording true", async () => {
    const startedAt = new Date().toISOString();
    const store = makeStore({ startedAt, isRecording: true });
    mockStore(store);

    await act(async () => {
      render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
    });

    expect(mockOpenDeepgramStream).toHaveBeenCalledOnce();
    expect(mockStartMic).toHaveBeenCalledOnce();
    expect(store.setMicStream).toHaveBeenCalledWith(expect.any(Object));
  });
});

// ─── 6. Mic guard: non-mic source does not start mic ─────────────────────────

describe("SessionLayout – mic guard: non-mic source", () => {
  it("does NOT call startMic when source.kind is 'audio_file' and isRecording becomes true", async () => {
    const startedAt = new Date().toISOString();
    const store = makeStore({
      startedAt,
      isRecording: true,
      source: { kind: "audio_file" },
    });
    mockStore(store);

    await act(async () => {
      render(
        <SessionLayout>
          <div>child</div>
        </SessionLayout>,
      );
    });

    expect(mockStartMic).not.toHaveBeenCalled();
    expect(mockOpenDeepgramStream).not.toHaveBeenCalled();
  });
});

// ─── 7. Space shortcut: picker stage → no startSession ───────────────────────

describe("SessionLayout – Space shortcut: picker stage", () => {
  it("does NOT call startSession when Space pressed in picker stage", () => {
    const store = makeStore({
      startedAt: null,
      prerecordStage: "picker",
      source: { kind: "mic" },
    });
    mockStore(store);

    render(
      <SessionLayout>
        <div>child</div>
      </SessionLayout>,
    );

    fireEvent.keyDown(window, { code: "Space" });
    expect(store.startSession).not.toHaveBeenCalled();
  });

  it("does NOT call startSession when Space pressed in picker stage with non-mic source", () => {
    const store = makeStore({
      startedAt: null,
      prerecordStage: "picker",
      source: { kind: "audio_file" },
    });
    mockStore(store);

    render(
      <SessionLayout>
        <div>child</div>
      </SessionLayout>,
    );

    fireEvent.keyDown(window, { code: "Space" });
    expect(store.startSession).not.toHaveBeenCalled();
  });
});

// ─── 8. Space shortcut: mic-selected stage → startSession called ──────────────

describe("SessionLayout – Space shortcut: mic-selected stage", () => {
  it("calls startSession when Space pressed in selected stage with mic source", () => {
    const store = makeStore({
      startedAt: null,
      prerecordStage: "selected",
      source: { kind: "mic" },
    });
    mockStore(store);

    render(
      <SessionLayout>
        <div>child</div>
      </SessionLayout>,
    );

    fireEvent.keyDown(window, { code: "Space" });
    expect(store.startSession).toHaveBeenCalledOnce();
  });

  it("does NOT call startSession when Space pressed in selected stage with non-mic source", () => {
    const store = makeStore({
      startedAt: null,
      prerecordStage: "selected",
      source: { kind: "youtube" },
    });
    mockStore(store);

    render(
      <SessionLayout>
        <div>child</div>
      </SessionLayout>,
    );

    fireEvent.keyDown(window, { code: "Space" });
    expect(store.startSession).not.toHaveBeenCalled();
  });
});
