import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import type { SavedSessionMeta } from "@/lib/client/session-storage";
import type { Session } from "@/lib/types";

// ─── Mock next/navigation ─────────────────────────────────────────────────────

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => "/sessions",
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

// ─── Mock session-storage ─────────────────────────────────────────────────────

const mockListSessions = vi.fn<() => Promise<SavedSessionMeta[]>>();
const mockLoadSession = vi.fn<(id: string) => Promise<{ session: Session } & SavedSessionMeta>>();
const mockRenameSession = vi.fn<(id: string, name: string) => Promise<void>>();
const mockDeleteSession = vi.fn<(id: string) => Promise<void>>();

vi.mock("@/lib/client/session-storage", () => ({
  listSessions: (...args: unknown[]) => mockListSessions(...args as []),
  loadSession: (...args: unknown[]) => mockLoadSession(...(args as [string])),
  renameSession: (...args: unknown[]) => mockRenameSession(...(args as [string, string])),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...(args as [string])),
}));

// ─── Mock session-store ───────────────────────────────────────────────────────

const mockRestoreSession = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector: (s: { restoreSession: typeof mockRestoreSession }) => unknown) =>
    selector({ restoreSession: mockRestoreSession }),
  ),
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMeta(overrides: Partial<SavedSessionMeta> = {}): SavedSessionMeta {
  return {
    id: "sess-1",
    name: "Morning debate",
    source_kind: "mic",
    saved_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
    started_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    ended_at: new Date(Date.now() - 2.5 * 3600 * 1000).toISOString(),
    claim_count: 5,
    marker_count: 3,
    speaker_count: 2,
    duration_sec: 1800,
    ...overrides,
  };
}

function makeFullSession(): { session: Session } & SavedSessionMeta {
  const meta = makeMeta();
  const session: Session = {
    title: meta.name,
    started_at: meta.started_at,
    ended_at: meta.ended_at ?? undefined,
    transcript: [],
    claims: [],
    markers: [],
    speakers: [],
    source: { kind: "mic" },
  };
  return { ...meta, session };
}

// ─── Import SUT after mocks ───────────────────────────────────────────────────

import SessionsLibraryPage from "@/app/sessions/page";

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockListSessions.mockResolvedValue([]);
  mockLoadSession.mockResolvedValue(makeFullSession());
  mockRenameSession.mockResolvedValue(undefined);
  mockDeleteSession.mockResolvedValue(undefined);
  mockPush.mockReset();
});

describe("SessionsLibraryPage — empty state", () => {
  it("shows empty-state message when there are no saved sessions", async () => {
    mockListSessions.mockResolvedValue([]);
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText(/No saved sessions yet/)).toBeTruthy(),
    );
  });
});

describe("SessionsLibraryPage — with sessions", () => {
  const sessions = [
    makeMeta({ id: "sess-1", name: "Morning debate", claim_count: 5, marker_count: 3, speaker_count: 2 }),
    makeMeta({ id: "sess-2", name: "Evening roundup", claim_count: 12, marker_count: 7, speaker_count: 3 }),
  ];

  beforeEach(() => {
    mockListSessions.mockResolvedValue(sessions);
  });

  it("renders both sessions with their names", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );
    expect(screen.getByText("Evening roundup")).toBeTruthy();
  });

  it("renders stats for each session", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );
    expect(screen.getByText("5 claims")).toBeTruthy();
    expect(screen.getByText("12 claims")).toBeTruthy();
  });

  it("clicking a session name calls loadSession, restoreSession, and router.push", async () => {
    const full = makeFullSession();
    full.id = "sess-1";
    mockLoadSession.mockResolvedValue(full);

    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Restore session: Morning debate")).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText("Restore session: Morning debate"));

    await waitFor(() =>
      expect(mockLoadSession).toHaveBeenCalledWith("sess-1"),
    );
    expect(mockRestoreSession).toHaveBeenCalledWith(full.session);
    expect(mockPush).toHaveBeenCalledWith("/session?view=overview");
  });

  it("clicking Rename icon → editing mode; blur saves via renameSession", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    // Click the rename icon button
    fireEvent.click(screen.getByLabelText("Rename session: Morning debate"));

    // Input should appear
    const input = screen.getByLabelText("Rename session");
    expect(input).toBeTruthy();

    // Change name and blur
    fireEvent.change(input, { target: { value: "New name" } });
    fireEvent.blur(input);

    await waitFor(() =>
      expect(mockRenameSession).toHaveBeenCalledWith("sess-1", "New name"),
    );
  });

  it("clicking Delete → confirm prompt → calls deleteSession", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    // Click Delete icon for first session
    fireEvent.click(screen.getByLabelText("Delete session: Morning debate"));

    // Confirm prompt appears
    const confirmBtn = screen.getByLabelText("Confirm delete session: Morning debate");
    expect(confirmBtn).toBeTruthy();

    fireEvent.click(confirmBtn);

    await waitFor(() =>
      expect(mockDeleteSession).toHaveBeenCalledWith("sess-1"),
    );
  });

  it("clicking Cancel in delete confirm does not call deleteSession", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText("Delete session: Morning debate"));
    fireEvent.click(screen.getByText("Cancel"));

    expect(mockDeleteSession).not.toHaveBeenCalled();
  });
});
