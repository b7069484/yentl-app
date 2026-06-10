import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ─── Mock session store ───────────────────────────────────────────────────────

const mockSetSource = vi.fn();
const mockSetPrerecordStage = vi.fn();

vi.mock("@/lib/client/session-store", () => ({
  useSession: vi.fn((selector?: (s: unknown) => unknown) => {
    const state = {
      setSource: mockSetSource,
      setPrerecordStage: mockSetPrerecordStage,
    };
    return selector ? selector(state) : state;
  }),
}));

import {
  getSourcePlatform,
  SourcePicker,
  sourceExperienceForPlatform,
  sourceCardsForPlatform,
} from "@/components/session/source-picker";

// ─── Setup ────────────────────────────────────────────────────────────────────

const DESKTOP_CHROME_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
const DESKTOP_SAFARI_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15";
const MOBILE_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const MOBILE_ANDROID_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel) AppleWebKit/537.36 Chrome/125 Mobile Safari/537.36";

beforeEach(() => {
  vi.clearAllMocks();
  mockUserAgent(DESKTOP_CHROME_UA);
});

function mockUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

function normalizeText(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim();
}

function expectAbsent(text: string) {
  expect(screen.queryByText(text)).toBeNull();
}

// ─── 1. Platform-aware rendering ─────────────────────────────────────────────

describe("SourcePicker – card rendering", () => {
  it("renders the desktop Chrome version as three equal source paths", async () => {
    render(<SourcePicker />);
    expect(await screen.findByText("Current tab")).toBeTruthy();
    expect(screen.getByLabelText("Live source path")).toBeTruthy();
    expect(screen.getByLabelText("URL source path")).toBeTruthy();
    expect(screen.getByLabelText("File source path")).toBeTruthy();
    expect(screen.getByText("Microphone")).toBeTruthy();
    expect(screen.getByText("YouTube")).toBeTruthy();
    expect(screen.getByText("Web page")).toBeTruthy();
    expect(screen.getByText("Direct media")).toBeTruthy();
    expect(screen.getByText("Audio/video")).toBeTruthy();
    expect(screen.getByText("Text/document")).toBeTruthy();
    expect(screen.getByText("One claim")).toBeTruthy();
    expectAbsent("Use the current Chrome tab");
    expectAbsent("Paste URL");
    expectAbsent("Video URL");
    expectAbsent("Paste URL -> Play video -> Live read");
  });

  it("renders the full wordmark", () => {
    render(<SourcePicker />);
    expect(screen.getByText("yentl")).toBeTruthy();
  });

  it("renders the headline", () => {
    render(<SourcePicker />);
    expect(normalizeText(screen.getByRole("heading", { level: 1 }).textContent))
      .toBe("Choose your source path");
  });

  it("renders a plain user-facing subtitle", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    expect(
      screen.getByText((_content, element) =>
        element?.tagName.toLowerCase() === "p" &&
        normalizeText(element.textContent) ===
          "Start with Live, URL, or File. Then choose the specific branch Yentl should use.",
      ),
    ).toBeTruthy();
  });

  it("does not render development/proof language on the end-user picker", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");

    for (const text of [
      "Native app path",
      "Platform limit",
      "Mobile web handoff",
      "iOS Share Sheet handoff",
      "Android share intent handoff",
      "analysis contract",
      "future native",
      "Screenshot proof",
      "Flow atlas",
    ]) {
      expect(screen.queryByText(text, { exact: false })).toBeNull();
    }
  });
});

describe("SourcePicker – platform behavior", () => {
  it("detects desktop Chrome, desktop non-Chrome, iOS, Android, and generic mobile web", () => {
    expect(getSourcePlatform(DESKTOP_CHROME_UA)).toBe("desktop-chrome");
    expect(getSourcePlatform(DESKTOP_SAFARI_UA)).toBe("desktop-other");
    expect(getSourcePlatform(MOBILE_IOS_UA)).toBe("mobile-ios");
    expect(getSourcePlatform(MOBILE_ANDROID_UA)).toBe("mobile-android");
    expect(getSourcePlatform("Mozilla/5.0 Mobile Firefox/126.0")).toBe("mobile-web");
  });

  it("does not offer browser-tab capture as a mobile web card", () => {
    const titles = sourceCardsForPlatform("mobile-ios").map((card) => card.title);
    expect(titles).not.toContain("Current tab");
    expect(titles).toContain("Shared link");
    expect(titles).toContain("Import file");
    expect(titles).toContain("One claim");
    expect(sourceCardsForPlatform("mobile-ios").some((card) => card.source?.kind === "browser_tab"))
      .toBe(false);
  });

  it("keeps desktop non-Chrome to source paths that actually work there", () => {
    const cards = sourceCardsForPlatform("desktop-other");
    expect(cards.map((card) => card.title)[0]).toBe("Microphone");
    expect(cards.some((card) => card.source?.kind === "browser_tab")).toBe(false);
    expect(sourceExperienceForPlatform("desktop-other").noticeTitle)
      .toBe("Open-tab capture needs desktop Chrome.");
  });

  it("defines separate iOS, Android, and generic mobile experiences without fake handoff cards", () => {
    expect(sourceExperienceForPlatform("mobile-ios").noticeTitle).toContain("On mobile");
    expect(sourceExperienceForPlatform("mobile-android").noticeTitle).toContain("On mobile");
    expect(sourceExperienceForPlatform("mobile-web").noticeTitle).toContain("On mobile");
    expect(sourceCardsForPlatform("mobile-android").map((card) => card.title))
      .toContain("Import file");
    expect(sourceCardsForPlatform("mobile-web").map((card) => card.title))
      .toContain("Shared link");
    expect(sourceCardsForPlatform("mobile-web").map((card) => card.title))
      .toContain("One claim");
  });
});

describe("SourcePicker – rendered platform versions", () => {
  it("renders desktop non-Chrome as a clean fallback surface", async () => {
    mockUserAgent(DESKTOP_SAFARI_UA);
    render(<SourcePicker />);

    expect(await screen.findByText("Open-tab capture needs desktop Chrome.")).toBeTruthy();
    expect(screen.getByText("Microphone")).toBeTruthy();
    expect(screen.getByText("YouTube")).toBeTruthy();
    expect(screen.getByText("Audio/video")).toBeTruthy();
    expectAbsent("Current tab");
    expectAbsent("Open the desktop Chrome extension path");
  });

  it("renders the iOS mobile version", async () => {
    mockUserAgent(MOBILE_IOS_UA);
    render(<SourcePicker />);

    expect(await screen.findByText("Import file")).toBeTruthy();
    expect(screen.getByText("Shared link")).toBeTruthy();
    expect(screen.getByText("Microphone")).toBeTruthy();
    expect(screen.getByText("On mobile, start with a shared link, file, text, or microphone.")).toBeTruthy();
    expectAbsent("iOS Share Sheet handoff");
  });

  it("renders the Android mobile version", async () => {
    mockUserAgent(MOBILE_ANDROID_UA);
    render(<SourcePicker />);

    expect(await screen.findByText("Import file")).toBeTruthy();
    expect(screen.getByText("Shared link")).toBeTruthy();
    expect(screen.getByText("Microphone")).toBeTruthy();
    expect(screen.getByText("On mobile, start with a shared link, file, text, or microphone.")).toBeTruthy();
    expectAbsent("Android share intent handoff");
  });

  it("keeps mobile source cards at comfortable tap-target height", async () => {
    mockUserAgent(MOBILE_IOS_UA);
    render(<SourcePicker />);

    const sharedLinkButton = (await screen.findByText("Shared link")).closest("button");
    const importFileButton = screen.getByText("Import file").closest("button");

    expect(sharedLinkButton?.className).toContain("min-h-11");
    expect(importFileButton?.className).toContain("min-h-11");
  });
});

// ─── 2. Click handlers call setSource with correct kind ──────────────────────

describe("SourcePicker – click handlers: setSource", () => {
  it("Microphone card calls setSource({ kind: 'mic' })", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("Microphone").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "mic" });
  });

  it("Text doc card calls setSource({ kind: 'text_doc', ... })", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("Text/document").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "",
      byte_count: 0,
    });
  });

  it("Claim quick-check card calls setSource with claim-only intent", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("One claim").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "Claim quick check",
      mime: "text/plain",
      byte_count: 0,
      intent: "claim_only",
    });
  });

  it("Browser tab card calls setSource({ kind: 'browser_tab' })", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("Current tab").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({ kind: "browser_tab" });
  });

  it("Audio file card calls setSource({ kind: 'audio_file', ... })", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("Audio/video").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: "",
      mime: "",
    });
  });

  it("YouTube card calls setSource({ kind: 'youtube', ... })", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("YouTube").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "youtube",
      video_id: "",
      url: "",
    });
  });

  it("Media URL card calls setSource({ kind: 'media_url', ... })", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    fireEvent.click(screen.getByText("Direct media").closest("button")!);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "media_url",
      url: "",
    });
  });

  it("Web page card calls setSource with web_url text_doc intent", async () => {
    render(<SourcePicker />);
    await screen.findByText("Current tab");
    const webUrlButton = screen.getByText("Web page").closest("button") as HTMLButtonElement;
    expect(webUrlButton.disabled).toBe(false);
    fireEvent.click(webUrlButton);
    expect(mockSetSource).toHaveBeenCalledWith({
      kind: "text_doc",
      filename: "",
      mime: "text/html",
      byte_count: 0,
      intent: "web_url",
      source_url: "",
    });
  });
});

// ─── 3. Click handlers call setPrerecordStage("selected") ────────────────────

describe("SourcePicker – click handlers: setPrerecordStage", () => {
  const cardTitles = [
    "Current tab",
    "Microphone",
    "Audio/video",
    "Text/document",
    "One claim",
    "YouTube",
    "Web page",
    "Direct media",
  ];

  for (const title of cardTitles) {
    it(`clicking "${title}" sets prerecordStage to "selected"`, async () => {
      render(<SourcePicker />);
      await screen.findByText("Current tab");
      fireEvent.click(screen.getByText(title).closest("button")!);
      expect(mockSetPrerecordStage).toHaveBeenCalledWith("selected");
    });
  }
});
