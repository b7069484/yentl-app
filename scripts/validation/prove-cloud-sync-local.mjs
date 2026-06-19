#!/usr/bin/env node
import { existsSync, readdirSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { homedir, tmpdir } from "node:os";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_CLOUD_SYNC_PROOF_ORIGIN ?? "http://127.0.0.1:3000";
const REPORT_PATH = join(
  ROOT,
  /localhost|127\.0\.0\.1/i.test(APP_ORIGIN)
    ? "docs/superpowers/validation/cloud-sync-local-proof.json"
    : "docs/superpowers/validation/cloud-sync-deploy-proof.json",
);
const AUTH_HEADER = process.env.YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER?.trim() || null;
const REQUEST_TIMEOUT_MS = Number(process.env.YENTL_CLOUD_SYNC_PROOF_TIMEOUT_MS ?? 15000);

async function main() {
  const checks = [];
  checks.push(await runCheck("app-reachable", proveAppReachable));

  const availability = await probeCloudAvailability();
  checks.push(availability.check);

  if (availability.mode === "cloud_unavailable") {
    checks.push(await runCheck("unconfigured-list-response", () =>
      proveUnconfiguredListResponse(availability),
    ));
    checks.push(await runCheck("unconfigured-save-response", proveUnconfiguredSaveResponse));
    checks.push(await runCheck("invalid-save-json-guard", proveInvalidSaveJsonGuard));
  } else if (availability.mode === "signed_out") {
    checks.push(await runCheck("signed-out-list-guard", () =>
      proveSignedOutListGuard(availability),
    ));
    checks.push(await runCheck("signed-out-save-guard", () =>
      proveSignedOutSaveGuard(availability),
    ));
    checks.push(await runCheck("signed-out-session-id-guard", () =>
      proveSignedOutSessionIdGuard(availability),
    ));
    checks.push(await runCheck("invalid-save-payload-guard", () =>
      proveInvalidSavePayloadGuard(availability),
    ));
    checks.push(await runCheck("invalid-save-json-guard", proveInvalidSaveJsonGuard));
    checks.push(await runCheck("invalid-rename-json-guard", proveInvalidRenameJsonGuard));
  } else if (availability.mode === "authenticated") {
    checks.push(await runCheck("authenticated-list", proveAuthenticatedList));
    checks.push(await runCheck("invalid-save-json-guard", proveInvalidSaveJsonGuard));
    checks.push(await runCheck("invalid-rename-json-guard", proveInvalidRenameJsonGuard));
    checks.push(await runCheck("authenticated-save-load-rename-list-tv-delete", () =>
      proveAuthenticatedCrud(),
    ));
    checks.push(await runCheck("authenticated-two-profile-browser-restore", () =>
      proveAuthenticatedTwoProfileBrowserRestore(),
    ));
  }

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    cloud_configured: availability.mode !== "cloud_unavailable",
    cloud_mode: availability.mode,
    authenticated_proof_requested: Boolean(AUTH_HEADER),
    authenticated_proof_skipped: availability.mode === "signed_out" && !AUTH_HEADER,
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
    notes: buildNotes(availability),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Cloud sync proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

function buildNotes(availability) {
  const notes = [];
  if (availability.mode === "cloud_unavailable") {
    notes.push(
      "Cloud sync is not configured for this origin. Guest/local fallback behavior is the expected success path.",
    );
  } else if (availability.mode === "signed_out" && !AUTH_HEADER) {
    notes.push(
      "Cloud sync is configured but no auth header was provided. Signed-out guards are the expected success path.",
    );
    notes.push(
      "Set YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER to run authenticated save/load/list/rename/TV/delete and two-profile browser restore proof.",
    );
  }
  return notes;
}

async function proveAppReachable() {
  const { status } = await readText("/session");
  if (status !== 200) {
    throw new Error(`/session returned ${status}`);
  }
  return { status };
}

async function probeCloudAvailability() {
  const { status, json } = await readJson("/api/sessions");
  const code = json?.error?.code ?? null;

  if (status === 503 && code === "cloud_unavailable") {
    return {
      mode: "cloud_unavailable",
      check: {
        name: "cloud-availability",
        ok: true,
        elapsed_ms: 0,
        status,
        code,
      },
    };
  }

  if (status === 401 && code === "signed_out") {
    if (AUTH_HEADER) {
      const authed = await readJson("/api/sessions", undefined, { includeAuth: true });
      if (authed.status === 200) {
        return {
          mode: "authenticated",
          check: {
            name: "cloud-availability",
            ok: true,
            elapsed_ms: 0,
            status: authed.status,
            code: null,
          },
        };
      }
    }

    return {
      mode: "signed_out",
      check: {
        name: "cloud-availability",
        ok: true,
        elapsed_ms: 0,
        status,
        code,
      },
    };
  }

  if (status === 200) {
    return {
      mode: AUTH_HEADER ? "authenticated" : "signed_out",
      check: {
        name: "cloud-availability",
        ok: true,
        elapsed_ms: 0,
        status,
        code: null,
      },
    };
  }

  return {
    mode: "unknown",
    check: {
      name: "cloud-availability",
      ok: false,
      elapsed_ms: 0,
      error: `Unexpected /api/sessions response: status=${status} code=${code ?? "none"}`,
      status,
      code,
    },
  };
}

async function proveUnconfiguredListResponse(availability) {
  if (availability.check.status !== 503) {
    throw new Error(`expected 503 cloud_unavailable, got ${availability.check.status}`);
  }
  if (availability.check.code !== "cloud_unavailable") {
    throw new Error(`expected cloud_unavailable code, got ${availability.check.code}`);
  }
  return { status: availability.check.status, code: availability.check.code };
}

async function proveUnconfiguredSaveResponse() {
  const { status, json } = await postJson("/api/sessions", minimalSaveBody());
  if (status !== 503) {
    throw new Error(`expected 503 for unconfigured save, got ${status}`);
  }
  if (json?.error?.code !== "cloud_unavailable") {
    throw new Error(`expected cloud_unavailable on save, got ${json?.error?.code ?? "none"}`);
  }
  return { status, code: json.error.code };
}

async function proveSignedOutListGuard(availability) {
  if (availability.check.status !== 401) {
    throw new Error(`expected 401 signed_out list guard, got ${availability.check.status}`);
  }
  if (availability.check.code !== "signed_out") {
    throw new Error(`expected signed_out code, got ${availability.check.code}`);
  }
  return { status: availability.check.status, code: availability.check.code };
}

async function proveSignedOutSaveGuard() {
  const { status, json } = await postJson("/api/sessions", minimalSaveBody());
  if (status !== 401) {
    throw new Error(`expected 401 for signed-out save, got ${status}`);
  }
  if (json?.error?.code !== "signed_out") {
    throw new Error(`expected signed_out on save, got ${json?.error?.code ?? "none"}`);
  }
  return { status, code: json.error.code };
}

async function proveSignedOutSessionIdGuard() {
  const { status, json } = await readJson("/api/sessions/cloud-sync-proof-id");
  if (status !== 401) {
    throw new Error(`expected 401 for signed-out session load, got ${status}`);
  }
  if (json?.error?.code !== "signed_out") {
    throw new Error(`expected signed_out on session load, got ${json?.error?.code ?? "none"}`);
  }
  return { status, code: json.error.code };
}

async function proveInvalidSavePayloadGuard() {
  const { status, json } = await postJson("/api/sessions", { session: { title: "missing arrays" } });
  if (status !== 400) {
    throw new Error(`expected 400 invalid_request for malformed save payload, got ${status}`);
  }
  if (json?.error?.code !== "invalid_request") {
    throw new Error(`expected invalid_request code, got ${json?.error?.code ?? "none"}`);
  }
  return { status, code: json.error.code };
}

async function proveInvalidSaveJsonGuard() {
  const { status, json } = await readJson("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  if (status !== 400) {
    throw new Error(`expected 400 invalid_request for malformed save JSON, got ${status}`);
  }
  if (json?.error?.code !== "invalid_request") {
    throw new Error(`expected invalid_request code for malformed save JSON, got ${json?.error?.code ?? "none"}`);
  }
  return { status, code: json.error.code };
}

async function proveInvalidRenameJsonGuard() {
  const { status, json } = await readJson(sessionApiPath("cloud-sync-proof-id"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: "{not json",
  });
  if (status !== 400) {
    throw new Error(`expected 400 invalid_request for malformed rename JSON, got ${status}`);
  }
  if (json?.error?.code !== "invalid_request") {
    throw new Error(`expected invalid_request code for malformed rename JSON, got ${json?.error?.code ?? "none"}`);
  }
  return { status, code: json.error.code };
}

async function proveAuthenticatedList() {
  const { status, json } = await readJson("/api/sessions", undefined, { includeAuth: true });
  if (status !== 200) {
    throw new Error(`authenticated list returned ${status}: ${JSON.stringify(json)}`);
  }
  if (!Array.isArray(json?.sessions)) {
    throw new Error("authenticated list response missing sessions array");
  }
  return { status, session_count: json.sessions.length };
}

async function proveAuthenticatedCrud() {
  const saveBody = minimalSaveBody("Cloud sync proof session");
  const created = await postJson("/api/sessions", saveBody, { includeAuth: true });
  if (created.status !== 200) {
    throw new Error(`authenticated save returned ${created.status}: ${JSON.stringify(created.json)}`);
  }

  const sessionId = created.json?.session?.id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("authenticated save did not return a session id");
  }

  assertSavedSessionEnvelope(created.json?.session, "created session");

  const loadedAfterSave = await readJson(sessionApiPath(sessionId), undefined, { includeAuth: true });
  if (loadedAfterSave.status !== 200) {
    throw new Error(`authenticated load after save returned ${loadedAfterSave.status}: ${JSON.stringify(loadedAfterSave.json)}`);
  }
  assertSavedSessionEnvelope(loadedAfterSave.json?.session, "loaded session");
  if (loadedAfterSave.json.session.session.title !== saveBody.session.title) {
    throw new Error("authenticated load did not preserve session title");
  }

  const listedAfterSave = await readJson("/api/sessions", undefined, { includeAuth: true });
  const savedListEntry = findListedSession(listedAfterSave, sessionId);
  if (!savedListEntry) {
    throw new Error("authenticated list did not include the newly saved session");
  }

  const renamedName = "Renamed cloud sync proof";
  const renamed = await patchJson(
    sessionApiPath(sessionId),
    { name: renamedName },
    { includeAuth: true },
  );
  if (renamed.status !== 200) {
    throw new Error(`authenticated rename returned ${renamed.status}: ${JSON.stringify(renamed.json)}`);
  }

  const loaded = await readJson(sessionApiPath(sessionId), undefined, { includeAuth: true });
  if (loaded.status !== 200) {
    throw new Error(`authenticated load returned ${loaded.status}: ${JSON.stringify(loaded.json)}`);
  }
  if (loaded.json?.session?.name !== renamedName) {
    throw new Error("authenticated rename did not persist");
  }

  const listedAfterRename = await readJson("/api/sessions", undefined, { includeAuth: true });
  const renamedListEntry = findListedSession(listedAfterRename, sessionId);
  if (renamedListEntry?.name !== renamedName) {
    throw new Error("authenticated list did not reflect renamed session");
  }

  const tvRoute = await readText(`/tv?restore=${encodeURIComponent(sessionId)}`, undefined, { includeAuth: true });
  if (tvRoute.status !== 200) {
    throw new Error(`authenticated TV restore route returned ${tvRoute.status}`);
  }
  if (!/Yentl/i.test(tvRoute.text)) {
    throw new Error("authenticated TV restore route did not render Yentl shell");
  }

  const deleted = await deleteJson(sessionApiPath(sessionId), { includeAuth: true });
  if (deleted.status !== 200) {
    throw new Error(`authenticated delete returned ${deleted.status}: ${JSON.stringify(deleted.json)}`);
  }

  const missing = await readJson(sessionApiPath(sessionId), undefined, { includeAuth: true });
  if (missing.status !== 404) {
    throw new Error(`deleted session should return 404, got ${missing.status}`);
  }

  const listedAfterDelete = await readJson("/api/sessions", undefined, { includeAuth: true });
  if (findListedSession(listedAfterDelete, sessionId)) {
    throw new Error("authenticated list still included deleted session");
  }

  return {
    session_id: sessionId,
    list_after_save_status: listedAfterSave.status,
    load_after_save_status: loadedAfterSave.status,
    save_status: created.status,
    rename_readback_status: loaded.status,
    list_after_rename_status: listedAfterRename.status,
    tv_restore_status: tvRoute.status,
    tv_restore_path: `/tv?restore=${encodeURIComponent(sessionId)}`,
    rename_status: renamed.status,
    delete_status: deleted.status,
    post_delete_load_status: missing.status,
    list_after_delete_status: listedAfterDelete.status,
  };
}

async function proveAuthenticatedTwoProfileBrowserRestore() {
  const saveBody = minimalSaveBody("Cloud sync two-profile proof");
  const created = await postJson("/api/sessions", saveBody, { includeAuth: true });
  if (created.status !== 200) {
    throw new Error(`authenticated browser-proof save returned ${created.status}: ${JSON.stringify(created.json)}`);
  }

  const sessionId = created.json?.session?.id;
  if (typeof sessionId !== "string" || sessionId.length === 0) {
    throw new Error("authenticated browser-proof save did not return a session id");
  }

  try {
    const browserRestore = await proveTwoBrowserProfilesRestore(sessionId, [
      "Cloud sync two-profile proof",
      "The budget vote happened last night.",
      "Source health",
    ]);

    return {
      session_id: sessionId,
      restore_path: `/session?restore=${encodeURIComponent(sessionId)}&view=overview`,
      profiles_checked: browserRestore.profiles.length,
      ...browserRestore,
    };
  } finally {
    await deleteJson(sessionApiPath(sessionId), { includeAuth: true }).catch(() => null);
  }
}

function sessionApiPath(id) {
  return `/api/sessions/${encodeURIComponent(id)}`;
}

function assertSavedSessionEnvelope(value, label) {
  if (!value || typeof value !== "object") {
    throw new Error(`${label} missing saved-session envelope`);
  }
  if (typeof value.id !== "string" || !value.id) {
    throw new Error(`${label} missing id`);
  }
  if (typeof value.name !== "string" || !value.name) {
    throw new Error(`${label} missing name`);
  }
  if (!value.session || typeof value.session !== "object") {
    throw new Error(`${label} missing serialized session body`);
  }
  if (typeof value.session.title !== "string") {
    throw new Error(`${label} serialized session missing title`);
  }
}

function findListedSession(response, sessionId) {
  if (response.status !== 200 || !Array.isArray(response.json?.sessions)) {
    throw new Error(`authenticated list returned ${response.status}: ${JSON.stringify(response.json)}`);
  }
  return response.json.sessions.find((session) => session.id === sessionId) ?? null;
}

function minimalSaveBody(name = "Cloud sync proof session") {
  const transcriptText = "The budget vote happened last night.";
  const sourceText = `${transcriptText}\nThe chair asked for a public release timeline.`;
  return {
    name,
    session: {
      title: name,
      started_at: "2026-06-10T12:00:00.000Z",
      transcript: [
        {
          text: transcriptText,
          start: 0,
          end: 4,
          is_final: true,
          speaker_id: 0,
        },
      ],
      claims: [],
      markers: [],
      speakers: [{ id: 0, label: "Chair" }],
      source: {
        kind: "text_doc",
        filename: `${name}.txt`,
        mime: "text/plain",
        byte_count: sourceText.length,
        initial_text: sourceText,
      },
    },
  };
}

async function runCheck(name, fn) {
  const startedAt = Date.now();
  try {
    const details = await fn();
    return { name, ok: true, elapsed_ms: Date.now() - startedAt, ...details };
  } catch (error) {
    return {
      name,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function proofHeaders(extra, includeAuth = false) {
  return {
    ...(includeAuth && AUTH_HEADER ? { Authorization: AUTH_HEADER } : {}),
    ...extra,
  };
}

async function readText(path, init, options = {}) {
  const res = await fetch(`${APP_ORIGIN}${path}`, {
    ...init,
    headers: proofHeaders(init?.headers, options.includeAuth),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text };
}

async function readJson(path, init, options = {}) {
  const res = await fetch(`${APP_ORIGIN}${path}`, {
    ...init,
    headers: proofHeaders(init?.headers, options.includeAuth),
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function postJson(path, body, options = {}) {
  return readJson(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

async function patchJson(path, body, options = {}) {
  return readJson(
    path,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    options,
  );
}

async function deleteJson(path, options = {}) {
  return readJson(path, { method: "DELETE" }, options);
}

async function proveTwoBrowserProfilesRestore(sessionId, expectedText) {
  const chrome = chromeExecutable();
  const tempRoot = await mkdtemp(join(tmpdir(), "yentl-cloud-browser-proof-"));
  const chromeLogLines = [];

  try {
    const profiles = [];
    for (const label of ["profile-a", "profile-b"]) {
      profiles.push(await proveBrowserProfileRestore({
        chrome,
        profileDir: join(tempRoot, label),
        label,
        sessionId,
        expectedText,
        chromeLogLines,
      }));
    }

    return {
      chrome,
      profiles,
      chrome_log_tail: chromeLogLines.slice(-30),
    };
  } finally {
    await rm(tempRoot, { recursive: true, force: true }).catch(() => null);
  }
}

async function proveBrowserProfileRestore({
  chrome,
  profileDir,
  label,
  sessionId,
  expectedText,
  chromeLogLines,
}) {
  const port = await pickPort();
  const browser = spawnChrome(chrome, port, profileDir, chromeLogLines);
  let client;

  try {
    const target = await waitForTarget(port);
    client = await connectCdp(target.webSocketDebuggerUrl);
    await client.send("Page.enable");
    await client.send("Runtime.enable");
    await client.send("Network.enable");
    await client.send("Log.enable").catch(() => null);
    await client.send("Network.setExtraHTTPHeaders", {
      headers: {
        Authorization: AUTH_HEADER,
      },
    });

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

    const path = `/session?restore=${encodeURIComponent(sessionId)}&view=overview`;
    const url = `${APP_ORIGIN}${path}`;
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

    const audit = await waitForBrowserRestoreAudit(client, expectedText, 18000);
    const failures = browserAuditFailures(audit, expectedText);
    if (runtimeIssues.length > 0) failures.push(`${runtimeIssues.length} console/runtime error(s)`);
    if (failures.length > 0) {
      throw new Error(`${label} restore failed: ${failures.join("; ")}`);
    }

    return {
      label,
      path,
      final_url: audit.url,
      overflow_x: audit.overflowX,
      expected_text: audit.textMatches,
      runtime_issue_count: runtimeIssues.length,
      visible_text_start: audit.visibleTextStart,
    };
  } finally {
    client?.close();
    await stopChrome(browser);
  }
}

async function waitForBrowserRestoreAudit(client, expectedText, timeoutMs) {
  const startedAt = Date.now();
  let latest = null;
  while (Date.now() - startedAt < timeoutMs) {
    latest = await browserRestoreAudit(client, expectedText);
    if (browserAuditFailures(latest, expectedText).length === 0) return latest;
    await sleep(350);
  }
  return latest ?? await browserRestoreAudit(client, expectedText);
}

async function browserRestoreAudit(client, expectedText) {
  const result = await client.send("Runtime.evaluate", {
    expression: `
      (() => {
        const doc = document.documentElement;
        const body = document.body;
        const visibleText = (body?.innerText || "").replace(/\\s+/g, " ").trim();
        const scrollWidth = Math.max(doc?.scrollWidth || 0, body?.scrollWidth || 0);
        const clientWidth = Math.max(doc?.clientWidth || 0, window.innerWidth || 0);
        const expected = ${JSON.stringify(expectedText)};
        return {
          url: location.href,
          visibleTextStart: visibleText.slice(0, 500),
          overflowX: Math.max(0, scrollWidth - clientWidth),
          textMatches: Object.fromEntries(expected.map((text) => [text, visibleText.includes(text)])),
        };
      })()
    `,
    returnByValue: true,
  }, { timeoutMs: 10000 });
  return result.result?.value ?? {};
}

function browserAuditFailures(audit, expectedText) {
  const failures = [];
  if (!audit) return ["missing browser audit"];
  if (audit.overflowX > 1) failures.push(`horizontal overflow ${audit.overflowX}px`);
  for (const expected of expectedText) {
    if (!audit.textMatches?.[expected]) failures.push(`missing expected text: ${expected}`);
  }
  return failures;
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

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
