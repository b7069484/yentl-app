import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    ...props
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...props}>
      {children}
    </a>
  ),
}));

// ─── Mock session-storage ─────────────────────────────────────────────────────

const mockListSessions = vi.fn<() => Promise<SavedSessionMeta[]>>();
const mockLoadSession = vi.fn<(id: string) => Promise<{ session: Session } & SavedSessionMeta>>();
const mockRenameSession = vi.fn<(id: string, name: string) => Promise<void>>();
const mockDeleteSession = vi.fn<(id: string) => Promise<void>>();
const mockClearAllSessions = vi.fn<() => Promise<void>>();
const mockExportSession = vi.fn();
const mockListCloudSessions = vi.fn();
const mockLoadCloudSession = vi.fn();
const mockRenameCloudSession = vi.fn();
const mockDeleteCloudSession = vi.fn();

vi.mock("@/lib/client/session-storage", () => ({
  listSessions: (...args: unknown[]) => mockListSessions(...args as []),
  loadSession: (...args: unknown[]) => mockLoadSession(...(args as [string])),
  renameSession: (...args: unknown[]) => mockRenameSession(...(args as [string, string])),
  deleteSession: (...args: unknown[]) => mockDeleteSession(...(args as [string])),
  clearAllSessions: (...args: unknown[]) => mockClearAllSessions(...args as []),
}));

vi.mock("@/lib/client/session-sync", async () => {
  const actual = await vi.importActual<typeof import("@/lib/client/session-sync")>(
    "@/lib/client/session-sync",
  );
  return {
    ...actual,
    listCloudSessions: (...args: unknown[]) => mockListCloudSessions(...args),
    loadCloudSession: (...args: unknown[]) => mockLoadCloudSession(...args),
    renameCloudSession: (...args: unknown[]) => mockRenameCloudSession(...args),
    deleteCloudSession: (...args: unknown[]) => mockDeleteCloudSession(...args),
  };
});

vi.mock("@/lib/client/export-actions", () => ({
  exportSession: (...args: unknown[]) => mockExportSession(...args),
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
    source_count: 3,
    source_linked_count: 2,
    high_source_count: 1,
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
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test");
  mockListSessions.mockResolvedValue([]);
  mockLoadSession.mockResolvedValue(makeFullSession());
  mockRenameSession.mockResolvedValue(undefined);
  mockDeleteSession.mockResolvedValue(undefined);
  mockClearAllSessions.mockResolvedValue(undefined);
  mockListCloudSessions.mockResolvedValue({
    ok: false,
    status: "signed_out",
    message: "Sign in to sync saved sessions across devices.",
  });
  mockLoadCloudSession.mockResolvedValue({ ok: true, data: makeFullSession() });
  mockRenameCloudSession.mockResolvedValue({ ok: true, data: true });
  mockDeleteCloudSession.mockResolvedValue({ ok: true, data: true });
  mockPush.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("SessionsLibraryPage — empty state", () => {
  it("skips the account-sync request when cloud auth is not configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    mockListSessions.mockResolvedValue([]);

    render(<SessionsLibraryPage />);

    await waitFor(() =>
      expect(screen.getByText(/Account sync is not configured for this Yentl environment/)).toBeTruthy(),
    );
    expect(mockListCloudSessions).not.toHaveBeenCalled();
    expect(screen.getByText(/No saved sessions yet/)).toBeTruthy();
  });

  it("shows empty-state message when there are no saved sessions", async () => {
    mockListSessions.mockResolvedValue([]);
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText(/No saved sessions yet/)).toBeTruthy(),
    );
    expect(screen.getByText(/adds a snapshot to this library/)).toBeTruthy();
    expect(screen.getByText(/Signed-in saves can sync to your account/)).toBeTruthy();
    expect(screen.getByText(/Sign in to sync saved sessions across devices/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Start a new analysis" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Review local-save privacy" })).toBeTruthy();
  });
});

describe("SessionsLibraryPage — with sessions", () => {
  const sessions = [
    makeMeta({ id: "sess-1", name: "Morning debate", claim_count: 5, marker_count: 3, speaker_count: 2 }),
    makeMeta({
      id: "sess-2",
      name: "Evening roundup",
      source_kind: "youtube",
      claim_count: 12,
      marker_count: 7,
      speaker_count: 3,
      source_count: 4,
      source_linked_count: 1,
      high_source_count: 2,
      duration_sec: 2400,
      saved_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    }),
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
    expect(screen.getAllByText("5 claims").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12 claims").length).toBeGreaterThan(0);
    expect(screen.getAllByText("2/3 linked sources").length).toBeGreaterThan(0);
    expect(screen.getAllByText("1/4 linked sources").length).toBeGreaterThan(0);
  });

  it("renders explicit mobile-friendly resume controls for saved sessions", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Resume session: Morning debate")).toBeTruthy(),
    );

    const resume = screen.getByLabelText("Resume session: Morning debate");
    expect(resume.className).toContain("min-h-11");
    expect(resume.textContent).toContain("Resume");
  });

  it("renders mobile-friendly room display links for saved sessions", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Open room display: Morning debate")).toBeTruthy(),
    );

    const roomLink = screen.getByLabelText("Open room display: Morning debate");
    expect(roomLink).toHaveAttribute("href", "/tv?restore=sess-1");
    expect(roomLink.className).toContain("min-h-11");
    expect(roomLink.textContent).toContain("Room");
  });

  it("renders mobile-friendly export controls for saved sessions", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Export session: Morning debate")).toBeTruthy(),
    );

    const exportButton = screen.getByLabelText("Export session: Morning debate");
    expect(exportButton.className).toContain("min-h-11");

    fireEvent.click(exportButton);

    expect(screen.getByLabelText("Export report: Morning debate")).toBeTruthy();
    expect(screen.getByLabelText("Export Markdown: Morning debate")).toBeTruthy();
    expect(screen.getByLabelText("Export transcript: Morning debate")).toBeTruthy();
    expect(screen.getByLabelText("Export JSON: Morning debate")).toBeTruthy();
  });

  it("searches saved sessions by name", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Search saves"), {
      target: { value: "evening" },
    });

    expect(screen.queryByText("Morning debate")).toBeNull();
    expect(screen.getByText("Evening roundup")).toBeTruthy();
    expect(screen.getByText(/Showing 1 of 2 saved sessions/i)).toBeTruthy();
  });

  it("searches saved sessions by source evidence", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Search saves"), {
      target: { value: "2 linked" },
    });

    expect(screen.getByText("Morning debate")).toBeTruthy();
    expect(screen.queryByText("Evening roundup")).toBeNull();
    expect(screen.getByText(/Showing 1 of 2 saved sessions/i)).toBeTruthy();
  });


  it("filters saved sessions by source type", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Source"), {
      target: { value: "youtube" },
    });

    expect(screen.queryByText("Morning debate")).toBeNull();
    expect(screen.getByText("Evening roundup")).toBeTruthy();
  });

  it("sorts saved sessions by highest claim count", async () => {
    const { container } = render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Sort"), {
      target: { value: "claims" },
    });

    const text = container.textContent ?? "";
    expect(text.indexOf("Evening roundup")).toBeGreaterThan(-1);
    expect(text.indexOf("Morning debate")).toBeGreaterThan(-1);
    expect(text.indexOf("Evening roundup")).toBeLessThan(text.indexOf("Morning debate"));
  });

  it("shows an empty filtered state and can reset the library view", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.change(screen.getByLabelText("Search saves"), {
      target: { value: "nonexistent archive" },
    });

    expect(screen.getByText(/No saved sessions match this view/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Reset library view" }));
    expect(screen.getByText("Morning debate")).toBeTruthy();
    expect(screen.getByText("Evening roundup")).toBeTruthy();
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

  it("restores a cloud-only saved session from account sync", async () => {
    const cloudMeta = makeMeta({ id: "cloud-1", name: "Synced from laptop" });
    const full = makeFullSession();
    full.id = "cloud-1";
    full.name = "Synced from laptop";
    mockListSessions.mockResolvedValue([]);
    mockListCloudSessions.mockResolvedValue({ ok: true, data: [cloudMeta] });
    mockLoadCloudSession.mockResolvedValue({ ok: true, data: full });

    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Synced from laptop")).toBeTruthy(),
    );
    expect(screen.getByText("Cloud")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Resume session: Synced from laptop"));

    await waitFor(() =>
      expect(mockLoadCloudSession).toHaveBeenCalledWith("cloud-1"),
    );
    expect(mockLoadSession).not.toHaveBeenCalled();
    expect(mockRestoreSession).toHaveBeenCalledWith(full.session);
    expect(mockPush).toHaveBeenCalledWith("/session?view=overview");
  });

  it("exports a saved session without restoring the live workspace", async () => {
    const full = makeFullSession();
    full.id = "sess-1";
    mockLoadSession.mockResolvedValue(full);

    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Export session: Morning debate")).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText("Export session: Morning debate"));
    fireEvent.click(screen.getByLabelText("Export Markdown: Morning debate"));

    await waitFor(() =>
      expect(mockLoadSession).toHaveBeenCalledWith("sess-1"),
    );
    expect(mockExportSession).toHaveBeenCalledWith(full.session, "markdown");
    expect(mockRestoreSession).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("exports a saved session transcript without restoring the live workspace", async () => {
    const full = makeFullSession();
    full.id = "sess-1";
    mockLoadSession.mockResolvedValue(full);

    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Export session: Morning debate")).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText("Export session: Morning debate"));
    fireEvent.click(screen.getByLabelText("Export transcript: Morning debate"));

    await waitFor(() =>
      expect(mockLoadSession).toHaveBeenCalledWith("sess-1"),
    );
    expect(mockExportSession).toHaveBeenCalledWith(full.session, "transcript");
    expect(mockRestoreSession).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("shows a visible error if saved-session export fails", async () => {
    mockLoadSession.mockRejectedValueOnce(new Error("Saved session is missing"));

    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByLabelText("Export session: Morning debate")).toBeTruthy(),
    );

    fireEvent.click(screen.getByLabelText("Export session: Morning debate"));
    fireEvent.click(screen.getByLabelText("Export JSON: Morning debate"));

    await waitFor(() =>
      expect(screen.getByText("Saved session is missing")).toBeTruthy(),
    );
    expect(mockExportSession).not.toHaveBeenCalled();
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

  it("requires confirmation before clearing every local save", async () => {
    render(<SessionsLibraryPage />);
    await waitFor(() =>
      expect(screen.getByText("Morning debate")).toBeTruthy(),
    );

    fireEvent.click(screen.getByRole("button", { name: "Clear local saves" }));
    expect(mockClearAllSessions).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Clear all local saves" }));

    await waitFor(() =>
      expect(mockClearAllSessions).toHaveBeenCalledOnce(),
    );
    expect(screen.getByText(/No saved sessions yet/i)).toBeTruthy();
  });
});
