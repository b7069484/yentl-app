import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionSource } from "@/lib/types";

const {
  mockReplace,
  mockReset,
  mockSetSource,
  mockSetPendingLaunchFile,
  mockSetPrerecordStage,
} = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  mockReset: vi.fn(),
  mockSetSource: vi.fn(),
  mockSetPendingLaunchFile: vi.fn(),
  mockSetPrerecordStage: vi.fn(),
}));

let mockStartedAt: string | null = null;

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      startedAt: mockStartedAt,
      reset: mockReset,
      setSource: mockSetSource,
      setPendingLaunchFile: mockSetPendingLaunchFile,
      setPrerecordStage: mockSetPrerecordStage,
    };
    return selector ? selector(state) : state;
  }),
}));

import { PWAFileLaunchHandler } from "@/components/session/pwa-file-launch-handler";

type LaunchParams = {
  files?: Array<{ getFile: () => Promise<File> }>;
};

let launchConsumer: ((params: LaunchParams) => void | Promise<void>) | null = null;
let mockSetConsumer: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.clearAllMocks();
  mockStartedAt = null;
  launchConsumer = null;
  mockSetConsumer = vi.fn((consumer) => {
    launchConsumer = consumer;
  });
  Object.defineProperty(window, "launchQueue", {
    configurable: true,
    value: {
      setConsumer: mockSetConsumer,
    },
  });
});

afterEach(() => {
  Reflect.deleteProperty(window, "launchQueue");
});

describe("PWAFileLaunchHandler", () => {
  it("stages a launched text file into the selected source pane", async () => {
    render(<PWAFileLaunchHandler />);
    const file = new File(["Shared transcript"], "launch.txt", { type: "text/plain" });

    await act(async () => {
      await launchConsumer?.({ files: [{ getFile: async () => file }] });
    });

    expect(mockSetConsumer).toHaveBeenCalledOnce();
    expect(mockReset).toHaveBeenCalledOnce();
    expect(mockSetPendingLaunchFile).toHaveBeenCalledWith(file);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "launch.txt",
      mime: "text/plain",
      byte_count: file.size,
      intent: "document",
    } satisfies SessionSource);
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
    expect(mockReplace).toHaveBeenCalledWith("/session");
  });

  it("stages a launched media file into the audio/video pane", async () => {
    render(<PWAFileLaunchHandler />);
    const file = new File(["video"], "clip.mp4", { type: "video/mp4" });

    await act(async () => {
      await launchConsumer?.({ files: [{ getFile: async () => file }] });
    });

    expect(mockSetPendingLaunchFile).toHaveBeenCalledWith(file);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "clip.mp4",
      mime: "video/mp4",
    } satisfies SessionSource);
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
    expect(mockReplace).toHaveBeenCalledWith("/session");
  });

  it.each([
    ["MOV", "phone-recording.mov", "video/quicktime"],
    ["WebM", "screen-recording.webm", "video/webm"],
  ])("stages a launched %s video file into the audio/video pane", async (_label, filename, mime) => {
    render(<PWAFileLaunchHandler />);
    const file = new File(["video"], filename, { type: mime });

    await act(async () => {
      await launchConsumer?.({ files: [{ getFile: async () => file }] });
    });

    expect(mockSetPendingLaunchFile).toHaveBeenCalledWith(file);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename,
      mime,
    } satisfies SessionSource);
    expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
    expect(mockReplace).toHaveBeenCalledWith("/session");
  });

  it("does not overwrite an active session", async () => {
    mockStartedAt = "2026-06-09T04:00:00.000Z";
    render(<PWAFileLaunchHandler />);
    const file = new File(["Shared transcript"], "launch.txt", { type: "text/plain" });

    await act(async () => {
      await launchConsumer?.({ files: [{ getFile: async () => file }] });
    });

    expect(mockReset).not.toHaveBeenCalled();
    expect(mockSetPendingLaunchFile).not.toHaveBeenCalled();
    expect(mockSetSource).not.toHaveBeenCalled();
    expect(mockSetPrerecordStage).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
