// @vitest-environment jsdom

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

type RuntimeListener = (
  message: unknown,
  sender: unknown,
  sendResponse: (response: unknown) => void,
) => boolean;

function loadContentScript() {
  const listeners: RuntimeListener[] = [];
  const sendMessage = vi.fn(() => Promise.resolve({ running: true }));
  const chrome = {
    runtime: {
      onMessage: {
        addListener: (listener: RuntimeListener) => listeners.push(listener),
      },
      sendMessage,
    },
  };

  const source = readFileSync(join(process.cwd(), "extension/content-script.js"), "utf8");
  new Function("chrome", source)(chrome);
  return { listeners, sendMessage };
}

describe("extension content script panel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.body.style.marginRight = "";
    document.documentElement.innerHTML = "<head></head><body></body>";
    vi.restoreAllMocks();
  });

  it("injects a same-page Yentl iframe panel with a bridge token", () => {
    const { listeners } = loadContentScript();
    const sendResponse = vi.fn();

    listeners[0](
      {
        target: "yentl-content-script",
        type: "open-panel",
        appOrigin: "http://localhost:3000",
        bridgeToken: "bridge-123",
        tab: { title: "Fixture video", url: "https://example.com/video" },
      },
      {},
      sendResponse,
    );

    const host = document.getElementById("yentl-extension-panel-host");
    expect(host).toBeTruthy();
    expect(document.body.style.marginRight).toBe("430px");
    const iframe = host?.shadowRoot?.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toContain("http://localhost:3000/session");
    expect(iframe?.getAttribute("src")).toContain("surface=extension-panel");
    expect(iframe?.getAttribute("src")).toContain("bridge=bridge-123");
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });

  it("captures readable text from the real active page and sends it to the panel", () => {
    document.body.innerHTML = `
      <article>
        <h1>City budget hearing centers on public transit claims</h1>
        <p>Officials said the new transit plan would cut commute times by twenty percent across the region.</p>
        <p>Residents challenged the estimate and asked for the source data behind the projection.</p>
        <p>Analysts noted that the same report excluded weekend service and late-night routes from its baseline.</p>
      </article>
    `;
    const { listeners } = loadContentScript();
    const sendResponse = vi.fn();

    listeners[0](
      {
        target: "yentl-content-script",
        type: "open-panel",
        appOrigin: "http://localhost:3000",
        bridgeToken: "bridge-article",
        tab: {
          title: "Transit hearing",
          url: "https://news.example.test/transit-hearing",
        },
      },
      {},
      sendResponse,
    );

    const iframe = document
      .getElementById("yentl-extension-panel-host")
      ?.shadowRoot?.querySelector("iframe") as HTMLIFrameElement | null;
    expect(iframe).toBeTruthy();
    const postMessage = vi.fn();
    const panelWindow = { postMessage } as unknown as Window;
    Object.defineProperty(iframe!, "contentWindow", {
      configurable: true,
      value: panelWindow,
    });

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          source: "yentl-web-app",
          type: "bridge-ready",
          bridgeToken: "bridge-article",
        },
        origin: "http://localhost:3000",
        source: panelWindow,
      }),
    );

    expect(postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        source: "yentl-tab-capture-extension",
        type: "page-text",
        bridgeToken: "bridge-article",
        payload: expect.objectContaining({
          title: "Transit hearing",
          url: "https://news.example.test/transit-hearing",
          chunks: expect.arrayContaining([
            expect.objectContaining({
              text: expect.stringContaining("transit plan would cut commute times"),
            }),
          ]),
        }),
      }),
      "http://localhost:3000",
    );
  });
});
