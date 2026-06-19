import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:net";
import path from "node:path";
import { spawn } from "node:child_process";

type Viewport = {
  width: number;
  height: number;
  mobile?: boolean;
};

type CaptureTarget = {
  slug: string;
  path: string;
  viewport: Viewport;
  afterLoadScript?: string;
};

const baseUrl = process.env.YENTL_CAPTURE_BASE_URL ?? "http://127.0.0.1:3000";
const publicDir = path.join(process.cwd(), "public/visual-evidence/flow-screenshots/current");
const docsDir = path.join(process.cwd(), "docs/superpowers/validation/screenshots");
const desktop: Viewport = { width: 1280, height: 1000 };
const mobile: Viewport = { width: 390, height: 960, mobile: true };
const mobileUserAgent =
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

const routeTargets: Array<{ slug: string; path: string }> = [
  { slug: "route-home", path: "/" },
  { slug: "route-pricing", path: "/pricing" },
  { slug: "route-mobile", path: "/mobile" },
  { slug: "route-faq", path: "/faq" },
  { slug: "route-demo", path: "/demo" },
  { slug: "route-signin", path: "/signin" },
  { slug: "route-signup", path: "/signup" },
  { slug: "route-about", path: "/about" },
  { slug: "route-methodology", path: "/methodology" },
  { slug: "route-privacy", path: "/privacy" },
  { slug: "route-terms", path: "/terms" },
  { slug: "route-subprocessors", path: "/subprocessors" },
  { slug: "route-accessibility", path: "/accessibility" },
  { slug: "route-contact", path: "/contact" },
  { slug: "route-changelog", path: "/changelog" },
  { slug: "route-sessions", path: "/sessions" },
  { slug: "route-session-source-picker", path: "/session" },
  {
    slug: "route-session-youtube-preview",
    path: "/session?source=youtube&url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3DfTznEIZRkLg",
  },
  {
    slug: "route-session-text-prefill",
    path: "/session?title=Imported%20op-ed&text=City%20leaders%20said%20the%20budget%20doubled%20in%20one%20year.%20A%20later%20paragraph%20says%20the%20increase%20included%20one-time%20federal%20grants.",
  },
  { slug: "route-project-validation", path: "/project/validation" },
  { slug: "route-project-flows", path: "/project/flows" },
  { slug: "route-session-detail-claim-empty", path: "/session/detail/claim/c-1" },
  { slug: "route-session-detail-marker-empty", path: "/session/detail/marker/marker-123" },
  { slug: "route-session-learn-marker", path: "/session/learn/marker/loaded_language" },
  { slug: "route-session-learn-claim-empty", path: "/session/learn/claim/c-1" },
];

const populatedTargets: CaptureTarget[] = [
  {
    slug: "route-session-detail-claim-populated",
    path: "/session/detail/claim/cable_008-claim-1?demo=validation&sample=cable_008",
    viewport: desktop,
  },
  {
    slug: "route-session-detail-marker-populated",
    path: "/session/detail/marker/cable_008-marker-4?demo=validation&sample=cable_008",
    viewport: desktop,
  },
  {
    slug: "route-session-learn-claim-populated",
    path: "/session/learn/claim/cable_008-claim-1?demo=validation&sample=cable_008",
    viewport: desktop,
  },
  {
    slug: "route-session-learn-marker-populated",
    path: "/session/learn/marker/loaded_language?demo=validation&sample=cable_008",
    viewport: desktop,
  },
  {
    slug: "route-session-detail-claim-populated-mobile",
    path: "/session/detail/claim/cable_008-claim-1?demo=validation&sample=cable_008",
    viewport: mobile,
  },
  {
    slug: "route-session-detail-marker-populated-mobile",
    path: "/session/detail/marker/cable_008-marker-4?demo=validation&sample=cable_008",
    viewport: mobile,
  },
  {
    slug: "route-session-learn-claim-populated-mobile",
    path: "/session/learn/claim/cable_008-claim-1?demo=validation&sample=cable_008",
    viewport: mobile,
  },
  {
    slug: "route-session-learn-marker-populated-mobile",
    path: "/session/learn/marker/loaded_language?demo=validation&sample=cable_008",
    viewport: mobile,
  },
  {
    slug: "route-session-report-preview",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    viewport: desktop,
    afterLoadScript: openReportPreviewScript,
  },
  {
    slug: "route-session-report-preview-mobile",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    viewport: mobile,
    afterLoadScript: openReportPreviewScript,
  },
];

const allTargets: CaptureTarget[] = [
  ...routeTargets.map((target) => ({
    slug: target.slug,
    path: target.path,
    viewport: desktop,
  })),
  ...routeTargets.map((target) => ({
    slug: `${target.slug}-mobile`,
    path: target.path,
    viewport: mobile,
  })),
  ...populatedTargets,
];
const onlyTargets = new Set(
  (process.env.YENTL_CAPTURE_ONLY ?? "")
    .split(",")
    .map((target) => target.trim())
    .filter(Boolean),
);
const targets = onlyTargets.size
  ? allTargets.filter((target) => onlyTargets.has(target.slug))
  : allTargets;

async function main() {
  const chrome = chromePath();
  if (targets.length === 0) {
    throw new Error(`No capture targets matched YENTL_CAPTURE_ONLY=${[...onlyTargets].join(",")}`);
  }
  await mkdir(publicDir, { recursive: true });
  await mkdir(docsDir, { recursive: true });

  for (const target of targets) {
    const publicPath = path.join(publicDir, `${target.slug}.png`);
    const docsPath = path.join(docsDir, `${target.slug}.png`);
    const url = new URL(target.path, baseUrl).toString();
    await capture(chrome, url, publicPath, target.viewport, target.afterLoadScript);
    await copyFile(publicPath, docsPath);
    console.log(`captured ${target.slug} -> ${publicPath}`);
  }
}

function chromePath(): string {
  const candidates = [
    process.env.CHROME_BIN,
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ].filter((candidate): candidate is string => Boolean(candidate));
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Chrome was not found. Set CHROME_BIN to a headless-compatible browser binary.");
  }
  return found;
}

function capture(
  chrome: string,
  url: string,
  outputPath: string,
  viewport: Viewport,
  afterLoadScript?: string,
): Promise<void> {
  return captureWithCdp(chrome, url, outputPath, viewport, afterLoadScript);
}

async function captureWithCdp(
  chrome: string,
  url: string,
  outputPath: string,
  viewport: Viewport,
  afterLoadScript?: string,
): Promise<void> {
  const port = await freePort();
  const userDataDir = path.join(
    tmpdir(),
    `yentl-capture-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--run-all-compositor-stages-before-draw",
    "--force-device-scale-factor=1",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--window-size=${Math.max(viewport.width, 800)},${viewport.height}`,
    "about:blank",
  ];

  const child = spawn(chrome, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr = `${stderr}${String(chunk)}`.slice(-4000);
  });

  try {
    const page = await waitForPage(port);
    const cdp = await CdpSession.connect(page.webSocketDebuggerUrl);

    await cdp.send("Page.enable");
    await cdp.send("Network.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: Boolean(viewport.mobile),
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", {
      enabled: Boolean(viewport.mobile),
    });
    if (viewport.mobile) {
      await cdp.send("Network.setUserAgentOverride", {
        userAgent: mobileUserAgent,
        platform: "iPhone",
      });
    }

    const loaded = cdp.waitForEvent("Page.loadEventFired", 12000).catch(() => null);
    await cdp.send("Page.navigate", { url });
    await loaded;
    await cdp
      .send("Runtime.evaluate", {
        expression: "document.fonts?.ready",
        awaitPromise: true,
        returnByValue: true,
      })
      .catch(() => null);
    await delay(Number(process.env.YENTL_CAPTURE_WAIT_MS ?? 3500));
    if (afterLoadScript) {
      await cdp.send("Runtime.evaluate", {
        expression: afterLoadScript,
        awaitPromise: true,
        returnByValue: true,
      });
      await delay(800);
    }

    const screenshot = await cdp.send("Page.captureScreenshot", {
      format: "png",
      fromSurface: true,
      captureBeyondViewport: false,
    });
    const imageData = screenshot.result?.data;
    if (typeof imageData !== "string") {
      throw new Error("Chrome did not return screenshot image data.");
    }
    await writeFile(outputPath, Buffer.from(imageData, "base64"));
    cdp.close();
  } catch (error) {
    throw new Error(
      `Could not capture ${url}: ${
        error instanceof Error ? error.message : String(error)
      }\n${stderr}`,
    );
  } finally {
    child.kill("SIGTERM");
    await delay(150);
    await rm(userDataDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a local debugging port."));
        return;
      }
      const { port } = address;
      server.close(() => resolve(port));
    });
  });
}

async function waitForPage(port: number): Promise<{ webSocketDebuggerUrl: string }> {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/json/list`);
      const pages = (await res.json()) as Array<{
        type: string;
        webSocketDebuggerUrl: string;
      }>;
      const page = pages.find((candidate) => candidate.type === "page");
      if (page) return page;
    } catch {
      // Chrome is still starting.
    }
    await delay(100);
  }
  throw new Error("Timed out waiting for Chrome DevTools page target.");
}

class CdpSession {
  private nextId = 0;
  private pending = new Map<number, (value: CdpResponse) => void>();
  private eventWaiters = new Map<string, Array<(value: CdpResponse) => void>>();

  private constructor(private readonly ws: WebSocket) {
    ws.onmessage = (event) => {
      const message = JSON.parse(String(event.data)) as CdpResponse;
      if (message.id && this.pending.has(message.id)) {
        this.pending.get(message.id)?.(message);
        this.pending.delete(message.id);
        return;
      }
      if (message.method && this.eventWaiters.has(message.method)) {
        const waiters = this.eventWaiters.get(message.method) ?? [];
        this.eventWaiters.delete(message.method);
        for (const waiter of waiters) waiter(message);
      }
    };
  }

  static connect(url: string): Promise<CdpSession> {
    const ws = new WebSocket(url);
    return new Promise((resolve, reject) => {
      ws.onerror = () => reject(new Error("Could not connect to Chrome DevTools."));
      ws.onopen = () => resolve(new CdpSession(ws));
    });
  }

  send(method: string, params: Record<string, unknown> = {}): Promise<CdpResponse> {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}.`));
      }, 20000);
      this.pending.set(id, (message) => {
        clearTimeout(timeout);
        if (message.error) {
          reject(new Error(message.error.message));
          return;
        }
        resolve(message);
      });
    });
  }

  waitForEvent(method: string, timeoutMs: number): Promise<CdpResponse> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${method}.`)), timeoutMs);
      const waiters = this.eventWaiters.get(method) ?? [];
      waiters.push((message) => {
        clearTimeout(timeout);
        resolve(message);
      });
      this.eventWaiters.set(method, waiters);
    });
  }

  close() {
    this.ws.close();
  }
}

type CdpResponse = {
  id?: number;
  method?: string;
  params?: unknown;
  result?: Record<string, unknown>;
  error?: { message: string };
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
