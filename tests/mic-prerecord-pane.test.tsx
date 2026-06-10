import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MicPreRecordPane } from "@/components/session/ingest-panes/mic-prerecord-pane";

const mockStartSession = vi.fn();
const mockSetPrerecordStage = vi.fn();
const mockSetMicDeviceId = vi.fn();
const mockSetMicConsentAccepted = vi.fn((accepted: boolean) => {
  mockMicConsentAccepted = accepted;
});
let mockMicDeviceId: string | null = null;
let mockMicConsentAccepted = false;

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      startSession: mockStartSession,
      setPrerecordStage: mockSetPrerecordStage,
      micDeviceId: mockMicDeviceId,
      setMicDeviceId: mockSetMicDeviceId,
      micConsentAccepted: mockMicConsentAccepted,
      setMicConsentAccepted: mockSetMicConsentAccepted,
    };
    return selector ? selector(state) : state;
  }),
}));

describe("MicPreRecordPane", () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.clearAllMocks();
    mockMicDeviceId = null;
    mockMicConsentAccepted = false;
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue([]),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: originalNavigator,
    });
  });

  it("offers an escape back to source selection before recording starts", () => {
    render(<MicPreRecordPane />);

    fireEvent.click(screen.getByRole("button", { name: /Back to sources/i }));

    expect(mockSetPrerecordStage).toHaveBeenCalledWith("picker");
  });

  it("requires consent before starting a microphone session", () => {
    const { rerender } = render(<MicPreRecordPane />);

    const startButton = screen.getByRole("button", { name: /Start a session/i });
    expect(startButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText(/I have permission to record/i));
    expect(mockSetMicConsentAccepted).toHaveBeenCalledWith(true);
    rerender(<MicPreRecordPane />);

    fireEvent.click(screen.getByRole("button", { name: /Start a session/i }));
    expect(mockStartSession).toHaveBeenCalledOnce();
    expect(screen.getByText(/Before recording/i)).toBeTruthy();
    expect(screen.getByText(/Phone or tablet/i)).toBeTruthy();
  });

  it("shows available microphones and stores the selected input", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          enumerateDevices: vi.fn().mockResolvedValue([
            { kind: "audioinput", deviceId: "usb-mic", label: "USB microphone" },
            { kind: "videoinput", deviceId: "camera", label: "Camera" },
          ]),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
    });

    render(<MicPreRecordPane />);

    expect(await screen.findByRole("option", { name: "USB microphone" })).toBeTruthy();
    fireEvent.change(screen.getByLabelText(/Microphone input/i), {
      target: { value: "usb-mic" },
    });

    expect(mockSetMicDeviceId).toHaveBeenCalledWith("usb-mic");
  });

  it("announces when microphone device choices are unavailable", async () => {
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {},
    });

    render(<MicPreRecordPane />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Microphone choices are not available in this browser.",
    );
  });

  it("recovers the microphone list after permission is allowed", async () => {
    const enumerateDevices = vi.fn()
      .mockRejectedValueOnce(new Error("Permission denied"))
      .mockResolvedValueOnce([
        { kind: "audioinput", deviceId: "allowed-mic", label: "Allowed microphone" },
      ]);

    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: {
        mediaDevices: {
          enumerateDevices,
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        },
      },
    });

    render(<MicPreRecordPane />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Microphone choices will appear after browser permission is allowed.",
    );

    fireEvent.click(screen.getByRole("button", { name: /Refresh microphone list/i }));

    expect(await screen.findByRole("option", { name: "Allowed microphone" })).toBeTruthy();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Choose a specific input if the browser default is wrong.",
    );
  });
});
