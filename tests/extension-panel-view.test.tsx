import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ExtensionPanelView } from "@/components/session/extension-panel-view";
import { useSession } from "@/lib/client/session-store";
import type { ClaimCard, RhetoricMarker, TranscriptSegment } from "@/lib/types";

const mocks = vi.hoisted(() => ({
  exportSession: vi.fn(),
  loadSession: vi.fn(),
  saveSession: vi.fn(),
}));

vi.mock("@/lib/client/export-actions", () => ({
  exportSession: (...args: unknown[]) => mocks.exportSession(...args),
}));

vi.mock("@/lib/client/session-storage", () => ({
  loadSession: (...args: unknown[]) => mocks.loadSession(...args),
  saveSession: (...args: unknown[]) => mocks.saveSession(...args),
}));

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    className,
    target,
  }: {
    href: string;
    children: ReactNode;
    className?: string;
    target?: string;
  }) => (
    <a href={href} className={className} target={target}>
      {children}
    </a>
  ),
}));

function makeSegment(overrides: Partial<TranscriptSegment> = {}): TranscriptSegment {
  return {
    text: "The city doubled the budget without showing the public the audit.",
    start: 12,
    end: 17,
    is_final: true,
    speaker_id: 0,
    ...overrides,
  };
}

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "claim-1",
    claim_text: "The city doubled the budget.",
    utterance_start: 12,
    utterance_end: 17,
    speaker_id: 0,
    topic: "budget",
    topic_secondary: null,
    primary_label: "UNVERIFIABLE",
    score: 42,
    annotations: [],
    explanation: "",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

function makeMarker(overrides: Partial<RhetoricMarker> = {}): RhetoricMarker {
  return {
    id: "marker-1",
    type: "rhetoric",
    name: "loaded-language",
    display: "Loaded language",
    excerpt: "reckless officials hid the truth",
    speaker_id: 0,
    start_time: 12,
    end_time: 17,
    severity: "clear",
    explanation: "The phrase assigns motive before evidence is shown.",
    ...overrides,
  };
}

describe("ExtensionPanelView", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.exportSession.mockReset();
    mocks.loadSession.mockReset();
    mocks.saveSession.mockReset();
    useSession.getState().reset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders a compact waiting state for the same-page Chrome extension panel", () => {
    useSession.getState().setSource({
      kind: "browser_tab",
      title: "Fixture video",
      url: "https://example.com/watch",
    });
    useSession.getState().setBrowserTabStatus({
      phase: "waiting_for_extension",
      message: "Waiting for the Yentl extension to attach to this page.",
      updatedAt: Date.now(),
    });

    render(<ExtensionPanelView />);

    expect(screen.getAllByText("Waiting").length).toBeGreaterThan(0);
    expect(screen.getByText("Fixture video")).toBeTruthy();
    expect(screen.getByText("example.com")).toBeTruthy();
    expect(screen.getByText("Waiting for the extension")).toBeTruthy();
    const strip = screen.getByTestId("extension-signal-strip");
    expect(within(strip).getByText("Claim risk")).toBeTruthy();
    expect(within(strip).getByText("Rhetoric heat")).toBeTruthy();
    expect(within(strip).getByText("Evidence state")).toBeTruthy();
    expect(within(strip).getByText("Pulse")).toBeTruthy();
    expect(screen.queryByText(/How would you like to fact-check/i)).toBeNull();
  });

  it("shows transcript highlights, tabbed claim checks, marker details, and Grok challenge without desktop chrome", () => {
    useSession.getState().setSource({
      kind: "browser_tab",
      title: "Council hearing",
      url: "https://news.example/video",
    });
    useSession.getState().startSession("Browser tab: Council hearing");
    useSession.getState().setBrowserTabStatus({
      phase: "transcribing",
      message: "Transcribing browser audio.",
      updatedAt: Date.now(),
    });
    useSession.getState().appendFinal(makeSegment());
    useSession.getState().addClaim(makeClaim({
      id: "claim-1",
      primary_label: "FALSE",
      claim_text: "The city doubled the budget.",
    }));
    useSession.getState().addClaim(makeClaim({
      id: "claim-2",
      primary_label: "MISLEADING",
      claim_text: "The audit was hidden from everyone.",
    }));
    useSession.getState().addClaim(makeClaim({
      id: "claim-3",
      primary_label: "TRUE",
      claim_text: "The council discussed the library budget.",
    }));
    useSession.getState().addMarker(makeMarker());
    useSession.getState().setDevilAdvocate({
      state: "fresh",
      brief: {
        stance: "A skeptic would ask whether the audit claim outruns the visible evidence.",
        strongest_counterarguments: [
          "The claim may be directionally true but missing the base-year comparison.",
          "The transcript does not show whether the audit was public elsewhere.",
          "Loaded phrasing is a marker, not proof that the underlying claim is false.",
        ],
        weakest_assumption: "The weakest assumption is that absence in this clip means absence in the record.",
        questions: [
          "Where is the audit publication log?",
          "Which budget year is being compared?",
        ],
        confidence: "medium",
        model: "xai/grok-4.1-fast-reasoning",
      },
      at: Date.now(),
    });

    render(<ExtensionPanelView />);

    expect(screen.getByText("Transcribing")).toBeTruthy();
    expect(screen.getByText("Council hearing")).toBeTruthy();
    expect(screen.getByText("Building the live transcript")).toBeTruthy();
    const strip = screen.getByTestId("extension-signal-strip");
    expect(within(strip).getByText("Claim risk")).toBeTruthy();
    expect(within(strip).getByText("High")).toBeTruthy();
    expect(within(strip).getByText("Evidence state")).toBeTruthy();
    expect(screen.getByText(/doubled the budget without showing/i)).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Transcript/i })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: /Claims/i })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Markers/i })).toBeTruthy();
    expect(screen.queryByText("Devil's advocate")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Claims/i }));

    expect(screen.getByText("3 claims · 2 false/misleading")).toBeTruthy();
    expect(screen.getAllByText("False").length).toBeGreaterThan(0);
    expect(screen.getByText("Devil's advocate")).toBeTruthy();
    expect(screen.getByText("Grok")).toBeTruthy();
    expect(screen.getByText(/audit claim outruns the visible evidence/i)).toBeTruthy();
    expect(screen.getByText("Counterpoints and questions")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Report" }));
    expect(mocks.exportSession).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Browser tab: Council hearing" }),
      "report",
    );

    fireEvent.click(screen.getByRole("tab", { name: /Markers/i }));

    expect(screen.getByText("1 markers · 1 clear/blatant")).toBeTruthy();
    expect(screen.getByText("Loaded language")).toBeTruthy();
    expect(screen.queryByText("Overview")).toBeNull();
  });

  it("saves the current panel state before opening the full workspace", async () => {
    const openedWindow = {
      location: { href: "about:blank" },
      close: vi.fn(),
    };
    vi.spyOn(window, "open").mockReturnValue(openedWindow as unknown as Window);
    let resolveSave!: (value: { id: string }) => void;
    mocks.saveSession.mockReturnValue(new Promise((resolve) => {
      resolveSave = resolve;
    }));
    mocks.loadSession.mockResolvedValue({ session: {} });

    useSession.getState().setSource({
      kind: "browser_tab",
      title: "Panel video",
      url: "https://example.com/video",
    });
    useSession.getState().startSession("Browser tab: Panel video");
    useSession.getState().appendFinal(makeSegment());

    render(<ExtensionPanelView />);

    fireEvent.click(screen.getByRole("button", { name: /Open snapshot/i }));

    expect(await screen.findByText("Saving...")).toBeTruthy();
    resolveSave({ id: "saved-session-1" });
    await waitFor(() => {
      expect(mocks.saveSession).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Browser tab: Panel video",
          transcript: expect.arrayContaining([
            expect.objectContaining({ text: expect.stringContaining("city doubled the budget") }),
          ]),
        }),
        { name: "Browser tab: Panel video" },
      );
      expect(mocks.loadSession).toHaveBeenCalledWith("saved-session-1");
      expect(openedWindow.location.href).toContain("/session?restore=saved-session-1&view=overview");
    });
  });

  it("populates transcript and evidence in validation demo mode", async () => {
    window.history.pushState(
      {},
      "",
      "/session?surface=extension-panel&source=browser-tab&bridge=preview&title=Fixture%20video&demo=validation",
    );

    render(<ExtensionPanelView />);

    expect(await screen.findByText("Transcribing")).toBeTruthy();
    expect(screen.getAllByText(/library budget increased by 12 percent/i).length).toBeGreaterThanOrEqual(1);

    fireEvent.click(screen.getByRole("tab", { name: /Claims/i }));

    expect(screen.getAllByText("No reliable backing").length).toBeGreaterThan(0);
    expect(screen.getByText("Devil's advocate")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Markers/i }));

    expect(screen.getAllByText("Premature certainty").length).toBeGreaterThan(0);
    expect(screen.queryByText("Overview")).toBeNull();
  });

  it("does not populate validation fixtures when the demo is disabled", () => {
    vi.stubEnv("NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO", "1");
    window.history.pushState(
      {},
      "",
      "/session?surface=extension-panel&source=browser-tab&bridge=preview&title=Fixture%20video&demo=validation",
    );

    render(<ExtensionPanelView />);

    expect(screen.getAllByText("Preparing").length).toBeGreaterThan(0);
    expect(screen.queryByText(/library budget increased by 12 percent/i)).toBeNull();
    expect(screen.queryByText("Premature certainty")).toBeNull();
  });
});
