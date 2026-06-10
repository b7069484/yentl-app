import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ClaimCard, RhetoricMarker, TranscriptSegment } from "@/lib/types";

const mockRunFinalSynthesis = vi.fn();
const mockStopBrowserTabCapture = vi.fn();

vi.mock("@/lib/client/orchestrator", () => ({
  runFinalSynthesis: () => mockRunFinalSynthesis(),
}));

vi.mock("@/components/session/ExtensionBridge", () => ({
  stopBrowserTabCapture: () => mockStopBrowserTabCapture(),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { EndSessionDialog } from "@/components/session/EndSessionDialog";
import { useSession } from "@/lib/client/session-store";

type DialogStore = {
  startedAt: string | null;
  endedAt: string | null;
  source: { kind: "mic" | "browser_tab" | "youtube" };
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  endSession: () => void;
};

function makeSegment(): TranscriptSegment {
  return {
    text: "Captured line.",
    start: 0,
    end: 2,
    is_final: true,
    speaker_id: null,
  };
}

function makeClaim(): ClaimCard {
  return {
    id: "claim-1",
    claim_text: "The city doubled its budget.",
    utterance_start: 0,
    utterance_end: 2,
    speaker_id: null,
    topic: "budget",
    topic_secondary: null,
    primary_label: "MISLEADING",
    score: 54,
    annotations: [],
    explanation: "The baseline changed.",
    status: "confirmed",
    sources: [],
  };
}

function makeMarker(): RhetoricMarker {
  return {
    id: "marker-1",
    type: "rhetoric",
    name: "loaded-language",
    display: "Loaded language",
    excerpt: "destroying everything",
    speaker_id: null,
    start_time: 0,
    end_time: 2,
    severity: "clear",
    explanation: "The phrasing escalates the claim.",
  };
}

function makeStore(overrides: Partial<DialogStore> = {}): DialogStore {
  return {
    startedAt: "2026-06-09T05:00:00.000Z",
    endedAt: null,
    source: { kind: "mic" },
    transcript: [],
    claims: [],
    markers: [],
    endSession: vi.fn(),
    ...overrides,
  };
}

function mockStore(state: DialogStore) {
  (useSession as unknown as ReturnType<typeof vi.fn>).mockImplementation(
    (selector?: (s: DialogStore) => unknown) => (selector ? selector(state) : state),
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockStore(makeStore());
});

describe("EndSessionDialog", () => {
  it("offers save and export exits before ending captured work", () => {
    const onSaveFirst = vi.fn();
    const onExportFirst = vi.fn();
    const store = makeStore({
      transcript: [makeSegment()],
      claims: [makeClaim()],
      markers: [makeMarker()],
    });
    mockStore(store);

    render(
      <EndSessionDialog
        open
        onClose={vi.fn()}
        onSaveFirst={onSaveFirst}
        onExportFirst={onExportFirst}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save first" }));
    fireEvent.click(screen.getByRole("button", { name: "Export first" }));

    expect(screen.getByText("Keep a copy before stopping")).toBeTruthy();
    expect(onSaveFirst).toHaveBeenCalledOnce();
    expect(onExportFirst).toHaveBeenCalledOnce();
    expect(store.endSession).not.toHaveBeenCalled();
  });

  it("ends a browser-tab session by stopping capture, ending session, and closing", () => {
    const onClose = vi.fn();
    const store = makeStore({
      source: { kind: "browser_tab" },
      transcript: [makeSegment()],
    });
    mockStore(store);

    render(<EndSessionDialog open onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: "End session" }));

    expect(mockStopBrowserTabCapture).toHaveBeenCalledOnce();
    expect(store.endSession).toHaveBeenCalledOnce();
    expect(mockRunFinalSynthesis).toHaveBeenCalledOnce();
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("shows a no-content state instead of save/export exits", () => {
    render(<EndSessionDialog open onClose={vi.fn()} />);

    expect(screen.getByText("No transcript, claims, or markers have been captured yet.")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save first" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Export first" })).toBeNull();
  });
});
