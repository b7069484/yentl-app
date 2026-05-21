import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserTabIngestPane } from "@/components/session/ingest-panes/browser-tab-ingest-pane";

const mockSetPrerecordStage = vi.fn();
const mockSetBrowserTabStatus = vi.fn();
const mockSetSource = vi.fn();
const mockCheckBrowserTabCaptureStatus = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
      setBrowserTabStatus: mockSetBrowserTabStatus,
      setSource: mockSetSource,
      browserTabStatus: {
        phase: "waiting_for_extension",
        message: "No extension response yet.",
      },
    };
    return selector ? selector(state) : state;
  }),
}));

vi.mock("@/components/session/ExtensionBridge", () => ({
  checkBrowserTabCaptureStatus: () => mockCheckBrowserTabCaptureStatus(),
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

describe("BrowserTabIngestPane", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("explains the Chrome-only extension path and offers real functional samples", () => {
    render(<BrowserTabIngestPane />);

    expect(screen.getByText("Analyze any video in place")).toBeTruthy();
    expect(screen.getByText(/This check only works in Chrome/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open real test page/i })).toHaveAttribute(
      "href",
      "/validation/browser-capture.html",
    );
    expect(screen.getByRole("link", { name: /Validation lab/i })).toHaveAttribute(
      "href",
      "/project/validation",
    );
    expect(screen.getAllByRole("link", { name: /Open working sample/i })[0])
      .toHaveAttribute("href", "/session?sample=solo_005&view=watch");
    expect(screen.getAllByRole("link", { name: /Open working sample/i })[1])
      .toHaveAttribute("href", "/session?sample=cable_008&view=watch");
    expect(screen.getAllByRole("link", { name: /Open working sample/i })[2])
      .toHaveAttribute("href", "/session?sample=israel_010&view=watch");
  });

  it("checks extension status when requested", () => {
    render(<BrowserTabIngestPane />);

    fireEvent.click(screen.getByRole("button", { name: /Check extension/i }));
    expect(mockCheckBrowserTabCaptureStatus).toHaveBeenCalledOnce();
  });
});
