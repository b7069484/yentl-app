/**
 * Thin adapter around node:child_process.spawn that can be mocked in tests.
 * The youtube-captions module imports from here so tests can vi.mock() this
 * module without fighting ESM namespace restrictions on node: built-ins.
 *
 * Also re-exports getYtDlpBinaryPath so callers can do
 *   spawn(getYtDlpBinaryPath(), args)
 * through a single mockable boundary.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { getYtDlpBinaryPath } from "./yt-dlp-binary";

export { spawn, mkdtemp, readFile, rm, tmpdir, getYtDlpBinaryPath };
