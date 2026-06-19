#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { JSDOM } from "jsdom";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));
const CONTENT_SCRIPT_PATH = join(ROOT, "extension/content-script.js");
const REPORT_PATH = resolveRootOrAbsolute(
  process.env.YENTL_REAL_WEBPAGE_REPORT_PATH ??
    "docs/superpowers/validation/real-webpage-targets.json",
);
const APP_ORIGIN = process.env.YENTL_REAL_WEBPAGE_APP_ORIGIN ?? "http://localhost:3000";
const REQUEST_TIMEOUT_MS = Number(process.env.YENTL_REAL_WEBPAGE_TIMEOUT_MS ?? 30000);
const USER_AGENT = "Yentl validation harness (+https://yentl.it)";

const DEFAULT_TARGETS = [
  {
    id: "browser-tab-real-video-page",
    url: "https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm",
    requiresMedia: true,
    minPageTextLength: 180,
    expectedText: ["David Korten", "The Green Interview"],
  },
  {
    id: "browser-page-real-text",
    url: "https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles",
    requiresMedia: false,
    minPageTextLength: 450,
    expectedText: ["gas leak", "Los Angeles"],
  },
  {
    id: "browser-page-real-spec-text",
    url: "https://www.w3.org/TR/WCAG22/",
    requiresMedia: false,
    minPageTextLength: 900,
    expectedText: ["Web Content Accessibility Guidelines", "WCAG 2.2"],
  },
];

async function main() {
  const contentScript = await readFile(CONTENT_SCRIPT_PATH, "utf8");
  const targets = loadTargets();
  const results = [];

  for (const target of targets) {
    results.push(await verifyTarget(target, contentScript));
  }

  const failures = results.flatMap((result) =>
    result.failures.map((message) => ({ id: result.id, message })),
  );
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    target_count: targets.length,
    pass_count: results.filter((result) => result.ok).length,
    failures,
    results,
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  console.log(JSON.stringify(report, null, 2));
  if (!report.ok) process.exit(1);
}

function loadTargets() {
  const fromEnv = process.env.YENTL_REAL_WEBPAGE_TARGETS_JSON;
  if (fromEnv) return parseTargets(fromEnv, "YENTL_REAL_WEBPAGE_TARGETS_JSON");

  const fromFile = process.env.YENTL_REAL_WEBPAGE_TARGETS_FILE;
  if (fromFile) {
    const path = join(ROOT, fromFile);
    if (!existsSync(path)) throw new Error(`Target file does not exist: ${fromFile}`);
    return parseTargets(readFileSyncUtf8(path), fromFile);
  }

  return DEFAULT_TARGETS;
}

function parseTargets(value, label) {
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`${label} must be a non-empty JSON array`);
  }
  return parsed;
}

function readFileSyncUtf8(path) {
  return readFileSync(path, "utf8");
}

async function verifyTarget(target, contentScript) {
  const failures = [];
  let response;
  let html;

  try {
    response = await fetch(target.url, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    return failedTarget(target, `fetch failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  if (!response.ok) {
    return failedTarget(target, `fetch returned ${response.status} ${response.statusText}`);
  }

  try {
    html = await response.text();
  } catch (error) {
    return failedTarget(target, `body read failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  const dom = new JSDOM(html, {
    url: target.url,
    pretendToBeVisual: true,
    runScripts: "outside-only",
  });
  const { window } = dom;
  const listeners = [];
  const postedMessages = [];
  const debugMessages = [];
  const bridgeToken = `validation-${target.id}`;

  window.crypto.randomUUID = () => bridgeToken;
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

  try {
    window.eval(contentScript);
  } catch (error) {
    return failedTarget(target, `content script evaluation failed: ${error instanceof Error ? error.message : String(error)}`);
  }

  listeners[0]?.(
    {
      target: "yentl-content-script",
      type: "open-panel",
      appOrigin: APP_ORIGIN,
      bridgeToken,
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
        bridgeToken,
      },
      origin: APP_ORIGIN,
    });
    Object.defineProperty(event, "source", {
      configurable: true,
      value: iframe.contentWindow,
    });
    window.dispatchEvent(event);
  }

  const pageTextMessage = findPayloadMessage("page-text", postedMessages, debugMessages);
  const pageContextMessage = findPayloadMessage("page-context", postedMessages, debugMessages);
  const pageTextPayload = pageTextMessage?.payload;
  const pageContextPayload = pageContextMessage?.payload;
  const chunks = pageTextPayload?.chunks ?? [];
  const pageText = pageTextPayload?.text ?? "";
  const pageTextLength = pageText.length;
  const minPageTextLength = Number(target.minPageTextLength ?? 120);
  const expectedText = Array.isArray(target.expectedText) ? target.expectedText : [];
  const sourceContextKeys = Object.keys(pageContextPayload?.source_context ?? pageTextPayload?.source_context ?? {});

  if (!host || !iframe) failures.push("Yentl panel was not injected");
  if (!iframe?.getAttribute("src")?.startsWith(`${APP_ORIGIN}/session?`)) {
    failures.push("panel iframe did not target the configured Yentl app origin");
  }
  if (chunks.length < 1) failures.push("readable page-text chunks were not captured");
  if (pageTextLength < minPageTextLength) {
    failures.push(`page text length ${pageTextLength} was below required ${minPageTextLength}`);
  }
  if (target.requiresMedia && window.document.querySelectorAll("video, audio").length < 1) {
    failures.push("expected playable media elements");
  }
  for (const phrase of expectedText) {
    if (!pageText.toLowerCase().includes(String(phrase).toLowerCase())) {
      failures.push(`page text did not include expected phrase: ${phrase}`);
    }
  }

  return {
    id: target.id,
    ok: failures.length === 0,
    failures,
    url: target.url,
    title: window.document.title,
    requiresMedia: Boolean(target.requiresMedia),
    panelInjected: Boolean(host && iframe),
    panelStatus: host?.shadowRoot?.querySelector("[data-yentl-status]")?.textContent ?? null,
    iframeSrc: iframe?.getAttribute("src") ?? null,
    videoCount: window.document.querySelectorAll("video").length,
    audioCount: window.document.querySelectorAll("audio").length,
    pageTextChunks: chunks.length,
    pageTextLength,
    minPageTextLength,
    expectedText,
    sourceContextKeys,
    pageTextSample: chunks[0]?.text?.slice(0, 240) ?? null,
  };
}

function findPayloadMessage(type, postedMessages, debugMessages) {
  const posted = postedMessages.find((entry) => entry.message?.type === type)?.message;
  if (posted) return posted;
  return debugMessages.find((message) => message?.type === type);
}

function failedTarget(target, message) {
  return {
    id: target.id,
    ok: false,
    failures: [message],
    url: target.url,
    title: null,
    requiresMedia: Boolean(target.requiresMedia),
    panelInjected: false,
    panelStatus: null,
    iframeSrc: null,
    videoCount: 0,
    audioCount: 0,
    pageTextChunks: 0,
    pageTextLength: 0,
    minPageTextLength: Number(target.minPageTextLength ?? 120),
    expectedText: Array.isArray(target.expectedText) ? target.expectedText : [],
    sourceContextKeys: [],
    pageTextSample: null,
  };
}

function resolveRootOrAbsolute(path) {
  return isAbsolute(path) ? path : join(ROOT, path);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
