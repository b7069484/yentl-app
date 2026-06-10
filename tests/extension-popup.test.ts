// @vitest-environment jsdom

import { fireEvent, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

type PopupHarnessOptions = {
  activeTab?: {
    id?: number;
    title?: string;
    url?: string;
  } | null;
  appOrigin?: string;
  status?: {
    running?: boolean;
    title?: string;
    url?: string;
    message?: string;
  };
};

function installDom() {
  document.body.innerHTML = `
    <div id="tab-title"></div>
    <div id="app-origin"></div>
    <button id="start" type="button">Start live analysis</button>
    <button id="settings" type="button">Settings</button>
    <p id="status" role="status"></p>
  `;
}

function loadPopup(options: PopupHarnessOptions = {}) {
  installDom();
  const sendMessage = vi.fn((message: { type?: string }) => {
    if (message.type === "status-request") {
      return Promise.resolve(options.status ?? { running: false });
    }
    if (message.type === "popup-start-active-tab") {
      return Promise.resolve({ ok: true });
    }
    if (message.type === "app-stop-capture") {
      return Promise.resolve({ ok: true });
    }
    return Promise.resolve({});
  });
  const openOptionsPage = vi.fn();
  const close = vi.fn();
  const chrome = {
    runtime: {
      sendMessage,
      openOptionsPage,
    },
    storage: {
      sync: {
        get: vi.fn(() => Promise.resolve({
          appOrigin: options.appOrigin ?? "https://yentl.it",
        })),
      },
    },
    tabs: {
      query: vi.fn(() => Promise.resolve([
        options.activeTab === undefined
          ? { id: 7, title: "City hearing video", url: "https://news.example/video" }
          : options.activeTab,
      ].filter(Boolean))),
    },
  };
  Object.defineProperty(window, "close", {
    configurable: true,
    value: close,
  });

  const source = readFileSync(join(process.cwd(), "extension/popup.js"), "utf8");
  new Function("chrome", source)(chrome);
  return { chrome, close, sendMessage, openOptionsPage };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("extension popup", () => {
  it("shows the active tab and configured Yentl origin before starting capture", async () => {
    const harness = loadPopup({
      appOrigin: "http://localhost:3000",
    });

    await waitFor(() => {
      expect(document.getElementById("tab-title")?.textContent).toBe("City hearing video");
      expect(document.getElementById("app-origin")?.textContent).toBe("http://localhost:3000");
      expect(document.getElementById("status")?.textContent).toContain("Ready to open Yentl beside City hearing video");
    });

    fireEvent.click(document.getElementById("start") as HTMLButtonElement);

    await waitFor(() => {
      expect(harness.sendMessage).toHaveBeenCalledWith({
        target: "background",
        type: "popup-start-active-tab",
      });
      expect(document.getElementById("status")?.textContent).toBe("Yentl is listening.");
    });
  });

  it("shows stop control when a capture is already running", async () => {
    const harness = loadPopup({
      status: {
        running: true,
        title: "Original video tab",
        message: "Browser tab capture is active.",
      },
    });

    await waitFor(() => {
      expect(document.getElementById("start")?.textContent).toBe("Stop live analysis");
      expect(document.getElementById("status")?.textContent).toBe("Browser tab capture is active.");
    });

    fireEvent.click(document.getElementById("start") as HTMLButtonElement);

    await waitFor(() => {
      expect(harness.sendMessage).toHaveBeenCalledWith({
        target: "background",
        type: "app-stop-capture",
      });
      expect(document.getElementById("start")?.textContent).toBe("Start live analysis");
    });
  });

  it("disables capture on Chrome internal pages", async () => {
    loadPopup({
      activeTab: {
        id: 8,
        title: "Extensions",
        url: "chrome://extensions",
      },
    });

    await waitFor(() => {
      const start = document.getElementById("start") as HTMLButtonElement;
      expect(start.disabled).toBe(true);
      expect(start.textContent).toBe("Capture unavailable");
      expect(document.getElementById("status")?.textContent).toContain("normal http or https");
    });
  });

  it("opens extension settings from the popup", async () => {
    const harness = loadPopup();

    await waitFor(() => {
      expect(document.getElementById("settings")).toBeTruthy();
    });

    fireEvent.click(document.getElementById("settings") as HTMLButtonElement);

    expect(harness.openOptionsPage).toHaveBeenCalledOnce();
  });
});
