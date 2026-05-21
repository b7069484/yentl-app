import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { ExtensionPanelView } from "@/components/session/extension-panel-view";
import { useSession } from "@/lib/client/session-store";
import type { ClaimCard, RhetoricMarker, TranscriptSegment } from "@/lib/types";

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
    useSession.getState().reset();
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

    expect(screen.getByText("Waiting")).toBeTruthy();
    expect(screen.getByText("Fixture video")).toBeTruthy();
    expect(screen.getByText("example.com")).toBeTruthy();
    expect(screen.getByText("Waiting for the extension")).toBeTruthy();
    expect(screen.queryByText(/How would you like to fact-check/i)).toBeNull();
  });

  it("shows live transcript, verdict summary, marker summary, and expandable evidence without desktop chrome", () => {
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

    render(<ExtensionPanelView />);

    expect(screen.getByText("Transcribing")).toBeTruthy();
    expect(screen.getByText("Council hearing")).toBeTruthy();
    expect(screen.getByText("Building the live transcript")).toBeTruthy();
    expect(screen.getByText(/doubled the budget without showing/i)).toBeTruthy();
    expect(screen.getByText("3 claims · 2 false/misleading")).toBeTruthy();
    expect(screen.getByText("1 markers · 1 clear/blatant")).toBeTruthy();
    expect(screen.getByText("Claims (3)")).toBeTruthy();
    expect(screen.getByText("Markers (1)")).toBeTruthy();
    expect(screen.getByText("FALSE")).toBeTruthy();
    expect(screen.getByText("Loaded language")).toBeTruthy();
    expect(screen.queryByText("Overview")).toBeNull();
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
    expect(screen.getByText("UNVERIFIABLE")).toBeTruthy();
    expect(screen.getByText("Premature certainty")).toBeTruthy();
    expect(screen.queryByText("Overview")).toBeNull();
  });
});
