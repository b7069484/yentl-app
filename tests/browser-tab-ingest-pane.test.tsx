import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BrowserTabIngestPane } from "@/components/session/ingest-panes/browser-tab-ingest-pane";

const mockSetPrerecordStage = vi.fn();
const mockSetBrowserTabStatus = vi.fn();
const mockSetSource = vi.fn();
const mockCheckBrowserTabCaptureStatus = vi.fn();
let mockBrowserTabStatus = {
  phase: "waiting_for_extension",
  message: "No extension response yet.",
};

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setPrerecordStage: mockSetPrerecordStage,
      setBrowserTabStatus: mockSetBrowserTabStatus,
      setSource: mockSetSource,
      browserTabStatus: mockBrowserTabStatus,
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
    mockBrowserTabStatus = {
      phase: "waiting_for_extension",
      message: "No extension response yet.",
    };
  });

  it("explains the Chrome-only extension path without internal validation links", () => {
    render(<BrowserTabIngestPane />);

    expect(screen.getByText("Use the desktop Chrome extension")).toBeTruthy();
    expect(screen.getByText(/This check only works in Chrome/i)).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Open real test page/i })).toBeNull();
    expect(screen.queryByRole("link", { name: /Validation lab/i })).toBeNull();
    expect(screen.queryByText(/Functional samples/i)).toBeNull();
    expect(screen.queryByText(/Open working sample/i)).toBeNull();
    expect(screen.queryByText(/localhost:3000/i)).toBeNull();
  });

  it("checks extension status when requested", () => {
    render(<BrowserTabIngestPane />);

    fireEvent.click(screen.getByRole("button", { name: /Check extension/i }));
    expect(mockCheckBrowserTabCaptureStatus).toHaveBeenCalledOnce();
  });

  it("enters a clear Chrome extension waiting state from the primary check", () => {
    render(<BrowserTabIngestPane />);

    fireEvent.click(screen.getByRole("button", { name: /Check in-page extension/i }));

    expect(mockSetSource).toHaveBeenCalledWith({ kind: "browser_tab" });
    expect(mockSetBrowserTabStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: "waiting_for_extension",
        message: expect.stringContaining("Chrome extension"),
      }),
    );
    expect(mockCheckBrowserTabCaptureStatus).toHaveBeenCalledOnce();
    expect(screen.getByText(/Waiting for Chrome extension/i)).toBeTruthy();
  });

  it("shows recovery actions when browser capture errors", () => {
    mockBrowserTabStatus = {
      phase: "error",
      message: "Selected-tab audio permission was denied.",
    };
    render(<BrowserTabIngestPane />);

    expect(screen.getByText("Browser capture needs a different path")).toBeTruthy();
    expect(screen.getAllByText(/Selected-tab audio permission was denied/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("button", { name: /Upload recording/i }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "",
      mime: "",
    });
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
  });

  it("routes no-audio tab capture to alternate source paths", () => {
    mockBrowserTabStatus = {
      phase: "no_audio_detected",
      message: "No speech detected.",
    };
    render(<BrowserTabIngestPane />);

    expect(screen.getByText(/did not hear usable speech/i)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Use media URL/i }));
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "media_url", url: "" });

    fireEvent.click(screen.getByRole("button", { name: /Paste text/i }));
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "",
      byte_count: 0,
    });

    fireEvent.click(screen.getByRole("button", { name: /Use microphone/i }));
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "mic" });
  });

  it("surfaces selected-tab-changed recovery copy", () => {
    mockBrowserTabStatus = {
      phase: "tab_changed",
      message: "Yentl is still listening to \"Original video\". Return to that tab to keep the page and analysis together.",
    };
    render(<BrowserTabIngestPane />);

    expect(screen.getByText("Browser capture needs a different path")).toBeTruthy();
    expect(screen.getAllByText(/Original video/i).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: /Use media URL/i })).toBeTruthy();
  });
});
