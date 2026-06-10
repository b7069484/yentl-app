#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

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
    checks.push(await runCheck("unconfigured-save-response", () =>
      proveUnconfiguredSaveResponse(availability),
    ));
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
  } else if (availability.mode === "authenticated") {
    checks.push(await runCheck("authenticated-list", () => proveAuthenticatedList(availability)));
    checks.push(await runCheck("authenticated-save-rename-delete", () =>
      proveAuthenticatedCrud(availability),
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
      "Set YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER to run authenticated save/rename/delete proof.",
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

async function proveUnconfiguredSaveResponse(availability) {
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

  const renamed = await patchJson(
    `/api/sessions/${sessionId}`,
    { name: "Renamed cloud sync proof" },
    { includeAuth: true },
  );
  if (renamed.status !== 200) {
    throw new Error(`authenticated rename returned ${renamed.status}: ${JSON.stringify(renamed.json)}`);
  }

  const loaded = await readJson(`/api/sessions/${sessionId}`, undefined, { includeAuth: true });
  if (loaded.status !== 200) {
    throw new Error(`authenticated load returned ${loaded.status}: ${JSON.stringify(loaded.json)}`);
  }
  if (loaded.json?.session?.name !== "Renamed cloud sync proof") {
    throw new Error("authenticated rename did not persist");
  }

  const deleted = await deleteJson(`/api/sessions/${sessionId}`, { includeAuth: true });
  if (deleted.status !== 200) {
    throw new Error(`authenticated delete returned ${deleted.status}: ${JSON.stringify(deleted.json)}`);
  }

  const missing = await readJson(`/api/sessions/${sessionId}`, undefined, { includeAuth: true });
  if (missing.status !== 404) {
    throw new Error(`deleted session should return 404, got ${missing.status}`);
  }

  return {
    session_id: sessionId,
    save_status: created.status,
    rename_status: renamed.status,
    delete_status: deleted.status,
  };
}

function minimalSaveBody(name = "Cloud sync proof session") {
  return {
    name,
    session: {
      title: "Cloud sync proof session",
      started_at: "2026-06-10T12:00:00.000Z",
      transcript: [
        {
          text: "The budget vote happened last night.",
          start: 0,
          end: 4,
          is_final: true,
          speaker_id: 0,
        },
      ],
      claims: [],
      markers: [],
      speakers: [{ id: 0, label: "Chair" }],
      source: { kind: "mic" },
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

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});