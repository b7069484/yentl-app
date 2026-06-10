#!/usr/bin/env node
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile, copyFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { spawn } from "node:child_process";

const ROOT = process.cwd();
const EXTENSION_DIR = join(ROOT, "extension");
const APP_ORIGIN = process.env.YENTL_EXTENSION_PROOF_ORIGIN ?? "http://127.0.0.1:3000";
const EXTERNAL_TARGET_URL = process.env.YENTL_EXTENSION_PROOF_TARGET_URL?.trim() || null;
const EXTERNAL_PROOF = Boolean(EXTERNAL_TARGET_URL);
const TARGET_URL = EXTERNAL_TARGET_URL ?? `${APP_ORIGIN}/validation/browser-capture.html`;
const REPORT_PATH = join(
  ROOT,
  EXTERNAL_PROOF
    ? "docs/superpowers/validation/installed-extension-external-proof.json"
    : "docs/superpowers/validation/installed-extension-local-proof.json",
);
const SCREENSHOT_PATH = join(
  ROOT,
  EXTERNAL_PROOF
    ? "docs/superpowers/validation/screenshots/installed-extension-external-page.png"
    : "docs/superpowers/validation/screenshots/installed-extension-local-fixture.png",
);
const DEFAULT_WIKIMEDIA_TARGET =
  "https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm";
const HEADLESS = process.env.YENTL_EXTENSION_PROOF_HEADLESS === "1";
const MANUAL_CAPTURE = process.env.YENTL_EXTENSION_PROOF_MANUAL_CAPTURE === "1";
const POPUP_AUTOMATION = process.env.YENTL_EXTENSION_PROOF_POPUP_AUTOMATION !== "0";
const ATTEMPT_SHORTCUT = MANUAL_CAPTURE
  ? false
  : process.env.YENTL_EXTENSION_PROOF_SHORTCUT === "1" ||
    (!HEADLESS && process.env.YENTL_EXTENSION_PROOF_SHORTCUT !== "0");
const SHORTCUT_STRATEGY = process.env.YENTL_EXTENSION_PROOF_SHORTCUT_STRATEGY ?? (HEADLESS ? "cdp" : "os");
const MANUAL_CAPTURE_TIMEOUT_MS = Number(process.env.YENTL_EXTENSION_PROOF_MANUAL_TIMEOUT_MS ?? 90000);
const TRANSCRIPT_WAIT_MS = Number(
  process.env.YENTL_EXTENSION_PROOF_TRANSCRIPT_WAIT_MS ?? (EXTERNAL_PROOF ? 45000 : 15000),
);

async function main() {
  const proofStartedAt = Date.now();
  await assertAppIsServing();
  const chromePath = chromeExecutable();
  const port = await pickPort();
  const tempRoot = await mkdtemp(join(tmpdir(), "yentl-extension-proof-"));
  const extensionCopy = join(tempRoot, "extension");
  const profileDir = join(tempRoot, "profile");
  let chrome;
  let client;
  const chromeLogLines = [];

  try {
    await copyExtensionForLocalValidation(extensionCopy);
    await mkdir(profileDir, { recursive: true });
    chrome = spawnChrome(chromePath, port, profileDir, extensionCopy, chromeLogLines);

    const pageTarget = await waitForTarget(port, (target) =>
      target.type === "page" && target.url.startsWith(TARGET_URL),
    );
    client = await connectCdp(pageTarget.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Page.bringToFront");
    await waitForExpression(client, "document.readyState === 'complete' || document.readyState === 'interactive'");
    await installCaptureEventRecorder(client);

    await waitForExpression(
      client,
      "Boolean(document.querySelector('audio') || document.querySelector('video'))",
      { timeoutMs: 10000 },
    );
    const mediaPlaybackBeforeShortcut = await startValidationMediaPlayback(client, {
      reset: true,
      target: EXTERNAL_PROOF ? "video" : "audio",
    });
    const mediaReadyAt = Date.now();
    let captureInvokedAt = null;

    const manualCapture = MANUAL_CAPTURE
      ? POPUP_AUTOMATION
        ? await invokePopupStartButton(port, chromePath, MANUAL_CAPTURE_TIMEOUT_MS).catch((error) => ({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }))
        : await waitForManualCapture(client, port, MANUAL_CAPTURE_TIMEOUT_MS).catch((error) => ({
            ok: false,
            error: error instanceof Error ? error.message : String(error),
          }))
      : null;
    const extensionTargetsBeforeShortcut = await inspectExtensionTargets(port);
    let shortcutError = ATTEMPT_SHORTCUT
      ? null
      : "Skipped in default headless proof mode because Chrome does not reliably dispatch extension command shortcuts through CDP key events.";
    if (ATTEMPT_SHORTCUT) {
      captureInvokedAt = Date.now();
      await pressExtensionShortcut(client, chromePath).catch((error) => {
        shortcutError = error instanceof Error ? error.message : String(error);
      });
    } else if (MANUAL_CAPTURE && POPUP_AUTOMATION) {
      captureInvokedAt = mediaReadyAt;
    }
    const shortcutPanel = shortcutError
      ? null
      : await waitForPanel(client).catch(() => null);
    const extensionTargetsAfterShortcut = await inspectExtensionTargets(port);
    const extensionDiagnosticsAfterShortcut = await readExtensionDiagnostics(port).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    const serviceWorkerDebug = shortcutPanel?.panelInjected || manualCapture?.popupClickProven
      ? null
      : await openPanelThroughServiceWorker(port).catch((error) => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }));
    const debugPanel = shortcutPanel?.panelInjected
      ? null
      : serviceWorkerDebug?.ok
        ? await waitForPanel(client, { timeoutMs: 7000 }).catch(() => null)
        : null;
    const extensionDiagnosticsAfterFallback = await readExtensionDiagnostics(port).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    const mediaPlaybackAfterCapture = proofReadyForMediaRestart(
      extensionDiagnosticsAfterShortcut,
      extensionDiagnosticsAfterFallback,
    )
      ? await startValidationMediaPlayback(client, { reset: true, target: "audio" }).catch((error) => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        }))
      : null;
    const transcriptProbe = await waitForTranscriptEvidence(client, TRANSCRIPT_WAIT_MS).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    const pageCaptureState = await readPageCaptureState(client).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    const panel =
      shortcutPanel ??
      debugPanel ??
      (transcriptProbe?.page?.panel?.panelInjected ? transcriptProbe.page.panel : null) ??
      (pageCaptureState?.panel?.panelInjected ? pageCaptureState.panel : null);
    let screenshotError = null;
    const screenshot = await client.send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    }, { timeoutMs: 4000 }).catch((error) => {
      screenshotError = error instanceof Error ? error.message : String(error);
      return null;
    });

    if (screenshot?.data) {
      await mkdir(dirname(SCREENSHOT_PATH), { recursive: true });
      await writeFile(SCREENSHOT_PATH, Buffer.from(screenshot.data, "base64"));
    }

    const proofEndedAt = Date.now();
    const latencyMs = buildLatencyMetrics({
      proofStartedAt,
      mediaReadyAt,
      captureInvokedAt,
      panel,
      transcriptProbe,
      pageCaptureState,
      extensionDiagnosticsAfterShortcut,
      extensionDiagnosticsAfterFallback,
      manualCapture,
      proofEndedAt,
    });
    const proof = {
      real_user_profile_used: false,
      extension_loaded: extensionTargetsAfterShortcut.yentlServiceWorkers.length > 0,
      manual_capture_mode: MANUAL_CAPTURE,
      popup_automation: MANUAL_CAPTURE ? POPUP_AUTOMATION : false,
      invocation_path: MANUAL_CAPTURE
        ? POPUP_AUTOMATION
          ? "popup"
          : "manual-toolbar-or-popup"
        : ATTEMPT_SHORTCUT
          ? "keyboard-shortcut"
          : "service-worker-fallback",
      popup_click_proven: Boolean(manualCapture?.popupClickProven),
      manual_invocation_proven: Boolean(
        manualCapture?.manualInvocationProven || manualCapture?.popupClickProven,
      ),
      shortcut_attempted: ATTEMPT_SHORTCUT,
      shortcut_strategy: ATTEMPT_SHORTCUT ? SHORTCUT_STRATEGY : "skipped",
      shortcut_command_proven: Boolean(shortcutPanel?.panelInjected),
      debug_service_worker_fallback_used: Boolean(!shortcutPanel?.panelInjected && serviceWorkerDebug),
      panel_injection_proven: Boolean(panel?.panelInjected),
      tab_capture_stream_id_available: Boolean(
        serviceWorkerDebug?.tabCaptureStreamIdAvailable ||
        manualCapture?.captureRunning ||
        extensionDiagnosticsAfterShortcut?.captureState?.running ||
        extensionDiagnosticsAfterFallback?.captureState?.running
      ),
      page_text_proven: Boolean(
        transcriptProbe?.pageTextProven ||
        pageCaptureState?.pageTextProven ||
        hasPageTextEvidence(pageCaptureState),
      ),
      live_transcription_proven: Boolean(
        manualCapture?.liveTranscriptionProven ||
        transcriptProbe?.liveTranscriptionProven
      ),
    };
    const report = {
      ok: EXTERNAL_PROOF
        ? Boolean(
            proof.panel_injection_proven &&
            (proof.page_text_proven || proof.live_transcription_proven || proof.tab_capture_stream_id_available),
          )
        : MANUAL_CAPTURE
          ? Boolean(
              proof.popup_click_proven &&
              proof.manual_invocation_proven &&
              (proof.tab_capture_stream_id_available || proof.live_transcription_proven),
            )
          : proof.panel_injection_proven,
      generated_at: new Date().toISOString(),
      chrome: chromePath,
      headless: HEADLESS,
      app_origin: APP_ORIGIN,
      target_url: TARGET_URL,
      external_proof: EXTERNAL_PROOF,
      extension_copy: relative(ROOT, extensionCopy),
      temp_profile: profileDir,
      extension_service_workers: extensionTargetsAfterShortcut.yentlServiceWorkers.map((target) => target.url),
      extension_targets_before_shortcut: extensionTargetsBeforeShortcut,
      extension_targets_after_shortcut: extensionTargetsAfterShortcut,
      screenshot: screenshot?.data ? relative(ROOT, SCREENSHOT_PATH) : null,
      screenshot_error: screenshotError,
      media_playback_before_shortcut: mediaPlaybackBeforeShortcut,
      media_playback_after_capture: mediaPlaybackAfterCapture,
      proof,
      latency_ms: latencyMs,
      manual_capture: manualCapture,
      shortcut_error: shortcutError,
      shortcut_panel: shortcutPanel,
      extension_diagnostics_after_shortcut: extensionDiagnosticsAfterShortcut,
      extension_diagnostics_after_fallback: extensionDiagnosticsAfterFallback,
      transcript_probe: transcriptProbe,
      page_capture_state: pageCaptureState,
      debug_panel: debugPanel,
      service_worker_debug: serviceWorkerDebug,
      panel,
      failure_reason: null,
      notes: HEADLESS
        ? [
            "This proof uses a temporary Chrome profile and does not modify the user's normal Chrome profile.",
            "Headless mode skips extension command shortcut proof by default because Chrome does not reliably dispatch browser-level extension shortcuts through CDP key events.",
            "Rerun with YENTL_EXTENSION_PROOF_HEADLESS=0 for a visible temporary-profile shortcut proof, or YENTL_EXTENSION_PROOF_SHORTCUT=1 to force the headless shortcut attempt.",
          ]
        : [
            "This proof uses a visible temporary Chrome profile and does not modify the user's normal Chrome profile.",
          ],
      chrome_log_tail: chromeLogLines.slice(-30),
    };
    report.failure_reason = buildFailureReason(report);

    await mkdir(dirname(REPORT_PATH), { recursive: true });
    await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

    if (!report.ok) {
      throw new Error(`Installed extension did not inject the Yentl panel. Report: ${REPORT_PATH}`);
    }

    console.log(JSON.stringify(report, null, 2));
  } finally {
    client?.close();
    if (chrome) await stopChrome(chrome);
    if (process.env.YENTL_EXTENSION_PROOF_KEEP_PROFILE !== "1") {
      await rm(tempRoot, { recursive: true, force: true }).catch(() => {});
    }
  }
}

async function assertAppIsServing() {
  const healthUrl = `${APP_ORIGIN}/session`;
  let response;
  try {
    response = await fetch(healthUrl);
  } catch (error) {
    throw new Error(
      `Yentl app is not reachable at ${healthUrl}. Start the dev server before running this proof. (${error instanceof Error ? error.message : String(error)})`,
    );
  }
  if (!response.ok) {
    throw new Error(`Yentl app returned ${response.status} at ${healthUrl}`);
  }
}

function chromeExecutable() {
  const candidates = [
    process.env.YENTL_CHROME_EXECUTABLE,
    ...chromeForTestingExecutables(),
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter(Boolean);

  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error("Could not find Chrome. Set YENTL_CHROME_EXECUTABLE to a Chrome/Chromium binary.");
  }
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

async function copyExtensionForLocalValidation(destination) {
  await copyDir(EXTENSION_DIR, destination);
  const localManifest = JSON.parse(await readFile(join(EXTENSION_DIR, "manifest.local.json"), "utf8"));
  if (EXTERNAL_TARGET_URL) {
    const externalPattern = `${new URL(EXTERNAL_TARGET_URL).origin}/*`;
    if (!localManifest.host_permissions.includes(externalPattern)) {
      localManifest.host_permissions.push(externalPattern);
    }
  }
  await writeFile(join(destination, "manifest.json"), `${JSON.stringify(localManifest, null, 2)}\n`);

  for (const file of ["background.js", "options.js"]) {
    const path = join(destination, file);
    const source = await readFile(path, "utf8");
    await writeFile(path, source.replaceAll("https://yentl.it", APP_ORIGIN));
  }
}

async function copyDir(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = join(source, entry.name);
    const to = join(destination, entry.name);
    if (entry.isDirectory()) {
      await copyDir(from, to);
    } else if (entry.isFile()) {
      await copyFile(from, to);
    }
  }
}

function spawnChrome(chromePath, port, profileDir, extensionDir, logLines) {
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profileDir}`,
    `--disable-extensions-except=${extensionDir}`,
    `--load-extension=${extensionDir}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-background-networking",
    "--disable-sync",
    "--disable-features=Translate,AutofillServerCommunication",
    "--window-size=1280,900",
    TARGET_URL,
  ];
  if (HEADLESS) args.unshift("--headless=new");

  const child = spawn(chromePath, args, {
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", (chunk) => {
    recordChromeLog(logLines, "stdout", chunk);
  });
  child.stderr.on("data", (chunk) => {
    const text = chunk.toString();
    recordChromeLog(logLines, "stderr", text);
    if (/ERROR|FATAL/i.test(text)) process.stderr.write(text);
  });
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      process.stderr.write(`Chrome exited with code ${code}${signal ? ` (${signal})` : ""}\n`);
    }
  });
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

async function startValidationMediaPlayback(client, options = {}) {
  const target = options.target ?? "audio";
  const reset = Boolean(options.reset);
  const result = await client.send("Runtime.evaluate", {
    expression: `
      (async () => {
        const audio = document.querySelector('audio');
        const videos = Array.from(document.querySelectorAll('video'));
        const preferredVideo = videos.find((candidate) => candidate.duration > 0 && candidate.readyState >= 2) || videos[0] || null;
        const media = ${JSON.stringify(target)} === "video" ? preferredVideo : audio || preferredVideo;
        for (const other of [audio, video].filter(Boolean)) {
          if (other !== media) other.pause();
        }
        if (!media) {
          return {
            ok: false,
            error: "No playable audio or video element found.",
            audioCount: document.querySelectorAll('audio').length,
            videoCount: document.querySelectorAll('video').length
          };
        }

        media.muted = false;
        media.volume = 1;
        if (${JSON.stringify(reset)}) media.currentTime = 0;
        let playError = null;
        try {
          await media.play();
        } catch (error) {
          playError = error?.message || String(error);
        }

        return {
          ok: !playError && !media.paused,
          title: document.title,
          target: media.tagName.toLowerCase(),
          audioCount: document.querySelectorAll('audio').length,
          videoCount: document.querySelectorAll('video').length,
          paused: media.paused,
          muted: media.muted,
          volume: media.volume,
          currentTime: media.currentTime,
          duration: media.duration,
          readyState: media.readyState,
          playError
        };
      })()
    `,
    awaitPromise: true,
    returnByValue: true,
  });

  return result.result?.value ?? { ok: false, error: "Media playback returned no value." };
}

function proofReadyForMediaRestart(afterShortcut, afterFallback) {
  return Boolean(afterShortcut?.captureState?.running || afterFallback?.captureState?.running);
}

async function pressExtensionShortcut(client, chromePath) {
  if (SHORTCUT_STRATEGY === "os") {
    await pressOsExtensionShortcut(chromePath);
    return;
  }

  if (SHORTCUT_STRATEGY !== "cdp") {
    throw new Error(
      `Unsupported shortcut strategy "${SHORTCUT_STRATEGY}". Use "os" or "cdp".`,
    );
  }

  await pressCdpExtensionShortcut(client);
}

async function pressOsExtensionShortcut(chromePath) {
  await runOsascript([
    `tell application ${JSON.stringify(chromeApplicationName(chromePath))} to activate`,
    "delay 0.5",
    'tell application "System Events" to keystroke "y" using {option down, shift down}',
  ]);
  await sleep(800);
}

function chromeApplicationName(chromePath) {
  if (chromePath.includes("Google Chrome for Testing.app")) return "Google Chrome for Testing";
  if (chromePath.includes("Google Chrome Canary.app")) return "Google Chrome Canary";
  if (chromePath.includes("Chromium.app")) return "Chromium";
  return "Google Chrome";
}

function runOsascript(lines) {
  return new Promise((resolve, reject) => {
    const child = spawn("osascript", lines.flatMap((line) => ["-e", line]), {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill("SIGKILL");
      reject(new Error("Timed out sending OS-level extension shortcut with osascript."));
    }, 5000);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(stderr.trim() || `osascript exited with code ${code}`));
      }
    });
  });
}

async function pressCdpExtensionShortcut(client) {
  const modifiers = 1 | 8; // Alt + Shift
  const sendKey = (params) => client.send("Input.dispatchKeyEvent", params, { timeoutMs: 1500 });
  await sendKey({
    type: "keyDown",
    key: "Alt",
    code: "AltLeft",
    windowsVirtualKeyCode: 18,
    nativeVirtualKeyCode: 18,
    modifiers: 1,
  });
  await sendKey({
    type: "keyDown",
    key: "Shift",
    code: "ShiftLeft",
    windowsVirtualKeyCode: 16,
    nativeVirtualKeyCode: 16,
    modifiers,
  });
  await sendKey({
    type: "rawKeyDown",
    key: "Y",
    code: "KeyY",
    windowsVirtualKeyCode: 89,
    nativeVirtualKeyCode: 89,
    modifiers,
  });
  await sendKey({
    type: "keyUp",
    key: "Y",
    code: "KeyY",
    windowsVirtualKeyCode: 89,
    nativeVirtualKeyCode: 89,
    modifiers,
  });
  await sendKey({
    type: "keyUp",
    key: "Shift",
    code: "ShiftLeft",
    windowsVirtualKeyCode: 16,
    nativeVirtualKeyCode: 16,
    modifiers: 1,
  });
  await sendKey({
    type: "keyUp",
    key: "Alt",
    code: "AltLeft",
    windowsVirtualKeyCode: 18,
    nativeVirtualKeyCode: 18,
    modifiers: 0,
  });
}

async function waitForPanel(client, options = {}) {
  return waitForExpression(
    client,
    `
      (() => {
        const host = document.querySelector('#yentl-extension-panel-host');
        const shadow = host?.shadowRoot;
        const iframe = shadow?.querySelector('iframe');
        const status = shadow?.querySelector('[data-yentl-status]');
        return host && iframe ? {
          panelInjected: true,
          bodyMarginRight: document.body.style.marginRight,
          iframeSrc: iframe.getAttribute('src'),
          statusText: status?.textContent || null,
          hostWidth: getComputedStyle(host).width
        } : null;
      })()
    `,
    { timeoutMs: options.timeoutMs ?? 12000, expectObject: true },
  );
}

async function installCaptureEventRecorder(client) {
  await client.send("Runtime.evaluate", {
    expression: `
      (() => {
        window.__YENTL_CAPTURE_DEBUG__ = true;
        window.__YENTL_CAPTURE_EVENTS__ = [];
        if (!window.__YENTL_CAPTURE_EVENT_RECORDER__) {
          window.__YENTL_CAPTURE_EVENT_RECORDER__ = true;
          window.addEventListener('yentl-extension-message', (event) => {
            window.__YENTL_CAPTURE_EVENTS__.push({
              at: Date.now(),
              detail: event.detail
            });
          });
        }
        return true;
      })()
    `,
    returnByValue: true,
  });
}

async function invokePopupStartButton(port, chromePath, timeoutMs) {
  await waitForYentlExtension(port, Math.min(timeoutMs, 15000));
  const extensionId = await getYentlExtensionId(port);
  const popupUrl = `chrome-extension://${extensionId}/popup.html`;
  const pageTarget = await waitForTarget(
    port,
    (target) => target.type === "page" && target.url.startsWith(TARGET_URL),
    timeoutMs,
  );
  const pageClient = await connectCdp(pageTarget.webSocketDebuggerUrl);
  let popupClient = null;

  try {
    await pageClient.send("Page.bringToFront");
    await dispatchPageClickGesture(pageClient);
    const popupOpen = await openExtensionPopup(port).catch(async (error) => {
      const browserClient = await connectBrowserCdp(port);
      try {
        await browserClient.send("Target.createTarget", { url: popupUrl });
      } finally {
        browserClient.close();
      }
      return {
        ok: true,
        fallback: "target-create",
        warning: error instanceof Error ? error.message : String(error),
      };
    });
    const popupTarget = await waitForTarget(
      port,
      (target) => target.type === "page" && target.url === popupUrl,
      Math.min(timeoutMs, 12000),
    );
    popupClient = await connectCdp(popupTarget.webSocketDebuggerUrl);
    await popupClient.send("Runtime.enable");
    await waitForExpression(popupClient, "document.getElementById('start') && !document.getElementById('start').disabled", {
      timeoutMs: Math.min(timeoutMs, 12000),
    });

    const clickResult = await popupClient.send("Runtime.evaluate", {
      expression: `
        (async () => {
          const button = document.getElementById("start");
          if (!button) return { ok: false, error: "Popup start button not found." };
          if (button.disabled) return { ok: false, error: "Popup start button was disabled." };
          button.click();
          return {
            ok: true,
            buttonText: button.textContent,
            statusText: document.getElementById("status")?.textContent || null
          };
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    if (clickResult.exceptionDetails) {
      throw new Error(
        clickResult.exceptionDetails.exception?.description ||
        clickResult.exceptionDetails.text ||
        "Popup start click threw an exception.",
      );
    }

    const clickValue = clickResult.result?.value ?? { ok: false, error: "Popup click returned no value." };
    if (!clickValue.ok) {
      throw new Error(clickValue.error || "Popup start click failed.");
    }

    let activeTabUnlock = null;
    const start = Date.now();
    let last = null;
    while (Date.now() - start < timeoutMs) {
      const diagnostics = await readExtensionDiagnostics(port).catch((error) => ({
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      }));
      const captureRunning = Boolean(diagnostics.captureState?.running);
      last = {
        ok: captureRunning,
        waited_ms: Date.now() - start,
        popupClickProven: true,
        manualInvocationProven: true,
        captureRunning,
        popup_click: clickValue,
        popup_open: popupOpen,
        active_tab_unlock: activeTabUnlock,
        diagnostics,
      };
      if (captureRunning) return last;

      if (!activeTabUnlock && Date.now() - start >= 5000) {
        activeTabUnlock = await unlockActiveTabAfterPopup(pageClient, chromePath);
        last.active_tab_unlock = activeTabUnlock;
      }

      await sleep(500);
    }

    return {
      ok: false,
      error: "Popup start click succeeded, but capture state did not become running before timeout.",
      waited_ms: Date.now() - start,
      popupClickProven: true,
      manualInvocationProven: true,
      popup_click: clickValue,
      popup_open: popupOpen,
      active_tab_unlock: activeTabUnlock,
      ...last,
    };
  } finally {
    popupClient?.close();
    pageClient.close();
  }
}

async function dispatchPageClickGesture(client) {
  await client.send("Input.dispatchMouseEvent", {
    type: "mousePressed",
    x: 180,
    y: 180,
    button: "left",
    clickCount: 1,
  });
  await client.send("Input.dispatchMouseEvent", {
    type: "mouseReleased",
    x: 180,
    y: 180,
    button: "left",
    clickCount: 1,
  });
}

async function unlockActiveTabAfterPopup(pageClient, chromePath) {
  try {
    await pressOsExtensionShortcut(chromePath);
    return "os-shortcut-after-popup-click";
  } catch (osError) {
    try {
      await pressCdpExtensionShortcut(pageClient);
      return "cdp-shortcut-after-popup-click";
    } catch (cdpError) {
      return `shortcut-unlock-failed:${osError instanceof Error ? osError.message : String(osError)};${cdpError instanceof Error ? cdpError.message : String(cdpError)}`;
    }
  }
}

async function openExtensionPopup(port) {
  const workerClient = await connectToYentlServiceWorker(port);
  try {
    const result = await workerClient.send("Runtime.evaluate", {
      expression: `
        (async () => {
          if (!chrome.action?.openPopup) {
            return { ok: false, error: "chrome.action.openPopup is unavailable in this Chrome build." };
          }
          try {
            await chrome.action.openPopup();
            return { ok: true };
          } catch (error) {
            return { ok: false, error: error?.message || String(error) };
          }
        })()
      `,
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "chrome.action.openPopup threw an exception.",
      );
    }

    const value = result.result?.value ?? { ok: false, error: "openPopup returned no value." };
    if (!value.ok) {
      throw new Error(value.error || "chrome.action.openPopup failed.");
    }
  } finally {
    workerClient.close();
  }
}

async function waitForYentlExtension(port, timeoutMs) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targets = await inspectExtensionTargets(port);
    if (targets.yentlServiceWorkers.length > 0) return targets;
    await sleep(250);
  }
  throw new Error("Timed out waiting for the installed Yentl extension service worker.");
}

async function getYentlExtensionId(port) {
  const targets = await inspectExtensionTargets(port);
  const serviceWorker = targets.yentlServiceWorkers[0];
  if (!serviceWorker?.url) {
    throw new Error("Could not resolve the installed Yentl extension id.");
  }
  const match = serviceWorker.url.match(/^chrome-extension:\/\/([^/]+)\//);
  if (!match?.[1]) {
    throw new Error(`Could not parse extension id from ${serviceWorker.url}`);
  }
  return match[1];
}

async function connectBrowserCdp(port) {
  const version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => {
    if (!response.ok) throw new Error(`DevTools version endpoint returned ${response.status}`);
    return response.json();
  });
  if (!version.webSocketDebuggerUrl) {
    throw new Error("DevTools version endpoint did not expose a browser websocket URL.");
  }
  return connectCdp(version.webSocketDebuggerUrl);
}

async function waitForManualCapture(client, port, timeoutMs) {
  console.error(
    [
      "Manual capture mode:",
      "1. In the temporary Chrome for Testing window, keep /validation/browser-capture.html active.",
      "2. Start either media player.",
      "3. Click the Yentl extension toolbar action or its popup start control.",
      `4. Waiting up to ${Math.round(timeoutMs / 1000)}s for capture state or transcript evidence...`,
    ].join("\n"),
  );

  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    const page = await readPageCaptureState(client).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    const diagnostics = await readExtensionDiagnostics(port).catch((error) => ({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }));
    const eventTypes = (page.events ?? []).map((event) => event.detail?.type).filter(Boolean);
    const captureRunning = Boolean(
      diagnostics.captureState?.running ||
      (page.events ?? []).some((event) => event.detail?.type === "capture-status" && event.detail?.payload?.running)
    );
    const liveTranscriptionProven = eventTypes.includes("transcript-final") || eventTypes.includes("transcript-interim");
    const manualInvocationProven = Boolean(
      page.panel?.panelInjected ||
      captureRunning ||
      eventTypes.includes("capture-start") ||
      eventTypes.includes("capture-error") ||
      eventTypes.includes("capture-status")
    );
    last = {
      ok: captureRunning || liveTranscriptionProven,
      waited_ms: Date.now() - start,
      manualInvocationProven,
      captureRunning,
      liveTranscriptionProven,
      eventTypes,
      page,
      diagnostics,
    };

    if (captureRunning || liveTranscriptionProven) return last;
    await sleep(1000);
  }

  return {
    ok: false,
    error: "Timed out waiting for manual extension invocation to produce capture state or transcript evidence.",
    waited_ms: Date.now() - start,
    ...last,
  };
}

async function waitForTranscriptEvidence(client, timeoutMs) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    const page = await readPageCaptureState(client);
    const liveTranscriptionProven = hasTranscriptEvidence(page);
    const pageTextProven = hasPageTextEvidence(page);
    last = {
      ok: liveTranscriptionProven || (EXTERNAL_PROOF && pageTextProven),
      waited_ms: Date.now() - start,
      liveTranscriptionProven,
      pageTextProven,
      page,
    };
    if (last.ok) return last;
    await sleep(1000);
  }

  return {
    ok: false,
    waited_ms: Date.now() - start,
    liveTranscriptionProven: false,
    ...last,
  };
}

function hasTranscriptEvidence(page) {
  const iframeText = page?.panel?.iframeText || "";
  const eventTypes = (page?.events ?? []).map((event) => event.detail?.type);
  return (
    /Welcome to the Yentl[e]? validation panel/i.test(iframeText) ||
    /city library budget increased/i.test(iframeText) ||
    /transcript lines captured/i.test(iframeText) ||
    /SPEAKER 1/i.test(iframeText) ||
    eventTypes.includes("transcript-final") ||
    eventTypes.includes("transcript-interim")
  );
}

function buildLatencyMetrics({
  proofStartedAt,
  mediaReadyAt,
  captureInvokedAt,
  panel,
  transcriptProbe,
  pageCaptureState,
  extensionDiagnosticsAfterShortcut,
  extensionDiagnosticsAfterFallback,
  manualCapture,
  proofEndedAt,
}) {
  const events = pageCaptureState?.events ?? transcriptProbe?.page?.events ?? [];
  const eventAt = (type) => {
    const event = events.find((entry) => entry.detail?.type === type);
    return typeof event?.at === "number" ? event.at : null;
  };
  const delta = (from, to) =>
    typeof from === "number" && typeof to === "number" ? Math.max(0, to - from) : null;
  const captureRunning = Boolean(
    manualCapture?.captureRunning ||
      extensionDiagnosticsAfterShortcut?.captureState?.running ||
      extensionDiagnosticsAfterFallback?.captureState?.running ||
      events.some(
        (event) =>
          event.detail?.type === "capture-status" && event.detail?.payload?.running === true,
      ) ||
      eventAt("capture-start") != null,
  );
  const firstTranscriptAt =
    eventAt("transcript-final") ??
    eventAt("transcript-interim") ??
    (transcriptProbe?.liveTranscriptionProven ? proofStartedAt + (transcriptProbe?.waited_ms ?? 0) : null);

  return {
    total_ms: delta(proofStartedAt, proofEndedAt),
    media_ready_ms: delta(proofStartedAt, mediaReadyAt),
    capture_invocation_ms: delta(proofStartedAt, captureInvokedAt),
    panel_injection_ms: panel?.panelInjected
      ? delta(captureInvokedAt ?? proofStartedAt, proofEndedAt)
      : null,
    capture_running_observed: captureRunning,
    capture_start_event_ms: delta(proofStartedAt, eventAt("capture-start")),
    first_transcript_wait_ms: transcriptProbe?.waited_ms ?? null,
    first_transcript_event_ms: delta(proofStartedAt, firstTranscriptAt),
    manual_capture_wait_ms: manualCapture?.waited_ms ?? null,
  };
}

function hasPageTextEvidence(page) {
  const iframeText = page?.panel?.iframeText || "";
  const eventTypes = (page?.events ?? []).map((event) => event.detail?.type);
  const pageTextEvent = (page?.events ?? []).find((event) => event.detail?.type === "page-text");
  const chunkCount = pageTextEvent?.detail?.payload?.chunks?.length ?? 0;
  const textLength = String(pageTextEvent?.detail?.payload?.text ?? "").length;
  return (
    eventTypes.includes("page-text") ||
    chunkCount >= 1 ||
    textLength >= 120 ||
    (/YENTL'S READ/i.test(iframeText) &&
      !/Waiting for the Yentl extension to attach/i.test(iframeText) &&
      iframeText.length >= 180) ||
    /Yentl is connected to this tab/i.test(page?.panel?.statusText || "")
  );
}

async function readPageCaptureState(client) {
  const result = await client.send("Runtime.evaluate", {
    expression: `
      (() => {
        const host = document.querySelector('#yentl-extension-panel-host');
        const shadow = host?.shadowRoot;
        const iframe = shadow?.querySelector('iframe');
        const status = shadow?.querySelector('[data-yentl-status]');
        let iframeText = null;
        let iframeError = null;
        try {
          iframeText = iframe?.contentDocument?.body?.innerText?.slice(0, 8000) || null;
        } catch (error) {
          iframeError = error?.message || String(error);
        }
        const events = Array.isArray(window.__YENTL_CAPTURE_EVENTS__)
          ? window.__YENTL_CAPTURE_EVENTS__.slice(-30)
          : [];
        return {
          ok: true,
          panel: host && iframe ? {
            panelInjected: true,
            bodyMarginRight: document.body.style.marginRight,
            iframeSrc: iframe.getAttribute('src'),
            iframeText,
            iframeError,
            statusText: status?.textContent || null,
            hostWidth: getComputedStyle(host).width
          } : null,
          events
        };
      })()
    `,
    returnByValue: true,
  });

  return result.result?.value ?? { ok: false, error: "Page capture state returned no value." };
}

async function openPanelThroughServiceWorker(port) {
  const targets = await listTargets(port).catch(() => []);
  const serviceWorker = targets.find((target) =>
    isYentlServiceWorkerTarget(target) && target.webSocketDebuggerUrl,
  );
  if (!serviceWorker?.webSocketDebuggerUrl) {
    throw new Error("No installed Yentl extension service worker target was available for diagnostic fallback.");
  }

  const workerClient = await connectCdp(serviceWorker.webSocketDebuggerUrl);
  try {
    await workerClient.send("Runtime.enable");
    const result = await workerClient.send("Runtime.evaluate", {
      expression: serviceWorkerPanelExpression(),
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Service-worker diagnostic fallback threw an exception.",
      );
    }

    return result.result?.value ?? { ok: false, error: "Service-worker diagnostic fallback returned no value." };
  } finally {
    workerClient.close();
  }
}

async function readExtensionDiagnostics(port) {
  const workerClient = await connectToYentlServiceWorker(port);
  try {
    await workerClient.send("Runtime.enable");
    const result = await workerClient.send("Runtime.evaluate", {
      expression: extensionDiagnosticsExpression(),
      awaitPromise: true,
      returnByValue: true,
    });

    if (result.exceptionDetails) {
      throw new Error(
        result.exceptionDetails.exception?.description ||
        result.exceptionDetails.text ||
        "Extension diagnostics threw an exception.",
      );
    }

    return result.result?.value ?? { ok: false, error: "Extension diagnostics returned no value." };
  } finally {
    workerClient.close();
  }
}

async function connectToYentlServiceWorker(port) {
  const targets = await listTargets(port).catch(() => []);
  const serviceWorker = targets.find((target) =>
    isYentlServiceWorkerTarget(target) && target.webSocketDebuggerUrl,
  );
  if (!serviceWorker?.webSocketDebuggerUrl) {
    throw new Error("No installed Yentl extension service worker target was available.");
  }

  return connectCdp(serviceWorker.webSocketDebuggerUrl);
}

function extensionDiagnosticsExpression() {
  return `
    (async () => {
      try {
        const stored = await chrome.storage.session.get("captureState").catch((error) => ({
          __error: error?.message || String(error)
        }));
        const contexts = chrome.runtime.getContexts
          ? await chrome.runtime.getContexts({}).catch((error) => [{ error: error?.message || String(error) }])
          : [];
        const badgeText = chrome.action?.getBadgeText
          ? await chrome.action.getBadgeText({}).catch((error) => "ERR:" + (error?.message || String(error)))
          : null;

        return {
          ok: true,
          captureState: stored.captureState || null,
          storageError: stored.__error || null,
          badgeText,
          contexts: contexts.map((context) => ({
            contextType: context.contextType,
            documentUrl: context.documentUrl,
            frameId: context.frameId,
            tabId: context.tabId,
            error: context.error
          }))
        };
      } catch (error) {
        return { ok: false, error: error?.message || String(error) };
      }
    })()
  `;
}

function serviceWorkerPanelExpression() {
  const appOrigin = JSON.stringify(APP_ORIGIN);
  const targetUrl = JSON.stringify(TARGET_URL);
  return `
    (async () => {
      try {
        const targetUrl = ${targetUrl};
        const tabs = await chrome.tabs.query({});
        const tabSummaries = tabs.map((candidate) => ({
          id: candidate.id,
          active: candidate.active,
          title: candidate.title,
          url: candidate.url
        }));
        const exactTab = tabs.find((candidate) =>
          typeof candidate.url === "string" && candidate.url.startsWith(targetUrl)
        );
        const fallbackTab = tabs.find((candidate) =>
          typeof candidate.url === "string" &&
          (candidate.url.startsWith(${appOrigin}) || candidate.url.startsWith("http://localhost:3000"))
        ) || tabs.find((candidate) => candidate.active) || tabs[0];
        const tab = exactTab || fallbackTab;
        if (!tab?.id) {
          return {
            ok: false,
            error: "No validation tab was available to the extension.",
            tabCount: tabs.length,
            tabs: tabSummaries
          };
        }

        await chrome.tabs.update(tab.id, { active: true });
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content-script.js"]
        });

        const bridgeToken = crypto.randomUUID();
        await chrome.tabs.sendMessage(tab.id, {
          target: "yentl-content-script",
          type: "open-panel",
          appOrigin: ${appOrigin},
          bridgeToken,
          tab: {
            tab_id: tab.id,
            title: tab.title || "Browser tab",
            url: tab.url || ""
          }
        });

        let tabCaptureStreamIdAvailable = false;
        let tabCaptureError = null;
        try {
          const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tab.id });
          tabCaptureStreamIdAvailable = Boolean(streamId);
        } catch (error) {
          tabCaptureError = error?.message || String(error);
        }

        return {
          ok: true,
          matchedExactValidationUrl: Boolean(exactTab),
          tabs: tabSummaries,
          tabId: tab.id,
          title: tab.title,
          url: tab.url,
          panelMessageSent: true,
          tabCaptureStreamIdAvailable,
          tabCaptureError
        };
      } catch (error) {
        return { ok: false, error: error?.message || String(error) };
      }
    })()
  `;
}

async function waitForExpression(client, expression, options = {}) {
  const timeoutMs = options.timeoutMs ?? 10000;
  const start = Date.now();
  let lastValue = null;
  while (Date.now() - start < timeoutMs) {
    const result = await client.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
    });
    lastValue = result.result?.value;
    if (options.expectObject ? lastValue && typeof lastValue === "object" : Boolean(lastValue)) {
      return lastValue;
    }
    await sleep(250);
  }
  throw new Error(`Timed out waiting for expression. Last value: ${JSON.stringify(lastValue)}`);
}

async function waitForTarget(port, predicate, timeoutMs = 12000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const targets = await listTargets(port).catch(() => []);
    const target = targets.find(predicate);
    if (target?.webSocketDebuggerUrl) return target;
    await sleep(250);
  }
  throw new Error("Timed out waiting for Chrome DevTools target.");
}

async function listTargets(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
  if (!response.ok) throw new Error(`DevTools target list returned ${response.status}`);
  return response.json();
}

async function inspectExtensionTargets(port) {
  const targets = await listTargets(port).catch(() => []);
  const extensionTargets = targets
    .filter((target) => typeof target.url === "string" && target.url.startsWith("chrome-extension://"))
    .map((target) => ({
      type: target.type,
      title: target.title,
      url: target.url,
    }));

  return {
    all: extensionTargets,
    serviceWorkers: extensionTargets.filter((target) => target.type === "service_worker"),
    yentlServiceWorkers: extensionTargets.filter(isYentlServiceWorkerTarget),
    pages: extensionTargets.filter((target) => target.type === "page"),
  };
}

function isYentlServiceWorkerTarget(target) {
  return (
    target.type === "service_worker" &&
    typeof target.url === "string" &&
    target.url.startsWith("chrome-extension://") &&
    target.url.endsWith("/background.js")
  );
}

function buildFailureReason(report) {
  if (report.proof.manual_capture_mode && !report.proof.manual_invocation_proven) {
    return report.proof.popup_automation
      ? "Popup automation mode did not prove a Yentl popup start click before the timeout."
      : "Manual capture mode did not observe a Yentl toolbar/popup invocation before the timeout.";
  }

  if (report.proof.manual_capture_mode && report.proof.manual_invocation_proven && !report.proof.tab_capture_stream_id_available) {
    return "Manual capture mode observed extension invocation, but did not observe tab-capture state or transcript evidence.";
  }

  if (report.ok) return null;

  if (!report.proof.extension_loaded && report.headless) {
    return "No extension service worker appeared after the command shortcut. Headless Chrome may be suppressing extension command dispatch, or the extension failed to load in the temporary profile.";
  }

  if (!report.proof.extension_loaded) {
    return "No extension service worker appeared after the command shortcut, so the background command handler did not run or the extension failed to load.";
  }

  if (report.service_worker_debug?.error) {
    return `The extension background target appeared, but panel injection failed during diagnostic fallback: ${report.service_worker_debug.error}`;
  }

  return "The extension background target appeared, but the Yentl panel host was not injected into the validation page.";
}

async function connectCdp(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let nextId = 1;

  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });

  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id) return;
    const handlers = pending.get(message.id);
    if (!handlers) return;
    pending.delete(message.id);
    clearTimeout(handlers.timeout);
    if (message.error) {
      handlers.reject(new Error(message.error.message ?? JSON.stringify(message.error)));
    } else {
      handlers.resolve(message.result ?? {});
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
        try {
          socket.send(JSON.stringify({ id, method, params }));
        } catch (error) {
          pending.delete(id);
          clearTimeout(timeout);
          reject(error);
        }
      });
    },
    close() {
      for (const handlers of pending.values()) {
        clearTimeout(handlers.timeout);
        handlers.reject(new Error("CDP client closed."));
      }
      pending.clear();
      if (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING) {
        socket.close();
      }
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
