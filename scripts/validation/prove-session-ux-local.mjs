#!/usr/bin/env node
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { dirname, join, relative } from "node:path";
import { homedir, tmpdir } from "node:os";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_SESSION_UX_PROOF_ORIGIN ?? "http://localhost:3000";
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/session-ux-local-proof.json");
const MOBILE_USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const openReportPreviewScript = `
new Promise((resolve) => {
  const clickButton = (text) => {
    const button = [...document.querySelectorAll("button")]
      .find((candidate) => candidate.textContent?.includes(text));
    if (button) button.click();
    return Boolean(button);
  };
  clickButton("Export");
  setTimeout(() => {
    clickButton("Preview report");
    setTimeout(resolve, 900);
  }, 700);
})
`;

const openEndSessionScript = `
new Promise((resolve) => {
  const endBtn = [...document.querySelectorAll("button")].find((button) => {
    const text = button.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    return text === "End" && button.querySelector("svg");
  });
  if (endBtn) endBtn.click();
  setTimeout(resolve, 1000);
})
`;

const openSourceSwitchScript = `
new Promise((resolve) => {
  const sourcesBtn = [...document.querySelectorAll("button")].find((button) => {
    const text = button.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    return text === "Sources" && button.querySelector("svg");
  });
  if (sourcesBtn) sourcesBtn.click();
  setTimeout(resolve, 1000);
})
`;

const waitForValidationHydratedScript = `
new Promise((resolve) => {
  const start = Date.now();
  const tick = () => {
    const text = document.body?.innerText || "";
    const loading = text.includes("Loading validation demo");
    if (!loading || Date.now() - start > 18000) {
      resolve(!loading);
      return;
    }
    setTimeout(tick, 250);
  };
  tick();
})
`;

const ROUTES = [
  {
    slug: "source-picker",
    path: "/session",
    width: 1280,
    expectedText: ["Choose your source path"],
  },
  {
    slug: "validation-overview",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Overview", "YENTL OPINION", "rhetoric markers"],
  },
  {
    slug: "validation-watch",
    path: "/session?demo=validation&sample=cable_008&view=watch",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Watch"],
  },
  {
    slug: "validation-claims",
    path: "/session?demo=validation&sample=cable_008&view=claims&status=checking",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Still checking claims", "77,000,000"],
  },
  {
    slug: "validation-markers",
    path: "/session?demo=validation&sample=cable_008&view=markers",
    width: 1280,
    waitMs: 2500,
    expectedText: ["All markers", "Loaded Language"],
  },
  {
    slug: "validation-transcript",
    path: "/session?demo=validation&sample=cable_008&view=transcript",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Search transcript", "Trump"],
  },
  {
    slug: "detail-claim-populated",
    path: "/session/detail/claim/cable_008-claim-1?demo=validation&sample=cable_008",
    width: 1280,
    waitMs: 2500,
    expectedText: ["77,000,000", "Learn more"],
  },
  {
    slug: "detail-marker-populated",
    path: "/session/detail/marker/cable_008-marker-6?demo=validation&sample=cable_008",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Loaded Language", "Learn more"],
  },
  {
    slug: "learn-marker-populated",
    path: "/session/learn/marker/loaded_language?demo=validation&sample=cable_008",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Loaded Language", "Rhetorical device"],
  },
  {
    slug: "learn-claim-populated",
    path: "/session/learn/claim/cable_008-claim-1?demo=validation&sample=cable_008",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Sources & context", "77,000,000", "No sources attached"],
  },
  {
    slug: "saved-sessions",
    path: "/sessions",
    width: 1280,
    expectedText: ["Saved sessions"],
  },
  {
    slug: "tv-room-mode",
    path: "/tv?demo=validation&sample=cable_008",
    width: 1280,
    waitMs: 2500,
    expectedText: ["ROOM MODE", "Yentl's Read"],
  },
  {
    slug: "share-target-text-mobile",
    path: "/session?title=Shared%20note&text=The%20claim%20is%20specific.",
    width: 390,
    mobile: true,
    expectedText: ["Shared note", "The claim is specific"],
  },
  {
    slug: "export-report-preview",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    width: 1280,
    waitMs: 2000,
    afterLoadScript: openReportPreviewScript,
    expectedText: ["Preview report", "Export this session"],
  },
  {
    slug: "end-session-dialog",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    width: 1280,
    waitMs: 2000,
    afterLoadScript: openEndSessionScript,
    expectedText: ["End this session?", "Keep going", "Save first"],
  },
  {
    slug: "source-switch-dialog",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    width: 1280,
    waitMs: 2000,
    afterLoadScript: openSourceSwitchScript,
    expectedText: ["Choose another source?", "Keep current source", "Choose new source"],
  },
  {
    slug: "validation-overview-mobile",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    width: 390,
    mobile: true,
    waitMs: 2500,
    expectedText: ["Overview", "YENTL OPINION"],
  },
  {
    slug: "validation-claims-mobile",
    path: "/session?demo=validation&sample=cable_008&view=claims&status=checking",
    width: 390,
    mobile: true,
    waitMs: 2500,
    expectedText: ["Still checking claims", "77,000,000"],
  },
  {
    slug: "validation-transcript-mobile",
    path: "/session?demo=validation&sample=cable_008&view=transcript",
    width: 390,
    mobile: true,
    waitMs: 2500,
    expectedText: ["Search transcript", "Trump"],
  },
];

async function main() {
  await assertAppIsServing();

  const chrome = chromeExecutable();
  const port = await pickPort();
  const tempRoot = await mkdtemp(join(tmpdir(), "yentl-session-ux-proof-"));
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

    const checks = [];
    for (const route of ROUTES) {
      const issueStart = runtimeIssues.length;
      checks.push(await proveRoute(client, route, issueStart, runtimeIssues));
    }

    const failures = checks.flatMap((check) =>
      check.failures.map((failure) => ({
        route: check.slug,
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
      routes: ROUTES.map(({ slug, path, width }) => ({ slug, path, width })),
      report_path: relative(ROOT, REPORT_PATH),
      checks,
      failures,
      chrome_log_tail: chromeLogLines.slice(-30),
    };

    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    if (!report.ok) {
      throw new Error(`Session UX local proof failed. Report: ${REPORT_PATH}`);
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

async function proveRoute(client, route, issueStart, runtimeIssues) {
  const url = new URL(route.path, APP_ORIGIN).toString();
  const width = route.width ?? 1280;
  const mobile = Boolean(route.mobile ?? width < 768);

  await client.send("Emulation.setDeviceMetricsOverride", {
    width,
    height: width >= 768 ? 1000 : 960,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: width >= 768 ? 1000 : 960,
  });
  await client.send("Emulation.setTouchEmulationEnabled", { enabled: mobile });
  await client.send("Network.setUserAgentOverride", {
    userAgent: mobile
      ? MOBILE_USER_AGENT
      : "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148 Safari/537.36",
    platform: mobile ? "iPhone" : "macOS",
  });

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
  await sleep(Number(route.waitMs ?? process.env.YENTL_SESSION_UX_PROOF_WAIT_MS ?? 900));

  if (route.path.includes("demo=validation")) {
    const hydrated = await client
      .send("Runtime.evaluate", {
        expression: waitForValidationHydratedScript,
        awaitPromise: true,
        returnByValue: true,
      })
      .catch(() => ({ result: { value: false } }));
    if (!hydrated.result?.value) {
      await sleep(1500);
    }
  }

  if (route.afterLoadScript) {
    await client
      .send("Runtime.evaluate", {
        expression: route.afterLoadScript,
        awaitPromise: true,
        returnByValue: true,
      })
      .catch(() => null);
    await sleep(500);
  }

  const result = await client.send("Runtime.evaluate", {
    expression: routeAuditExpression(route.expectedText),
    awaitPromise: true,
    returnByValue: true,
  });
  const value = result.result?.value ?? {};
  const routeIssues = runtimeIssues.slice(issueStart).filter((issue) => !isIgnorableRuntimeIssue(issue));
  const failures = [];

  if (value.overflowX > 1) failures.push(`horizontal overflow ${value.overflowX}px`);
  for (const expected of route.expectedText) {
    if (!value.textMatches?.[expected]) failures.push(`missing expected text: ${expected}`);
  }
  if (routeIssues.length > 0) failures.push(`${routeIssues.length} console/runtime error(s)`);

  return {
    slug: route.slug,
    path: route.path,
    url,
    width,
    failures,
    runtimeIssues: routeIssues,
    ...value,
  };
}

function isIgnorableRuntimeIssue(issue) {
  const text = String(issue.text ?? "");
  return /webpack-hmr|_next\/webpack-hmr|ERR_INVALID_HTTP_RESPONSE/i.test(text);
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
        title: document.title,
        viewportWidth: window.innerWidth,
        clientWidth,
        scrollWidth,
        overflowX: Math.max(0, scrollWidth - clientWidth),
        textMatches: Object.fromEntries(expected.map((text) => [text, searchableText.includes(text)])),
        visibleTextStart: visibleText.slice(0, 500),
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