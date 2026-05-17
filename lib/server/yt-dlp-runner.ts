/**
 * Thin adapter around node:child_process.spawn that can be mocked in tests.
 * The youtube-captions module imports from here so tests can vi.mock() this
 * module without fighting ESM namespace restrictions on node: built-ins.
 *
 * Also re-exports getYtDlpBinaryPath and provides a runYtDlp() convenience
 * helper that spawns yt-dlp at the resolved binary path.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { getYtDlpBinaryPath } from "./yt-dlp-binary";

export { spawn, mkdtemp, readFile, rm, tmpdir, getYtDlpBinaryPath };

/**
 * Spawns yt-dlp at the resolved binary path.
 * Equivalent to spawn(getYtDlpBinaryPath(), args) but reads the path
 * once per call so env overrides are respected across module resets.
 */
export function runYtDlp(args: string[]): ReturnType<typeof spawn> {
  return spawn(getYtDlpBinaryPath(), args);
}
