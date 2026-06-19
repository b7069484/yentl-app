#!/usr/bin/env node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { homedir, tmpdir } from "node:os";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_INGESTION_UI_PROOF_ORIGIN ?? "http://localhost:3000";
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/ingestion-ui-local-proof.json");
const DEFAULT_TIMEOUT_MS = Number(process.env.YENTL_INGESTION_UI_PROOF_TIMEOUT_MS ?? 45000);
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148 Safari/537.36";

const actionPrelude = `
const waitFor = (predicate, timeoutMs = ${DEFAULT_TIMEOUT_MS}) =>
  new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      try {
        const value = predicate();
        if (value || Date.now() - start > timeoutMs) {
          resolve(value || null);
          return;
        }
      } catch {}
      setTimeout(tick, 150);
    };
    tick();
  });
const bodyText = () => document.body?.innerText || "";
const fieldText = () => [...document.querySelectorAll("input,textarea,select")]
  .map((element) => element.value || element.getAttribute("value") || "")
  .filter(Boolean)
  .join(" ");
const pageText = () => [bodyText(), fieldText()].filter(Boolean).join(" ");
const clickButton = (label) => {
  const button = [...document.querySelectorAll("button")]
    .find((candidate) => candidate.textContent?.replace(/\\s+/g, " ").trim().includes(label));
  if (!button) return false;
  button.click();
  return true;
};
`;

const FLOWS = [
  {
    slug: "web-article-validation-ui-handoff",
    path: "/session?source=web-url",
    initialText: ["Paste a page URL", "Load validation article"],
    finalText: ["Yentl Validation Article", "city library operating budget", "Overview"],
    expectedPathIncludes: "/session?view=overview",
    expectedRequests: ["/api/article-ingest"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation article"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation article button did not appear." });
          return;
        }
        if (!clickButton("Load validation article")) {
          resolve({ ok: false, error: "Could not click validation article button." });
          return;
        }
        resolve({ ok: true, clicked: "Load validation article" });
      })
    `,
  },
  {
    slug: "direct-media-validation-ui-handoff",
    path: "/session?source=media-url",
    initialText: ["Paste a media URL", "Load validation media URL"],
    finalText: ["Watch", "Welcome to the Yentl validation panel", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/api/media-ingest"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation media URL"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation media URL button did not appear." });
          return;
        }
        if (!clickButton("Load validation media URL")) {
          resolve({ ok: false, error: "Could not click validation media URL button." });
          return;
        }
        resolve({ ok: true, clicked: "Load validation media URL" });
      })
    `,
  },
  {
    slug: "direct-video-validation-ui-handoff",
    path: "/session?source=media-url",
    initialText: ["Paste a media URL", "Load validation video URL"],
    finalText: ["Watch", "Welcome to the Yentl validation panel", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/api/media-ingest"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation video URL"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation video URL button did not appear." });
          return;
        }
        if (!clickButton("Load validation video URL")) {
          resolve({ ok: false, error: "Could not click validation video URL button." });
          return;
        }
        resolve({ ok: true, clicked: "Load validation video URL" });
      })
    `,
  },
  {
    slug: "audio-upload-validation-ui-handoff",
    path: "/session?source=audio-file",
    initialText: ["Load validation WAV", "Load validation MP4", "Load validation MOV", "Load validation WebM"],
    finalText: ["Watch", "Welcome to the Yentl validation panel", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/validation/yentl-synthetic-panel.wav", "/api/transcribe-batch"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation WAV"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation WAV button did not appear." });
          return;
        }
        if (!clickButton("Load validation WAV")) {
          resolve({ ok: false, error: "Could not click validation WAV button." });
          return;
        }
        const staged = await waitFor(() =>
          bodyText().includes("yentl-synthetic-panel.wav") &&
          bodyText().includes("Ready to process"), 18000);
        if (!staged) {
          resolve({ ok: false, error: "Validation WAV did not stage for processing." });
          return;
        }
        if (!clickButton("Process audio")) {
          resolve({ ok: false, error: "Could not click Process audio." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation WAV", "Process audio"] });
      })
    `,
  },
  {
    slug: "video-upload-validation-ui-handoff",
    path: "/session?source=audio-file",
    initialText: ["Load validation WAV", "Load validation MP4", "Load validation MOV", "Load validation WebM"],
    finalText: ["Watch", "Welcome to the Yentl validation panel", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/validation/yentl-synthetic-panel.mp4", "/api/transcribe-batch"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation MP4"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation MP4 button did not appear." });
          return;
        }
        if (!clickButton("Load validation MP4")) {
          resolve({ ok: false, error: "Could not click validation MP4 button." });
          return;
        }
        const staged = await waitFor(() =>
          bodyText().includes("yentl-synthetic-panel.mp4") &&
          bodyText().includes("Ready to process"), 18000);
        if (!staged) {
          resolve({ ok: false, error: "Validation MP4 did not stage for processing." });
          return;
        }
        if (!clickButton("Process audio")) {
          resolve({ ok: false, error: "Could not click Process audio/video." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation MP4", "Process audio/video"] });
      })
    `,
  },
  {
    slug: "mov-upload-validation-ui-handoff",
    path: "/session?source=audio-file",
    initialText: ["Load validation WAV", "Load validation MP4", "Load validation MOV", "Load validation WebM"],
    finalText: ["Watch", "Welcome to the Yentl validation panel", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/validation/yentl-synthetic-panel.mov", "/api/transcribe-batch"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation MOV"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation MOV button did not appear." });
          return;
        }
        if (!clickButton("Load validation MOV")) {
          resolve({ ok: false, error: "Could not click validation MOV button." });
          return;
        }
        const staged = await waitFor(() =>
          bodyText().includes("yentl-synthetic-panel.mov") &&
          bodyText().includes("Ready to process"), 18000);
        if (!staged) {
          resolve({ ok: false, error: "Validation MOV did not stage for processing." });
          return;
        }
        if (!clickButton("Process audio")) {
          resolve({ ok: false, error: "Could not click Process audio/video." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation MOV", "Process audio/video"] });
      })
    `,
  },
  {
    slug: "webm-upload-validation-ui-handoff",
    path: "/session?source=audio-file",
    initialText: ["Load validation WAV", "Load validation MP4", "Load validation MOV", "Load validation WebM"],
    finalText: ["Watch", "Welcome to the Yentl validation panel", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/validation/yentl-synthetic-panel.webm", "/api/transcribe-batch"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation WebM"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation WebM button did not appear." });
          return;
        }
        if (!clickButton("Load validation WebM")) {
          resolve({ ok: false, error: "Could not click validation WebM button." });
          return;
        }
        const staged = await waitFor(() =>
          bodyText().includes("yentl-synthetic-panel.webm") &&
          bodyText().includes("Ready to process"), 18000);
        if (!staged) {
          resolve({ ok: false, error: "Validation WebM did not stage for processing." });
          return;
        }
        if (!clickButton("Process audio")) {
          resolve({ ok: false, error: "Could not click Process audio/video." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation WebM", "Process audio/video"] });
      })
    `,
  },
  {
    slug: "text-txt-validation-ui-handoff",
    path: "/session?source=text-doc",
    initialText: ["Load validation TXT", "Load validation PDF", "PDFs need selectable text"],
    finalText: ["Overview", "yentl-synthetic-transcript.txt", "city library budget increased by 12 percent"],
    expectedPathIncludes: "/session?view=overview",
    expectedRequests: ["/validation/yentl-synthetic-transcript.txt"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation TXT"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation TXT button did not appear." });
          return;
        }
        if (!clickButton("Load validation TXT")) {
          resolve({ ok: false, error: "Could not click validation TXT button." });
          return;
        }
        const staged = await waitFor(() =>
          bodyText().includes("yentl-synthetic-transcript.txt") &&
          bodyText().includes("Process transcript"), 18000);
        if (!staged) {
          resolve({ ok: false, error: "Validation TXT did not stage for processing." });
          return;
        }
        if (!clickButton("Process transcript")) {
          resolve({ ok: false, error: "Could not click Process transcript." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation TXT", "Process transcript"] });
      })
    `,
  },
  {
    slug: "text-pdf-validation-ui-handoff",
    path: "/session?source=text-doc",
    initialText: [
      "Load validation TXT",
      "Load validation PDF",
      "PDFs need selectable text",
      "Scanned PDFs need OCR elsewhere",
      "PDF import boundary",
    ],
    finalText: ["Overview", "yentl-small-text-layer.pdf", "City spending rose by twelve percent"],
    expectedPathIncludes: "/session?view=overview",
    expectedRequests: ["/validation/yentl-small-text-layer.pdf", "/api/document-ingest"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation PDF"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation PDF button did not appear." });
          return;
        }
        if (!clickButton("Load validation PDF")) {
          resolve({ ok: false, error: "Could not click validation PDF button." });
          return;
        }
        const staged = await waitFor(() =>
          bodyText().includes("yentl-small-text-layer.pdf") &&
          bodyText().includes("Process transcript"), 22000);
        if (!staged) {
          resolve({ ok: false, error: "Validation PDF did not stage for processing." });
          return;
        }
        if (!clickButton("Process transcript")) {
          resolve({ ok: false, error: "Could not click Process transcript." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation PDF", "Process transcript"] });
      })
    `,
  },
  {
    slug: "youtube-validation-ui-handoff",
    path: "/session?source=youtube",
    initialText: ["Load validation YouTube"],
    finalText: ["Watch", "Hans Rosling", "population growth"],
    expectedPathIncludes: "/session?view=watch",
    expectedRequests: ["/api/youtube-ingest"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation YouTube"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation YouTube button did not appear." });
          return;
        }
        if (!clickButton("Load validation YouTube")) {
          resolve({ ok: false, error: "Could not click validation YouTube button." });
          return;
        }
        const armed = await waitFor(() => bodyText().includes("Analyze caption track"), 24000);
        if (!armed) {
          resolve({ ok: false, error: "Validation YouTube captions did not arm." });
          return;
        }
        if (!clickButton("Analyze caption track")) {
          resolve({ ok: false, error: "Could not click Analyze caption track." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation YouTube", "Analyze caption track"] });
      })
    `,
  },
  {
    slug: "claim-quick-check-validation-ui-handoff",
    path: "/session?source=claim",
    initialText: ["Check one specific claim", "Load validation claim"],
    finalText: [
      "City spending rose by twelve percent this year without raising taxes.",
      "No reliable backing",
      "Yentl small DOCX validation brief",
    ],
    expectedPathIncludes: "/session/detail/claim/",
    expectedRequests: ["/api/verify-provisional", "/api/verify-confirmed"],
    actionScript: `
      new Promise(async (resolve) => {
        ${actionPrelude}
        const ready = await waitFor(() => bodyText().includes("Load validation claim"), 12000);
        if (!ready) {
          resolve({ ok: false, error: "Validation claim button did not appear." });
          return;
        }
        if (!clickButton("Load validation claim")) {
          resolve({ ok: false, error: "Could not click validation claim button." });
          return;
        }
        const staged = await waitFor(() =>
          pageText().includes("City spending rose by twelve percent") &&
          pageText().includes("Yentl document validation brief"), 12000);
        if (!staged) {
          resolve({ ok: false, error: "Validation claim did not fill the quick-check fields." });
          return;
        }
        if (!clickButton("Check claim")) {
          resolve({ ok: false, error: "Could not click Check claim." });
          return;
        }
        resolve({ ok: true, clicked: ["Load validation claim", "Check claim"] });
      })
    `,
  },
];

async function main() {
  await assertAppIsServing();

  const chrome = chromeExecutable();
  const port = await pickPort();
  const tempRoot = await mkdtemp(join(tmpdir(), "yentl-ingestion-ui-proof-"));
  const profileDir = join(tempRoot, "profile");
  const chromeLogLines = [];
  let browser;
  let client;

  try {
    browser = spawnChrome(chrome, port, profileDir, chromeLogLines);
    const target = await waitForTarget(port);
    client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Log.enable").catch(() => null);

    const runtimeIssues = [];
    const networkEvents = [];
    client.on("Runtime.exceptionThrown", (params) => {
      runtimeIssues.push({
        type: "exception",
        text: params?.exceptionDetails?.text ?? "Runtime exception",
        description: params?.exceptionDetails?.exception?.description ?? null,
      });
    });
    client.on("Runtime.consoleAPICalled", (params) => {
      if (params?.type !== "error") return;
      runtimeIssues.push({
        type: "console-error",
        text: (params.args ?? []).map((arg) => arg.value ?? arg.description).filter(Boolean).join(" "),
      });
    });
    client.on("Log.entryAdded", (params) => {
      if (params?.entry?.level !== "error") return;
      runtimeIssues.push({
        type: "log-error",
        text: params.entry.text,
        url: params.entry.url ?? null,
      });
    });
    client.on("Network.requestWillBeSent", (params) => {
      networkEvents.push({
        kind: "request",
        requestId: params.requestId,
        url: params.request?.url ?? "",
        method: params.request?.method ?? "",
      });
    });
    client.on("Network.responseReceived", (params) => {
      networkEvents.push({
        kind: "response",
        requestId: params.requestId,
        url: params.response?.url ?? "",
        status: params.response?.status ?? null,
      });
    });

    const checks = [];
    for (const flow of FLOWS) {
      checks.push(await proveFlow(client, flow, runtimeIssues, networkEvents));
    }

    const failures = checks.flatMap((check) =>
      check.failures.map((failure) => ({
        flow: check.slug,
        path: check.path,
        failure,
      })),
    );
    const report = {
      ok: failures.length === 0,
      generated_at: new Date().toISOString(),
      app_origin: APP_ORIGIN,
      chrome,
      temp_profile: profileDir,
      flows: FLOWS.map(({ slug, path, expectedRequests }) => ({ slug, path, expectedRequests })),
      report_path: relative(ROOT, REPORT_PATH),
      checks,
      failures,
      chrome_log_tail: chromeLogLines.slice(-30),
    };

    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    if (!report.ok) {
      throw new Error(`Ingestion UI local proof failed. Report: ${REPORT_PATH}`);
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    client?.close();
    if (browser) await stopChrome(browser);
    await rm(tempRoot, { recursive: true, force: true }).catch(() => null);
  }
}

async function assertAppIsServing() {
  const url = new URL("/session", APP_ORIGIN);
  let response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  } catch (error) {
    throw new Error(
      `Yentl app is not reachable at ${url}. Start the dev server before running this proof. (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!response.ok) throw new Error(`Yentl session page returned ${response.status} at ${url}`);
}

async function proveFlow(client, flow, runtimeIssues, networkEvents) {
  const issueStart = runtimeIssues.length;
  const networkStart = networkEvents.length;
  const url = new URL(flow.path, APP_ORIGIN).toString();
  const failures = [];

  await setViewport(client, 1280);
  await navigateTo(client, url);
  const initialAudit = await waitForPageText(client, flow.initialText, 14000);
  failures.push(...auditFailures(initialAudit, flow.initialText).map((failure) => `initial ${failure}`));

  const actionResult = await evaluateValue(client, flow.actionScript, DEFAULT_TIMEOUT_MS + 5000);
  if (!actionResult?.ok) {
    failures.push(`action failed: ${actionResult?.error ?? "unknown error"}`);
  }

  const finalAudit = await waitForPathAndText(
    client,
    flow.expectedPathIncludes,
    flow.finalText,
    DEFAULT_TIMEOUT_MS,
  );
  failures.push(...auditFailures(finalAudit, flow.finalText).map((failure) => `final ${failure}`));
  if (flow.expectedPathIncludes && !finalAudit.href?.includes(flow.expectedPathIncludes)) {
    failures.push(`expected URL to include ${flow.expectedPathIncludes}, got ${finalAudit.href ?? "unknown"}`);
  }

  const routeIssues = runtimeIssues.slice(issueStart).filter((issue) => !isIgnorableRuntimeIssue(issue));
  if (routeIssues.length > 0) failures.push(`${routeIssues.length} console/runtime error(s)`);

  const requestSummary = summarizeNetworkEvents(networkEvents.slice(networkStart));
  for (const expected of flow.expectedRequests) {
    if (!requestSummary.some((entry) => entry.url.includes(expected))) {
      failures.push(`missing expected request: ${expected}`);
    }
  }

  return {
    slug: flow.slug,
    path: flow.path,
    url,
    actionResult,
    failures,
    runtimeIssues: routeIssues,
    requests: requestSummary,
    initialTextStart: initialAudit.visibleTextStart,
    finalTextStart: finalAudit.visibleTextStart,
    ...finalAudit,
  };
}

function summarizeNetworkEvents(events) {
  const byRequestId = new Map();
  for (const event of events) {
    const current = byRequestId.get(event.requestId) ?? {};
    byRequestId.set(event.requestId, { ...current, ...event });
  }
  return Array.from(byRequestId.values())
    .filter((event) =>
      event.url?.includes("/api/") ||
      event.url?.includes("/validation/") ||
      event.url?.includes("youtube.com/watch"),
    )
    .map((event) => ({
      method: event.method ?? "GET",
      status: event.status ?? null,
      url: event.url,
    }));
}

async function setViewport(client, width) {
  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: width,
    screenHeight: 1000,
  });
  await client.send("Network.setUserAgentOverride", {
    userAgent: DESKTOP_UA,
    platform: "macOS",
  });
}

async function navigateTo(client, url) {
  const load = client.waitForEvent("Page.loadEventFired", 15000).catch(() => null);
  await client.send("Page.navigate", { url });
  await load;
  await client
    .send("Runtime.evaluate", {
      expression: "document.fonts?.ready",
      awaitPromise: true,
      returnByValue: true,
    })
    .catch(() => null);
}

async function waitForPathAndText(client, expectedPathIncludes, expectedText, timeoutMs) {
  const startedAt = Date.now();
  let lastAudit = {};
  while (Date.now() - startedAt < timeoutMs) {
    const audit = await auditCurrentPage(client, expectedText);
    lastAudit = audit;
    const pathReady = !expectedPathIncludes || audit.href?.includes(expectedPathIncludes);
    const textReady = expectedText.every((text) => audit.textMatches?.[text]);
    if (pathReady && textReady) return audit;
    await sleep(250);
  }
  return lastAudit;
}

async function waitForPageText(client, expectedText, timeoutMs = 10000) {
  const startedAt = Date.now();
  let lastAudit = {};
  while (Date.now() - startedAt < timeoutMs) {
    const audit = await auditCurrentPage(client, expectedText);
    lastAudit = audit;
    if (expectedText.every((text) => audit.textMatches?.[text])) return audit;
    await sleep(250);
  }
  return lastAudit;
}

async function auditCurrentPage(client, expectedText) {
  const result = await client.send("Runtime.evaluate", {
    expression: routeAuditExpression(expectedText),
    awaitPromise: true,
    returnByValue: true,
  });
  return result.result?.value ?? {};
}

async function evaluateValue(client, expression, timeoutMs = 10000) {
  const result = await client.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  }, { timeoutMs });
  return result.result?.value ?? null;
}

function auditFailures(audit, expectedText) {
  const failures = [];
  if (audit.overflowX > 1) failures.push(`horizontal overflow ${audit.overflowX}px`);
  for (const expected of expectedText) {
    if (!audit.textMatches?.[expected]) failures.push(`missing expected text: ${expected}`);
  }
  return failures;
}

function isIgnorableRuntimeIssue(issue) {
  const text = String([issue.text, issue.description, issue.url].filter(Boolean).join(" "));
  return /webpack-hmr|_next\/webpack-hmr|ERR_INVALID_HTTP_RESPONSE|favicon\.ico/i.test(text) ||
    /YouTube setup player failed|youtube\.com|googlevideo\.com|ytimg\.com/i.test(text) ||
    /extract-claims fetch failed|analyze-rhetoric fetch failed|synthesize fetch failed/i.test(text) ||
    /ResizeObserver loop/i.test(text);
}

function routeAuditExpression(expectedText) {
  return `
    (() => {
      const doc = document.documentElement;
      const body = document.body;
      const visibleText = (body?.innerText || "").replace(/\\s+/g, " ").trim();
      const fieldText = [...document.querySelectorAll("input,textarea,select")]
        .map((element) => element.value || element.getAttribute("value") || "")
        .filter(Boolean)
        .join(" ")
        .replace(/\\s+/g, " ")
        .trim();
      const searchableText = [visibleText, fieldText].filter(Boolean).join(" ");
      const scrollWidth = Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0);
      const clientWidth = Math.max(doc?.clientWidth || 0, window.innerWidth || 0);
      const expected = ${JSON.stringify(expectedText)};
      return {
        href: window.location.href,
        title: document.title,
        viewportWidth: window.innerWidth,
        clientWidth,
        scrollWidth,
        overflowX: Math.max(0, scrollWidth - clientWidth),
        textMatches: Object.fromEntries(expected.map((text) => [text, searchableText.includes(text)])),
        visibleTextStart: visibleText.slice(0, 700),
      };
    })()
  `;
}

function chromeExecutable() {
  const candidates = [
    process.env.YENTL_CHROME_EXECUTABLE,
    ...chromeForTestingExecutables(),
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) throw new Error("Could not find Chrome. Set YENTL_CHROME_EXECUTABLE to a Chrome/Chromium binary.");
  return found;
}

function chromeForTestingExecutables() {
  const browserRoot = join(homedir(), ".agent-browser/browsers");
  if (!existsSync(browserRoot)) return [];
  try {
    return readdirSync(browserRoot)
      .filter((entry) => entry.startsWith("chrome-"))
      .sort()
      .reverse()
      .map((entry) =>
        join(browserRoot, entry, "Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing"),
      );
  } catch {
    return [];
  }
}

function spawnChrome(chrome, port, profileDir, logLines) {
  const child = spawn(chrome, [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-features=Translate,AutofillServerCommunication",
    "about:blank",
  ], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => recordChromeLog(logLines, "stdout", chunk));
  child.stderr.on("data", (chunk) => recordChromeLog(logLines, "stderr", chunk));
  return child;
}

function recordChromeLog(logLines, stream, chunk) {
  for (const line of chunk.toString().split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    logLines.push(`${stream}: ${trimmed.slice(0, 700)}`);
  }
  while (logLines.length > 80) logLines.shift();
}

async function waitForTarget(port) {
  const start = Date.now();
  while (Date.now() - start < 12000) {
    const targets = await listTargets(port).catch(() => []);
    const target = targets.find((candidate) => candidate.type === "page" && candidate.webSocketDebuggerUrl);
    if (target) return target;
    await sleep(100);
  }
  throw new Error("Timed out waiting for Chrome DevTools target.");
}

async function listTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`DevTools target list returned ${response.status}`);
  return response.json();
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  const eventWaiters = new Map();
  const listeners = new Map();
  let nextId = 1;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const handlers = pending.get(message.id);
      if (!handlers) return;
      pending.delete(message.id);
      clearTimeout(handlers.timeout);
      if (message.error) handlers.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
      else handlers.resolve(message.result ?? {});
      return;
    }

    if (message.method) {
      for (const listener of listeners.get(message.method) ?? []) listener(message.params ?? {});
      const waiters = eventWaiters.get(message.method) ?? [];
      eventWaiters.delete(message.method);
      for (const waiter of waiters) waiter.resolve(message.params ?? {});
    }
  });

  socket.addEventListener("close", () => {
    for (const handlers of pending.values()) {
      clearTimeout(handlers.timeout);
      handlers.reject(new Error("CDP socket closed."));
    }
    pending.clear();
  });

  return {
    send(method, params = {}, options = {}) {
      const id = nextId++;
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          if (!pending.has(id)) return;
          pending.delete(id);
          reject(new Error(`CDP command timed out: ${method}`));
        }, options.timeoutMs ?? 10000);
        pending.set(id, { resolve, reject, timeout });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    waitForEvent(method, timeoutMs) {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          const waiters = eventWaiters.get(method) ?? [];
          eventWaiters.set(method, waiters.filter((waiter) => waiter.resolve !== resolve));
          reject(new Error(`Timed out waiting for ${method}.`));
        }, timeoutMs);
        const waiters = eventWaiters.get(method) ?? [];
        waiters.push({
          resolve(value) {
            clearTimeout(timeout);
            resolve(value);
          },
        });
        eventWaiters.set(method, waiters);
      });
    },
    on(method, listener) {
      const entries = listeners.get(method) ?? [];
      entries.push(listener);
      listeners.set(method, entries);
    },
    close() {
      for (const handlers of pending.values()) {
        clearTimeout(handlers.timeout);
        handlers.reject(new Error("CDP client closed."));
      }
      pending.clear();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) socket.close();
    },
  };
}

async function stopChrome(child) {
  child.stdout?.destroy();
  child.stderr?.destroy();
  if (child.exitCode !== null || child.signalCode) return;
  child.kill("SIGTERM");
  const exited = await waitForChildExit(child, 2500);
  if (exited) return;
  child.kill("SIGKILL");
  await waitForChildExit(child, 2500);
}

function waitForChildExit(child, timeoutMs) {
  if (child.exitCode !== null || child.signalCode) return Promise.resolve(true);
  return new Promise((resolve) => {
    const cleanup = () => {
      clearTimeout(timeout);
      child.off("exit", onExit);
      child.off("close", onExit);
    };
    const onExit = () => {
      cleanup();
      resolve(true);
    };
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    child.once("exit", onExit);
    child.once("close", onExit);
  });
}

async function pickPort() {
  const { createServer } = await import("node:net");
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === "object") resolve(address.port);
        else reject(new Error("Could not allocate a local port."));
      });
    });
    server.on("error", reject);
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
