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
const SAVED_SESSION_PROOF_NAME = "Proof saved validation session";
const RENAMED_SESSION_PROOF_NAME = "Proof renamed validation session";
const TEXT_LIBRARY_PROOF_NAME = "Proof text research session";
const AUDIO_LIBRARY_PROOF_NAME = "Proof long audio session";

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

const openSaveSessionScript = `
new Promise((resolve) => {
  const saveBtn = [...document.querySelectorAll("button")].find((button) => {
    const text = button.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    return text === "Save" && button.querySelector("svg");
  });
  if (saveBtn) saveBtn.click();
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

const saveCurrentValidationSessionScript = `
new Promise(async (resolve) => {
  const waitFor = (predicate, timeoutMs = 12000) =>
    new Promise((waitResolve) => {
      const start = Date.now();
      const tick = () => {
        const value = predicate();
        if (value || Date.now() - start > timeoutMs) {
          waitResolve(value || null);
          return;
        }
        setTimeout(tick, 150);
      };
      tick();
    });

  const clearResult = await new Promise((clearResolve) => {
    const request = indexedDB.deleteDatabase("yentl");
    request.onsuccess = () => clearResolve("cleared");
    request.onerror = () => clearResolve("clear-error");
    request.onblocked = () => clearResolve("blocked");
  });

  const toolbarSave = [...document.querySelectorAll("button")].find((button) => {
    const text = button.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    return text === "Save" && button.querySelector("svg");
  });
  if (!toolbarSave) {
    resolve({ ok: false, clearResult, error: "Toolbar Save button not found." });
    return;
  }
  toolbarSave.click();

  const dialog = await waitFor(() => document.querySelector('[role="dialog"]'));
  if (!dialog) {
    resolve({ ok: false, clearResult, error: "Save dialog did not open." });
    return;
  }

  const input = dialog.querySelector('input[aria-label="Session name"]');
  if (!input) {
    resolve({ ok: false, clearResult, error: "Session name input not found." });
    return;
  }

  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setter?.call(input, ${JSON.stringify(SAVED_SESSION_PROOF_NAME)});
  input.dispatchEvent(new Event("input", { bubbles: true }));

  const dialogSave = [...dialog.querySelectorAll("button")].find((button) => {
    const text = button.textContent?.replace(/\\s+/g, " ").trim() ?? "";
    return text === "Save";
  });
  if (!dialogSave) {
    resolve({ ok: false, clearResult, error: "Dialog Save button not found." });
    return;
  }
  dialogSave.click();

  const saved = await waitFor(() => {
    const text = document.body?.innerText || "";
    return text.includes("Saved locally") || text.includes("Saved ✓");
  }, 15000);

  await new Promise((done) => setTimeout(done, 1500));

  resolve({
    ok: Boolean(saved),
    clearResult,
    dialogOpened: true,
    nameApplied: ${JSON.stringify(SAVED_SESSION_PROOF_NAME)},
    savedMessageObserved: Boolean(saved),
    text: (document.body?.innerText || "").replace(/\\s+/g, " ").slice(0, 900),
  });
})
`;

const seedAdditionalLibrarySessionsScript = `
new Promise((resolve) => {
  const startedAt = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
  const textEndedAt = new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString();
  const audioEndedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const makeRecord = ({
    id,
    name,
    sourceKind,
    savedOffsetMs,
    claimCount,
    markerCount,
    speakerCount,
    durationSec,
    started,
    ended,
    source,
  }) => ({
    id,
    name,
    source_kind: sourceKind,
    saved_at: new Date(Date.now() - savedOffsetMs).toISOString(),
    started_at: started,
    ended_at: ended,
    claim_count: claimCount,
    marker_count: markerCount,
    speaker_count: speakerCount,
    source_count: 0,
    source_linked_count: 0,
    high_source_count: 0,
    duration_sec: durationSec,
    session: {
      title: name,
      started_at: started,
      ended_at: ended,
      transcript: [],
      claims: [],
      markers: [],
      speakers: [],
      source,
    },
  });

  const request = indexedDB.open("yentl", 1);
  request.onerror = () => resolve({ ok: false, error: "Could not open Yentl IndexedDB." });
  request.onsuccess = () => {
    const db = request.result;
    const tx = db.transaction("sessions", "readwrite");
    const store = tx.objectStore("sessions");
    store.put(makeRecord({
      id: "proof-text-research-session",
      name: ${JSON.stringify(TEXT_LIBRARY_PROOF_NAME)},
      sourceKind: "text_doc",
      savedOffsetMs: 90_000,
      claimCount: 3,
      markerCount: 2,
      speakerCount: 1,
      durationSec: 1800,
      started: startedAt,
      ended: textEndedAt,
      source: { kind: "text_doc", title: "Research memo", text: "A seeded text document proof session." },
    }));
    store.put(makeRecord({
      id: "proof-long-audio-session",
      name: ${JSON.stringify(AUDIO_LIBRARY_PROOF_NAME)},
      sourceKind: "audio_file",
      savedOffsetMs: 180_000,
      claimCount: 8,
      markerCount: 4,
      speakerCount: 2,
      durationSec: 7200,
      started: startedAt,
      ended: audioEndedAt,
      source: {
        kind: "audio_file",
        filename: "proof-long-audio.wav",
        mime: "audio/wav",
        duration_sec: 7200,
        blob_url: "",
      },
    }));
    tx.oncomplete = () => {
      db.close();
      resolve({
        ok: true,
        seeded: [${JSON.stringify(TEXT_LIBRARY_PROOF_NAME)}, ${JSON.stringify(AUDIO_LIBRARY_PROOF_NAME)}],
      });
    };
    tx.onerror = () => {
      const message = tx.error?.message || "Could not seed additional proof sessions.";
      db.close();
      resolve({ ok: false, error: message });
    };
  };
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
    path: "/session?demo=validation&sample=cable_008&view=claims&status=confirmed",
    width: 1280,
    waitMs: 2500,
    expectedText: ["Confirmed claims", "77,000,000"],
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
    path: "/session/detail/marker/cable_008-marker-4?demo=validation&sample=cable_008",
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
    expectedText: ["Sources & context", "77,000,000", "SOURCE DOSSIER"],
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
    slug: "save-session-dialog",
    path: "/session?demo=validation&sample=cable_008&view=overview",
    width: 1280,
    waitMs: 2000,
    afterLoadScript: openSaveSessionScript,
    expectedText: ["Save session snapshot", "This snapshot includes", "account sync"],
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
    path: "/session?demo=validation&sample=cable_008&view=claims&status=confirmed",
    width: 390,
    mobile: true,
    waitMs: 2500,
    expectedText: ["Confirmed claims", "77,000,000"],
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
    checks.push(await proveSavedSessionRoundTrip(client, runtimeIssues.length, runtimeIssues));

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

  await setViewport(client, width, mobile);
  await navigateTo(client, url);
  await sleep(Number(route.waitMs ?? process.env.YENTL_SESSION_UX_PROOF_WAIT_MS ?? 900));

  if (route.path.includes("demo=validation")) {
    await waitForValidationHydrated(client);
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

async function proveSavedSessionRoundTrip(client, issueStart, runtimeIssues) {
  const width = 1280;
  const path = "/session?demo=validation&sample=cable_008&view=overview";
  const url = new URL(path, APP_ORIGIN).toString();
  const failures = [];

  await setViewport(client, width, false);
  await navigateTo(client, url);
  await sleep(2000);
  await waitForValidationHydrated(client);

  const saveResult = await evaluateValue(client, saveCurrentValidationSessionScript, 22000);
  if (!saveResult?.ok) {
    failures.push(`save flow failed: ${saveResult?.error ?? "unknown error"}`);
  }

  const seedResult = await evaluateValue(client, seedAdditionalLibrarySessionsScript, 12000);
  if (!seedResult?.ok) {
    failures.push(`library seed failed: ${seedResult?.error ?? "unknown error"}`);
  }

  await navigateTo(client, new URL("/sessions", APP_ORIGIN).toString());
  await waitForPageText(client, [
    SAVED_SESSION_PROOF_NAME,
    TEXT_LIBRARY_PROOF_NAME,
    AUDIO_LIBRARY_PROOF_NAME,
    "Showing 3 of 3 saved sessions",
    "1 claims",
    "2/10 linked sources",
  ], 12000);
  const libraryAudit = await auditCurrentPage(client, [
    SAVED_SESSION_PROOF_NAME,
    TEXT_LIBRARY_PROOF_NAME,
    AUDIO_LIBRARY_PROOF_NAME,
    "Saved sessions",
    "Showing 3 of 3 saved sessions",
    "2/10 linked sources",
  ]);
  failures.push(...auditFailures(libraryAudit, [
    SAVED_SESSION_PROOF_NAME,
    TEXT_LIBRARY_PROOF_NAME,
    AUDIO_LIBRARY_PROOF_NAME,
    "Saved sessions",
    "Showing 3 of 3 saved sessions",
    "2/10 linked sources",
  ]).map((failure) => `library ${failure}`));

  const libraryControlsResult = await exerciseSavedSessionLibraryControls(client);
  if (!libraryControlsResult?.ok) {
    failures.push(`library controls failed: ${libraryControlsResult?.error ?? "unknown error"}`);
  }

  const managementResult = await exerciseSavedSessionRenameAndExport(client);
  if (!managementResult?.ok) {
    failures.push(`library management failed: ${managementResult?.error ?? "unknown error"}`);
  }

  const roomHref = await evaluateValue(
    client,
    `
      (() => {
        const link = [...document.querySelectorAll("a")]
          .find((candidate) => candidate.getAttribute("aria-label")?.startsWith("Open room display: ${RENAMED_SESSION_PROOF_NAME}"));
        return link?.href ?? null;
      })()
    `,
  );
  let tvReturnResult = null;
  if (typeof roomHref !== "string") {
    failures.push("library room link missing for saved session");
  } else {
    await navigateTo(client, roomHref);
    await waitForPageText(client, ["ROOM MODE", "Yentl's Read", "77,000,000"], 12000);
    const tvAudit = await auditCurrentPage(client, ["ROOM MODE", "Yentl's Read", "77,000,000"]);
    failures.push(...auditFailures(tvAudit, ["ROOM MODE", "Yentl's Read", "77,000,000"]).map((failure) => `tv ${failure}`));

    const restoreId = new URL(roomHref).searchParams.get("restore");
    const expectedReturnPath = restoreId
      ? `/session?restore=${encodeURIComponent(restoreId)}&view=overview`
      : null;
    tvReturnResult = await evaluateValue(
      client,
      `
        (() => {
          const link = [...document.querySelectorAll("a[href]")]
            .find((candidate) => (candidate.textContent || "").replace(/\\s+/g, " ").trim() === "Session");
          return {
            ok: Boolean(link),
            href: link?.href ?? null,
            path: link ? new URL(link.href).pathname + new URL(link.href).search : null,
          };
        })()
      `,
    );
    if (!tvReturnResult?.ok) {
      failures.push("tv session return link missing");
    } else if (expectedReturnPath && tvReturnResult.path !== expectedReturnPath) {
      failures.push(`tv session return link mismatch: ${tvReturnResult.path}`);
    } else {
      await navigateTo(client, tvReturnResult.href);
      await waitForPageText(client, ["YENTL OPINION", "77,000,000", "Claims · 1"], 12000);
      const tvWorkspaceAudit = await auditCurrentPage(client, ["YENTL OPINION", "77,000,000", "Claims · 1"]);
      failures.push(
        ...auditFailures(tvWorkspaceAudit, ["YENTL OPINION", "77,000,000", "Claims · 1"]).map(
          (failure) => `tv workspace ${failure}`,
        ),
      );
    }
  }

  await navigateTo(client, new URL("/sessions", APP_ORIGIN).toString());
  await waitForPageText(client, [RENAMED_SESSION_PROOF_NAME], 12000);
  const resumeResult = await evaluateValue(
    client,
    `
      new Promise((resolve) => {
        const button = [...document.querySelectorAll("button")]
          .find((candidate) => candidate.getAttribute("aria-label")?.startsWith("Resume session: ${RENAMED_SESSION_PROOF_NAME}"));
        if (!button) {
          resolve({ ok: false, error: "Resume button not found." });
          return;
        }
        button.click();
        setTimeout(() => resolve({ ok: true }), 250);
      })
    `,
  );
  let finalAudit = await auditCurrentPage(client, ["YENTL OPINION", "77,000,000"]);
  if (!resumeResult?.ok) {
    failures.push(`workspace resume failed: ${resumeResult?.error ?? "unknown error"}`);
  } else {
    await waitForPageText(client, ["YENTL OPINION", "77,000,000", "Claims · 1"], 12000);
    const restoredAudit = await auditCurrentPage(client, ["YENTL OPINION", "77,000,000", "Claims · 1"]);
    failures.push(...auditFailures(restoredAudit, ["YENTL OPINION", "77,000,000", "Claims · 1"]).map((failure) => `workspace ${failure}`));
    finalAudit = await auditCurrentPage(client, ["YENTL OPINION", "77,000,000"]);
  }

  if (finalAudit.overflowX > 1) failures.push(`horizontal overflow ${finalAudit.overflowX}px`);

  await navigateTo(client, new URL("/sessions", APP_ORIGIN).toString());
  await waitForPageText(client, [RENAMED_SESSION_PROOF_NAME], 12000);
  const deleteResult = await exerciseSavedSessionDelete(client);
  if (!deleteResult?.ok) {
    failures.push(`library delete failed: ${deleteResult?.error ?? "unknown error"}`);
  }
  const clearResult = await exerciseSavedSessionClearAll(client);
  if (!clearResult?.ok) {
    failures.push(`library clear-all failed: ${clearResult?.error ?? "unknown error"}`);
  }

  const routeIssues = runtimeIssues.slice(issueStart).filter((issue) => !isIgnorableRuntimeIssue(issue));
  if (routeIssues.length > 0) failures.push(`${routeIssues.length} console/runtime error(s)`);

  return {
    slug: "save-library-restore-roundtrip",
    path: "workflow:/session -> /sessions -> /tv?restore -> /session -> /sessions delete",
    url,
    width,
    failures,
    runtimeIssues: routeIssues,
    saveResult,
    seedResult,
    libraryControlsResult,
    managementResult,
    tvReturnResult,
    deleteResult,
    clearResult,
    libraryTextStart: libraryAudit.visibleTextStart,
    finalTextStart: finalAudit.visibleTextStart,
    ...finalAudit,
  };
}

async function exerciseSavedSessionLibraryControls(client) {
  return evaluateValue(
    client,
    `
      new Promise(async (resolve) => {
        const textName = ${JSON.stringify(TEXT_LIBRARY_PROOF_NAME)};
        const audioName = ${JSON.stringify(AUDIO_LIBRARY_PROOF_NAME)};
        const savedName = ${JSON.stringify(SAVED_SESSION_PROOF_NAME)};

        const waitFor = (predicate, timeoutMs = 12000) =>
          new Promise((waitResolve) => {
            const start = Date.now();
            const tick = () => {
              const value = predicate();
              if (value || Date.now() - start > timeoutMs) {
                waitResolve(value || null);
                return;
              }
              setTimeout(tick, 150);
            };
            tick();
          });

        const bodyText = () => document.body?.innerText || "";
        const setControlValue = (selector, value) => {
          const control = document.querySelector(selector);
          if (!control) return false;
          const proto =
            control instanceof HTMLSelectElement
              ? HTMLSelectElement.prototype
              : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          setter?.call(control, value);
          control.dispatchEvent(new Event("input", { bubbles: true }));
          control.dispatchEvent(new Event("change", { bubbles: true }));
          return true;
        };
        const resetView = async () => {
          const button = [...document.querySelectorAll("button")]
            .find((candidate) => candidate.textContent?.replace(/\\s+/g, " ").trim() === "Reset library view");
          if (button) button.click();
          return waitFor(() => {
            const text = bodyText();
            return text.includes(savedName) &&
              text.includes(textName) &&
              text.includes(audioName) &&
              text.includes("Showing 3 of 3 saved sessions");
          });
        };

        if (!setControlValue("#session-search", "research")) {
          resolve({ ok: false, error: "Search input not found." });
          return;
        }
        const searched = await waitFor(() => {
          const text = bodyText();
          return text.includes(textName) &&
            !text.includes(savedName) &&
            !text.includes(audioName) &&
            text.includes("Showing 1 of 3 saved sessions");
        });
        if (!searched) {
          resolve({ ok: false, error: "Search did not narrow to the text research session." });
          return;
        }

        const resetAfterSearch = await resetView();
        if (!resetAfterSearch) {
          resolve({ ok: false, error: "Reset after search did not restore all sessions." });
          return;
        }

        if (!setControlValue("#source-filter", "audio_file")) {
          resolve({ ok: false, error: "Source filter not found." });
          return;
        }
        const filtered = await waitFor(() => {
          const text = bodyText();
          return text.includes(audioName) &&
            !text.includes(savedName) &&
            !text.includes(textName) &&
            text.includes("Showing 1 of 3 saved sessions");
        });
        if (!filtered) {
          resolve({ ok: false, error: "Audio source filter did not narrow to the audio session." });
          return;
        }

        const resetAfterFilter = await resetView();
        if (!resetAfterFilter) {
          resolve({ ok: false, error: "Reset after source filter did not restore all sessions." });
          return;
        }

        if (!setControlValue("#sort-sessions", "claims")) {
          resolve({ ok: false, error: "Sort select not found." });
          return;
        }
        const sorted = await waitFor(() => {
          const text = bodyText();
          const audioIndex = text.indexOf(audioName);
          const textIndex = text.indexOf(textName);
          const savedIndex = text.indexOf(savedName);
          return audioIndex > -1 &&
            textIndex > -1 &&
            savedIndex > -1 &&
            audioIndex < textIndex &&
            textIndex < savedIndex;
        });
        if (!sorted) {
          resolve({ ok: false, error: "Most-claims sort did not produce expected row order." });
          return;
        }

        const resetAfterSort = await resetView();
        if (!resetAfterSort) {
          resolve({ ok: false, error: "Reset after sort did not restore all sessions." });
          return;
        }

        resolve({
          ok: true,
          searchedFor: "research",
          filteredSource: "audio_file",
          sortedBy: "claims",
          restoredFullView: true,
        });
      })
    `,
    24000,
  );
}

async function exerciseSavedSessionRenameAndExport(client) {
  return evaluateValue(
    client,
    `
      new Promise(async (resolve) => {
        const waitFor = (predicate, timeoutMs = 12000) =>
          new Promise((waitResolve) => {
            const start = Date.now();
            const tick = () => {
              const value = predicate();
              if (value || Date.now() - start > timeoutMs) {
                waitResolve(value || null);
                return;
              }
              setTimeout(tick, 150);
            };
            tick();
          });

        const clickByLabel = (labelStart) => {
          const element = [...document.querySelectorAll("button,a")]
            .find((candidate) => candidate.getAttribute("aria-label")?.startsWith(labelStart));
          if (!element) return false;
          element.click();
          return true;
        };

        const setInputValue = (input, value) => {
          const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
          setter?.call(input, value);
          input.dispatchEvent(new Event("input", { bubbles: true }));
        };

        if (!clickByLabel("Rename session: ${SAVED_SESSION_PROOF_NAME}")) {
          resolve({ ok: false, error: "Rename button not found." });
          return;
        }
        const renameInput = await waitFor(() => document.querySelector('input[aria-label="Rename session"]'));
        if (!renameInput) {
          resolve({ ok: false, error: "Rename input did not appear." });
          return;
        }
        setInputValue(renameInput, ${JSON.stringify(RENAMED_SESSION_PROOF_NAME)});
        renameInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));

        const renamed = await waitFor(() =>
          (document.body?.innerText || "").includes(${JSON.stringify(RENAMED_SESSION_PROOF_NAME)})
        );
        if (!renamed) {
          resolve({ ok: false, error: "Renamed session did not appear." });
          return;
        }

        const downloadEvents = [];
        const originalCreateObjectURL = URL.createObjectURL;
        const originalRevokeObjectURL = URL.revokeObjectURL;
        const restoreUrlHooks = () => {
          URL.createObjectURL = originalCreateObjectURL;
          URL.revokeObjectURL = originalRevokeObjectURL;
        };
        URL.createObjectURL = (blob) => {
          downloadEvents.push({ type: blob?.type ?? null, size: blob?.size ?? null });
          return originalCreateObjectURL.call(URL, blob);
        };
        URL.revokeObjectURL = (url) => originalRevokeObjectURL.call(URL, url);

        if (!clickByLabel("Export session: ${RENAMED_SESSION_PROOF_NAME}")) {
          restoreUrlHooks();
          resolve({ ok: false, error: "Export button not found." });
          return;
        }
        await waitFor(() => document.querySelector('[aria-label="Export JSON: ${RENAMED_SESSION_PROOF_NAME}"]'));
        if (!clickByLabel("Export JSON: ${RENAMED_SESSION_PROOF_NAME}")) {
          restoreUrlHooks();
          resolve({ ok: false, error: "Export JSON button not found." });
          return;
        }
        await new Promise((done) => setTimeout(done, 500));
        restoreUrlHooks();

        if (downloadEvents.length < 1 || downloadEvents[0].type !== "application/json") {
          resolve({ ok: false, error: "JSON export did not create an application/json Blob.", downloadEvents });
          return;
        }

        resolve({
          ok: true,
          renamedTo: ${JSON.stringify(RENAMED_SESSION_PROOF_NAME)},
          exportEvents: downloadEvents,
        });
      })
    `,
    18000,
  );
}

async function exerciseSavedSessionDelete(client) {
  return evaluateValue(
    client,
    `
      new Promise(async (resolve) => {
        const waitFor = (predicate, timeoutMs = 12000) =>
          new Promise((waitResolve) => {
            const start = Date.now();
            const tick = () => {
              const value = predicate();
              if (value || Date.now() - start > timeoutMs) {
                waitResolve(value || null);
                return;
              }
              setTimeout(tick, 150);
            };
            tick();
          });

        const clickByLabel = (labelStart) => {
          const element = [...document.querySelectorAll("button,a")]
            .find((candidate) => candidate.getAttribute("aria-label")?.startsWith(labelStart));
          if (!element) return false;
          element.click();
          return true;
        };

        if (!clickByLabel("Delete session: ${RENAMED_SESSION_PROOF_NAME}")) {
          resolve({ ok: false, error: "Delete button not found." });
          return;
        }
        await waitFor(() => document.querySelector('[aria-label="Confirm delete session: ${RENAMED_SESSION_PROOF_NAME}"]'));
        if (!clickByLabel("Confirm delete session: ${RENAMED_SESSION_PROOF_NAME}")) {
          resolve({ ok: false, error: "Confirm delete button not found." });
          return;
        }

        const deleted = await waitFor(() => {
          const text = document.body?.innerText || "";
          return !text.includes(${JSON.stringify(RENAMED_SESSION_PROOF_NAME)}) &&
            text.includes(${JSON.stringify(TEXT_LIBRARY_PROOF_NAME)}) &&
            text.includes(${JSON.stringify(AUDIO_LIBRARY_PROOF_NAME)}) &&
            text.includes("Showing 2 of 2 saved sessions");
        });
        if (!deleted) {
          resolve({ ok: false, error: "Deleted session did not leave the remaining seeded sessions visible." });
          return;
        }

        resolve({
          ok: true,
          deleteConfirmed: true,
          remainingVisible: [${JSON.stringify(TEXT_LIBRARY_PROOF_NAME)}, ${JSON.stringify(AUDIO_LIBRARY_PROOF_NAME)}],
        });
      })
    `,
    22000,
  );
}

async function exerciseSavedSessionClearAll(client) {
  return evaluateValue(
    client,
    `
      new Promise(async (resolve) => {
        const waitFor = (predicate, timeoutMs = 12000) =>
          new Promise((waitResolve) => {
            const start = Date.now();
            const tick = () => {
              const value = predicate();
              if (value || Date.now() - start > timeoutMs) {
                waitResolve(value || null);
                return;
              }
              setTimeout(tick, 150);
            };
            tick();
          });

        const clickByText = (text) => {
          const element = [...document.querySelectorAll("button")]
            .find((candidate) => candidate.textContent?.replace(/\\s+/g, " ").trim() === text);
          if (!element) return false;
          element.click();
          return true;
        };

        if (!clickByText("Clear local saves")) {
          resolve({ ok: false, error: "Clear local saves button not found." });
          return;
        }
        await waitFor(() => [...document.querySelectorAll("button")]
          .some((candidate) => candidate.textContent?.replace(/\\s+/g, " ").trim() === "Clear all local saves"));
        if (!clickByText("Clear all local saves")) {
          resolve({ ok: false, error: "Clear all local saves confirmation not found." });
          return;
        }

        const cleared = await waitFor(() => {
          const text = document.body?.innerText || "";
          return text.includes("No saved sessions yet.") &&
            !text.includes(${JSON.stringify(TEXT_LIBRARY_PROOF_NAME)}) &&
            !text.includes(${JSON.stringify(AUDIO_LIBRARY_PROOF_NAME)});
        });
        if (!cleared) {
          resolve({ ok: false, error: "Clear-all did not leave the empty local library state." });
          return;
        }

        resolve({
          ok: true,
          clearConfirmed: true,
          emptyStateVisible: true,
        });
      })
    `,
    22000,
  );
}

async function setViewport(client, width, mobile) {
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

async function waitForValidationHydrated(client) {
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

async function waitForPageText(client, expectedText, timeoutMs = 10000) {
  const startedAt = Date.now();
  let last = "";
  while (Date.now() - startedAt < timeoutMs) {
    const audit = await auditCurrentPage(client, expectedText);
    last = audit.visibleTextStart ?? "";
    if (expectedText.every((text) => audit.textMatches?.[text])) return audit;
    await sleep(250);
  }
  return { ok: false, visibleTextStart: last };
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
