import { act, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  APP_BRIDGE_SOURCE,
  EXTENSION_MESSAGE_SOURCE,
  ExtensionBridge,
} from "@/components/session/ExtensionBridge";
import { useSession } from "@/lib/client/session-store";

const mocks = vi.hoisted(() => ({
  onFinalUtterance: vi.fn(),
  runFinalSynthesis: vi.fn(),
}));

vi.mock("@/lib/client/orchestrator", () => ({
  onFinalUtterance: (...args: unknown[]) => mocks.onFinalUtterance(...args),
  runFinalSynthesis: (...args: unknown[]) => mocks.runFinalSynthesis(...args),
}));

function dispatchExtensionMessage(data: unknown) {
  window.dispatchEvent(
    new MessageEvent("message", {
      data,
      origin: window.location.origin,
      source: window,
    }),
  );
}

describe("ExtensionBridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/session");
    useSession.getState().reset();
  });

  it("announces readiness for the content script", async () => {
    const readySpy = vi.fn();
    window.addEventListener("message", readySpy);
    render(<ExtensionBridge />);

    await waitFor(() => {
      expect(readySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { source: APP_BRIDGE_SOURCE, type: "bridge-ready" },
        }),
      );
    });

    window.removeEventListener("message", readySpy);
  });

  it("includes the bridge token when mounted inside an extension panel URL", async () => {
    window.history.pushState({}, "", "/session?surface=extension-panel&bridge=test-token");
    const readySpy = vi.fn();
    window.addEventListener("message", readySpy);
    render(<ExtensionBridge />);

    await waitFor(() => {
      expect(readySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            source: APP_BRIDGE_SOURCE,
            type: "bridge-ready",
            bridgeToken: "test-token",
          },
        }),
      );
    });

    window.removeEventListener("message", readySpy);
  });

  it("starts a browser-tab session from capture-start", () => {
    render(<ExtensionBridge />);

    act(() => {
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-start",
        payload: {
          tab_id: 42,
          title: "A debate clip",
          url: "https://example.com/watch",
        },
      });
    });

    const state = useSession.getState();
    expect(state.startedAt).not.toBeNull();
    expect(state.isRecording).toBe(true);
    expect(state.source).toEqual({
      kind: "browser_tab",
      tab_id: 42,
      title: "A debate clip",
      url: "https://example.com/watch",
    });
    expect(state.title).toBe("Browser tab: A debate clip");
    expect(state.browserTabStatus.phase).toBe("extension_connected");
  });

  it("appends final transcript segments and runs the existing pipeline", () => {
    render(<ExtensionBridge />);

    act(() => {
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-start",
        payload: { title: "Live video" },
      });
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "transcript-final",
        payload: {
          text: "This claim should be checked.",
          start: 1.25,
          end: 3.5,
          speaker_id: 0,
        },
      });
    });

    expect(useSession.getState().transcript).toEqual([
      {
        text: "This claim should be checked.",
        start: 1.25,
        end: 3.5,
        is_final: true,
        speaker_id: 0,
      },
    ]);
    expect(mocks.onFinalUtterance).toHaveBeenCalledWith(
      expect.objectContaining({ text: "This claim should be checked." }),
    );
  });

  it("analyzes readable page text from a real active tab even before audio arrives", () => {
    render(<ExtensionBridge />);

    act(() => {
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "page-text",
        payload: {
          title: "Real article",
          url: "https://en.wikinews.org/wiki/Real_article",
          source_context: {
            page_title: "Real article",
            site_name: "Wikinews",
            author_name: "Reporter Name",
            detected_names: ["Reporter Name"],
          },
          chunks: [
            {
              text: "Officials ordered residents to shelter in place after a gas leak while crews tested the air.",
              start: 0,
              end: 1,
            },
          ],
        },
      });
    });

    const state = useSession.getState();
    expect(state.startedAt).not.toBeNull();
    expect(state.isRecording).toBe(true);
    expect(state.source).toEqual({
      kind: "browser_tab",
      title: "Real article",
      url: "https://en.wikinews.org/wiki/Real_article",
      context: {
        page_title: "Real article",
        site_name: "Wikinews",
        author_name: "Reporter Name",
        detected_names: ["Reporter Name"],
      },
    });
    expect(state.browserTabStatus.phase).toBe("transcribing");
    expect(state.browserTabStatus.message).toContain("Page text captured");
    expect(state.transcript).toEqual([
      {
        text: "Officials ordered residents to shelter in place after a gas leak while crews tested the air.",
        start: 0,
        end: 1,
        is_final: true,
        speaker_id: null,
      },
    ]);
    expect(mocks.onFinalUtterance).toHaveBeenCalledWith(
      expect.objectContaining({ speaker_id: null }),
    );
  });

  it("merges page source context before speech arrives", () => {
    render(<ExtensionBridge />);

    act(() => {
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "page-context",
        payload: {
          title: "Tucker Debates Kevin O'Leary",
          url: "https://www.youtube.com/watch?v=test",
          source_context: {
            page_title: "Tucker Debates Kevin O'Leary",
            site_name: "YouTube",
            channel_name: "Tucker Carlson",
            detected_names: ["Tucker Carlson", "Kevin Leary"],
          },
        },
      });
    });

    const state = useSession.getState();
    expect(state.startedAt).not.toBeNull();
    expect(state.source).toEqual({
      kind: "browser_tab",
      title: "Tucker Debates Kevin O'Leary",
      url: "https://www.youtube.com/watch?v=test",
      context: {
        page_title: "Tucker Debates Kevin O'Leary",
        site_name: "YouTube",
        channel_name: "Tucker Carlson",
        detected_names: ["Tucker Carlson", "Kevin Leary"],
      },
    });
  });

  it("surfaces a connected-but-no-speech status from the offscreen capture path", () => {
    render(<ExtensionBridge />);

    act(() => {
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-start",
        payload: { title: "Silent video", url: "https://example.com/silent" },
      });
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-status",
        payload: {
          running: true,
          phase: "no_audio_detected",
          message: "Yentl is connected, but no speech has been transcribed yet.",
        },
      });
    });

    const state = useSession.getState();
    expect(state.browserTabStatus.phase).toBe("no_audio_detected");
    expect(state.browserTabStatus.title).toBe("Silent video");
    expect(state.browserTabStatus.url).toBe("https://example.com/silent");
    expect(state.browserTabStatus.message).toContain("no speech");
  });

  it("ends the session and runs final synthesis on capture-stop", () => {
    render(<ExtensionBridge />);

    act(() => {
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-start",
        payload: { title: "Live video" },
      });
      dispatchExtensionMessage({
        source: EXTENSION_MESSAGE_SOURCE,
        type: "capture-stop",
      });
    });

    expect(useSession.getState().endedAt).not.toBeNull();
    expect(useSession.getState().isRecording).toBe(false);
    expect(mocks.runFinalSynthesis).toHaveBeenCalledTimes(1);
  });
});
