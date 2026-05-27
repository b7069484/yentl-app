import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MARKER_ASSETS } from "../../lib/visual-evidence/marker-assets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const logDir = path.join(root, "docs/superpowers/visual-evidence/higgsfield-runs");

function arg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const ids = arg("--ids")?.split(",").map((id) => id.trim()).filter(Boolean);
const limit = Number(arg("--limit") ?? (ids ? ids.length : 3));
const wait = process.argv.includes("--wait");
const dryRun = process.argv.includes("--dry-run");

const selected = MARKER_ASSETS
  .filter((asset) => !ids || ids.includes(asset.canonical_id))
  .slice(0, Number.isFinite(limit) && limit > 0 ? limit : 3);

if (selected.length === 0) {
  console.error("No marker assets matched the requested ids.");
  process.exit(1);
}

mkdirSync(logDir, { recursive: true });

const runLog: Array<{
  canonical_id: string;
  display: string;
  command: string[];
  status: "dry_run" | "started" | "failed";
  stdout?: string;
  stderr?: string;
}> = [];

for (const asset of selected) {
  const command = [
    "generate",
    "create",
    "gpt_image_2",
    "--prompt",
    asset.prompt,
    "--aspect_ratio",
    "1:1",
    "--resolution",
    "2k",
    ...(wait ? ["--wait"] : []),
  ];

  if (dryRun) {
    runLog.push({ canonical_id: asset.canonical_id, display: asset.display, command: ["higgsfield", ...command], status: "dry_run" });
    continue;
  }

  const result = spawnSync("higgsfield", command, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  runLog.push({
    canonical_id: asset.canonical_id,
    display: asset.display,
    command: ["higgsfield", ...command],
    status: result.status === 0 ? "started" : "failed",
    stdout: result.stdout?.trim(),
    stderr: result.stderr?.trim(),
  });
  if (result.status !== 0) break;
}

const logPath = path.join(logDir, `${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
writeFileSync(logPath, `${JSON.stringify({ wait, dry_run: dryRun, assets: runLog }, null, 2)}\n`);
console.log(`Wrote Higgsfield marker run log to ${path.relative(root, logPath)}`);
