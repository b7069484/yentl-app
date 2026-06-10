import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SavedSession } from "@/lib/client/session-storage";
import type { Session } from "@/lib/types";

const mockLoadSession = vi.fn<(id: string) => Promise<SavedSession>>();
const mockLoadCloudSession = vi.fn<(id: string) => Promise<
  | { ok: true; data: SavedSession }
  | { ok: false; status: "signed_out" | "unavailable" | "not_found" | "error"; message: string }
>>();

vi.mock("@/lib/client/session-storage", () => ({
  loadSession: (...args: unknown[]) => mockLoadSession(...(args as [string])),
}));

vi.mock("@/lib/client/session-sync", () => ({
  loadCloudSession: (...args: unknown[]) => mockLoadCloudSession(...(args as [string])),
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

import { SavedSessionHydrator } from "@/components/session/saved-session-hydrator";
import { useSession } from "@/lib/client/session-store";

function makeSession(): Session {
  return {
    title: "Original council hearing",
    started_at: "2026-06-09T01:00:00.000Z",
    transcript: [
      { text: "The budget vote happened last night.", start: 0, end: 4, is_final: true, speaker_id: 0 },
    ],
    claims: [],
    markers: [],
    speakers: [{ id: 0, label: "Chair" }],
    source: { kind: "mic" },
  };
}

function makeSavedSession(id = "saved-1"): SavedSession {
  const session = makeSession();
  return {
    id,
    name: "Saved council hearing",
    source_kind: "mic",
    saved_at: "2026-06-09T02:00:00.000Z",
    started_at: session.started_at,
    ended_at: null,
    claim_count: 0,
    marker_count: 0,
    speaker_count: 1,
    source_count: 0,
    source_linked_count: 0,
    high_source_count: 0,
    duration_sec: 60,
    session,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  useSession.getState().reset();
  mockLoadSession.mockResolvedValue(makeSavedSession());
  mockLoadCloudSession.mockResolvedValue({
    ok: false,
    status: "signed_out",
    message: "Sign in to sync saved sessions across devices.",
  });
});

describe("SavedSessionHydrator", () => {
  it("renders children immediately when no restore id is present", () => {
    render(
      <SavedSessionHydrator restoreId={null}>
        <div>Room dashboard</div>
      </SavedSessionHydrator>,
    );

    expect(screen.getByText("Room dashboard")).toBeTruthy();
    expect(mockLoadSession).not.toHaveBeenCalled();
  });

  it("loads a saved session before rendering the room dashboard", async () => {
    render(
      <SavedSessionHydrator restoreId="saved-1">
        <div>Room dashboard</div>
      </SavedSessionHydrator>,
    );

    expect(screen.getByRole("heading", { name: "Opening saved session." })).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Room dashboard")).toBeTruthy());
    expect(mockLoadSession).toHaveBeenCalledWith("saved-1");
    expect(useSession.getState().title).toBe("Saved council hearing");
    expect(useSession.getState().transcript).toHaveLength(1);
  });

  it("falls back to account sync when the TV saved session is not local", async () => {
    mockLoadSession.mockRejectedValueOnce(new Error("Session not found: cloud-tv"));
    mockLoadCloudSession.mockResolvedValueOnce({
      ok: true,
      data: makeSavedSession("cloud-tv"),
    });

    render(
      <SavedSessionHydrator restoreId="cloud-tv">
        <div>Room dashboard</div>
      </SavedSessionHydrator>,
    );

    expect(screen.getByRole("heading", { name: "Opening saved session." })).toBeTruthy();

    await waitFor(() => expect(screen.getByText("Room dashboard")).toBeTruthy());
    expect(mockLoadSession).toHaveBeenCalledWith("cloud-tv");
    expect(mockLoadCloudSession).toHaveBeenCalledWith("cloud-tv");
    expect(useSession.getState().title).toBe("Saved council hearing");
    expect(useSession.getState().transcript).toHaveLength(1);
  });

  it("shows a TV-scoped error state when the saved session is missing locally and in sync", async () => {
    mockLoadSession.mockRejectedValueOnce(new Error("Session not found: missing-id"));
    mockLoadCloudSession.mockResolvedValueOnce({
      ok: false,
      status: "not_found",
      message: "Session not found: missing-id",
    });

    render(
      <SavedSessionHydrator restoreId="missing-id">
        <div>Room dashboard</div>
      </SavedSessionHydrator>,
    );

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Saved session not found." })).toBeTruthy(),
    );
    expect(screen.getByText(/could not open that saved session locally or in account sync/i)).toBeTruthy();
    expect(screen.getByText("Session not found: missing-id")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open saved sessions" })).toHaveAttribute("href", "/sessions");
    expect(screen.getByRole("link", { name: "Open room mode" })).toHaveAttribute("href", "/tv");
    expect(screen.queryByText("Room dashboard")).toBeNull();
  });
});
