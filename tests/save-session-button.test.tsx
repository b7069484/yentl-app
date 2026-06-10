import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { ClaimCard, RhetoricMarker, Speaker, TranscriptSegment, SessionSource, Session } from "@/lib/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

let mockSearchParamsRaw = new URLSearchParams("");

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/session",
  useSearchParams: () => mockSearchParamsRaw,
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

// ─── Mock dialog sub-components to keep test surface small ───────────────────

vi.mock("@/components/session/ExportDialog", () => ({
  ExportDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="export-dialog">
        <button onClick={onClose}>Close Export</button>
      </div>
    ) : null,
}));

vi.mock("@/components/session/EndSessionDialog", () => ({
  EndSessionDialog: ({ open, onClose }: { open: boolean; onClose: () => void }) =>
    open ? (
      <div role="dialog" aria-label="end-session-dialog">
        <button onClick={onClose}>Close End</button>
      </div>
    ) : null,
}));

vi.mock("@/components/session/speaker-rail", () => ({
  SpeakerRail: ({
    speakers,
    activeSpeakerId,
    onRename,
  }: {
    speakers: Speaker[];
    activeSpeakerId: number | null;
    onRename: (id: number, label: string) => void;
  }) => (
    <div data-testid="speaker-rail" data-active-id={activeSpeakerId ?? undefined} data-speaker-count={speakers.length}>
      <button onClick={() => onRename(0, "Alice")}>rename</button>
    </div>
  ),
}));

// ─── Mock save-session-storage ────────────────────────────────────────────────

const mockSaveSession = vi.fn();
const mockSaveCloudSession = vi.fn();

vi.mock("@/lib/client/session-storage", () => ({
  saveSession: (...args: unknown[]) => mockSaveSession(...args),
}));

vi.mock("@/lib/client/session-sync", () => ({
  saveCloudSession: (...args: unknown[]) => mockSaveCloudSession(...args),
}));

// ─── Mock session store ───────────────────────────────────────────────────────

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn(),
}));

import { useSession } from "@/lib/client/session-store";
import { SessionShell } from "@/components/session/session-shell";

// ─── Store helpers ────────────────────────────────────────────────────────────

type StoreState = {
  title: string;
  startedAt: string | null;
  endedAt: string | null;
  isRecording: boolean;
  transcript: TranscriptSegment[];
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  speakers: Speaker[];
  source: SessionSource;
  setRecording: (b: boolean) => void;
  renameSpeaker: (id: number, label: string) => void;
  toSession: () => Session;
};

function makeDefaultStoreState(overrides: Partial<StoreState> = {}): StoreState {
  const defaultSession: Session = {
    title: "Test",
    started_at: overrides.startedAt ?? new Date().toISOString(),
    ended_at: overrides.endedAt ?? undefined,
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
  };
  return {
    title: "Test",
    startedAt: new Date().toISOString(),
    endedAt: null,
    isRecording: false,
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
    setRecording: vi.fn(),
    renameSpeaker: vi.fn(),
    toSession: () => defaultSession,
    ...overrides,
  };
}

function mockStore(state: StoreState) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).mockImplementation(
    (selector: (s: StoreState) => unknown) => selector(state),
  );
  // Also set up getState for the toSession() call inside SaveSessionDialog
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (useSession as any).getState = () => state;
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockSearchParamsRaw = new URLSearchParams("");
  mockSaveSession.mockResolvedValue({ id: "new-id", name: "Test" });
  mockSaveCloudSession.mockResolvedValue({ ok: false, status: "signed_out", message: "Sign in to sync." });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Save button — SessionShell", () => {
  it("Save button is visible when startedAt is set and the session has captured content", () => {
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      transcript: [
        {
          text: "Captured line.",
          start: 0,
          end: 2,
          is_final: true,
          speaker_id: null,
        },
      ],
    }));
    render(<SessionShell>body</SessionShell>);
    expect(screen.getByRole("button", { name: /Save/ })).toBeTruthy();
  });

  it("Save button is not visible when startedAt is null", () => {
    mockStore(makeDefaultStoreState({ startedAt: null }));
    render(<SessionShell>body</SessionShell>);
    expect(screen.queryByRole("button", { name: /Save/ })).toBeNull();
  });

  it("Save button is not visible when a session has started but has no durable content", () => {
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      transcript: [],
      claims: [],
      markers: [],
    }));
    render(<SessionShell>body</SessionShell>);
    expect(screen.queryByRole("button", { name: /Save/ })).toBeNull();
  });

  it("clicking Save button opens SaveSessionDialog", () => {
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      transcript: [
        {
          text: "Captured line.",
          start: 0,
          end: 2,
          is_final: true,
          speaker_id: null,
        },
      ],
    }));
    render(<SessionShell>body</SessionShell>);
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("dialog contains a name input pre-filled with session title", () => {
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      title: "My session title",
      transcript: [
        {
          text: "Captured line.",
          start: 0,
          end: 2,
          is_final: true,
          speaker_id: null,
        },
      ],
    }));
    render(<SessionShell>body</SessionShell>);
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    const input = screen.getByLabelText("Session name") as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toContain("My session title");
  });

  it("clicking Save in dialog calls saveSession with the typed name", async () => {
    const state = makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      transcript: [
        {
          text: "Captured line.",
          start: 0,
          end: 2,
          is_final: true,
          speaker_id: null,
        },
      ],
    });
    mockStore(state);
    render(<SessionShell>body</SessionShell>);
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));

    const input = screen.getByLabelText("Session name") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Custom name" } });

    const saveBtn = screen.getByRole("button", { name: /^Save$/ });
    fireEvent.click(saveBtn);

    await waitFor(() =>
      expect(mockSaveSession).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ name: "Custom name" }),
      ),
    );
    expect(mockSaveCloudSession).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: "new-id", name: "Test" }),
    );
  });

  it("shows a visible retry error when local save fails", async () => {
    mockSaveSession.mockRejectedValueOnce(new Error("IndexedDB is blocked"));
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      transcript: [
        {
          text: "Captured line.",
          start: 0,
          end: 2,
          is_final: true,
          speaker_id: null,
        },
      ],
    }));
    render(<SessionShell>body</SessionShell>);
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Save$/ }));

    await waitFor(() =>
      expect(screen.getByRole("alert").textContent).toContain("IndexedDB is blocked"),
    );
  });

  it("clicking Cancel in dialog closes it without calling saveSession", () => {
    mockStore(makeDefaultStoreState({
      startedAt: new Date().toISOString(),
      transcript: [
        {
          text: "Captured line.",
          start: 0,
          end: 2,
          is_final: true,
          speaker_id: null,
        },
      ],
    }));
    render(<SessionShell>body</SessionShell>);
    fireEvent.click(screen.getByRole("button", { name: /Save/ }));
    fireEvent.click(screen.getByRole("button", { name: /Cancel/ }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mockSaveSession).not.toHaveBeenCalled();
  });
});
