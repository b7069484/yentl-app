import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT_SCRIPT_PATH = join(ROOT, "extension/content-script.js");
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/real-webpage-targets.json");

const TARGETS = [
  {
    id: "browser-tab-real-video-page",
    url: "https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm",
    requiresMedia: true,
  },
  {
    id: "browser-page-real-text",
    url: "https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles",
    requiresMedia: false,
  },
];

async function main() {
  const contentScript = await readFile(CONTENT_SCRIPT_PATH, "utf8");
  const results = [];

  for (const target of TARGETS) {
    results.push(await verifyTarget(target, contentScript));
  }

  await mkdir(join(ROOT, "docs/superpowers/validation"), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify({
    generated_at: new Date().toISOString(),
    results,
  }, null, 2)}\n`);

  for (const result of results) {
    if (!result.panelInjected) {
      throw new Error(`${result.id}: Yentl panel was not injected`);
    }
    if (result.pageTextChunks < 1 || result.pageTextLength < 120) {
      throw new Error(`${result.id}: readable page text was not captured`);
    }
    if (result.requiresMedia && result.videoCount < 1 && result.audioCount < 1) {
      throw new Error(`${result.id}: expected playable media elements`);
    }
  }

  console.log(`Verified ${results.length} real webpage targets.`);
  console.log(REPORT_PATH);
}

async function verifyTarget(target, contentScript) {
  const response = await fetch(target.url, {
    headers: {
      "user-agent": "Yentl validation harness (+https://localhost:3000)",
    },
  });
  if (!response.ok) {
    throw new Error(`${target.id}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dom = new JSDOM(html, {
    url: target.url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  const listeners = [];
  const postedMessages = [];
  const debugMessages = [];

  window.crypto.randomUUID = () => `validation-${target.id}`;
  window.__YENTL_CAPTURE_DEBUG__ = true;
  window.addEventListener("yentl-extension-message", (event) => {
    debugMessages.push(event.detail);
  });
  window.chrome = {
    runtime: {
      onMessage: {
        addListener(listener) {
          listeners.push(listener);
        },
      },
      sendMessage() {
        return Promise.resolve({
          running: false,
          message: "Validation harness did not start tab audio capture.",
        });
      },
    },
  };
  window.eval(contentScript);

  listeners[0]?.(
    {
      target: "yentl-content-script",
      type: "open-panel",
      appOrigin: "http://localhost:3000",
      bridgeToken: `validation-${target.id}`,
      tab: {
        title: window.document.title,
        url: target.url,
      },
    },
    {},
    () => {},
  );

  const host = window.document.getElementById("yentl-extension-panel-host");
  const iframe = host?.shadowRoot?.querySelector("iframe");
  if (iframe?.contentWindow) {
    Object.defineProperty(iframe.contentWindow, "postMessage", {
      configurable: true,
      value(message, origin) {
        postedMessages.push({ message, origin });
      },
    });
    const event = new window.MessageEvent("message", {
      data: {
        source: "yentl-web-app",
        type: "bridge-ready",
        bridgeToken: `validation-${target.id}`,
      },
      origin: "http://localhost:3000",
    });
    Object.defineProperty(event, "source", {
      configurable: true,
      value: iframe.contentWindow,
    });
    window.dispatchEvent(event);
  }

  const pageTextMessage = postedMessages.find((entry) => entry.message?.type === "page-text")
    ?? debugMessages.find((message) => message?.type === "page-text");
  const payload = pageTextMessage?.message?.payload ?? pageTextMessage?.payload;
  const chunks = payload?.chunks ?? [];

  return {
    id: target.id,
    url: target.url,
    title: window.document.title,
    requiresMedia: target.requiresMedia,
    panelInjected: Boolean(host && iframe),
    panelStatus: host?.shadowRoot?.querySelector("[data-yentl-status]")?.textContent ?? null,
    iframeSrc: iframe?.getAttribute("src") ?? null,
    videoCount: window.document.querySelectorAll("video").length,
    audioCount: window.document.querySelectorAll("audio").length,
    pageTextChunks: chunks.length,
    pageTextLength: payload?.text?.length ?? 0,
    pageTextSample: chunks[0]?.text?.slice(0, 240) ?? null,
  };
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
