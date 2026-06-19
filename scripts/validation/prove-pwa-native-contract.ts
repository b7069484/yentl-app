import { existsSync, readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import manifest from "@/app/manifest";
import {
  MEDIA_LAUNCH_EXTENSIONS,
  TEXT_LAUNCH_EXTENSIONS,
  YENTL_FILE_HANDLERS,
  sourceForLaunchFile,
} from "@/lib/launch-files";

const ROOT = process.cwd();
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/pwa-native-contract-proof.json");

type CheckResult = {
  name: string;
  ok: boolean;
  elapsed_ms: number;
  error?: string;
  [key: string]: unknown;
};

async function main() {
  const checks: CheckResult[] = [];
  checks.push(await runCheck("manifest-install-contract", proveManifestInstallContract));
  checks.push(await runCheck("share-target-contract", proveShareTargetContract));
  checks.push(await runCheck("file-handler-contract", proveFileHandlerContract));
  checks.push(await runCheck("launch-file-routing", proveLaunchFileRouting));
  checks.push(await runCheck("asset-contract", proveAssetContract));
  checks.push(await runCheck("mobile-native-shell-copy", proveMobileNativeShellCopy));

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    native_shell_status: "not_shipped_v1_pwa_first",
    report_path: "docs/superpowers/validation/pwa-native-contract-proof.json",
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`PWA/native contract proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function runCheck(name: string, fn: () => Promise<Record<string, unknown>>): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    const details = await fn();
    return {
      name,
      ok: true,
      elapsed_ms: Date.now() - startedAt,
      ...details,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      elapsed_ms: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function proveManifestInstallContract() {
  const data = manifest();

  assert(data.id === "/", `manifest id should be /, got ${String(data.id)}`);
  assert(data.start_url === "/mobile", `manifest start_url should be /mobile, got ${String(data.start_url)}`);
  assert(data.scope === "/", `manifest scope should be /, got ${String(data.scope)}`);
  assert(data.display === "standalone", `manifest display should be standalone, got ${String(data.display)}`);
  assert(
    Array.isArray(data.display_override) && data.display_override.includes("standalone"),
    "manifest display_override must include standalone",
  );
  assert(
    Array.isArray(data.display_override) && data.display_override.includes("minimal-ui"),
    "manifest display_override must include minimal-ui fallback",
  );
  assert(data.orientation === "any", `manifest orientation should be any, got ${String(data.orientation)}`);
  assert(data.launch_handler?.client_mode?.includes("focus-existing"), "launch_handler must focus existing clients");
  assert(data.launch_handler?.client_mode?.includes("navigate-new"), "launch_handler must allow navigate-new");

  return {
    id: data.id,
    start_url: data.start_url,
    display: data.display,
    display_override: data.display_override,
    launch_handler: data.launch_handler,
  };
}

async function proveShareTargetContract() {
  const data = manifest();
  const share = data.share_target;

  assert(Boolean(share), "manifest share_target missing");
  assert(share?.action === "/session", `share_target.action should be /session, got ${String(share?.action)}`);
  assert(share?.method === "GET", `share_target.method should be GET, got ${String(share?.method)}`);
  assert(
    share?.enctype === "application/x-www-form-urlencoded",
    `share_target.enctype should be application/x-www-form-urlencoded, got ${String(share?.enctype)}`,
  );
  assert(share?.params?.title === "title", "share_target title param missing");
  assert(share?.params?.text === "text", "share_target text param missing");
  assert(share?.params?.url === "url", "share_target url param missing");

  return {
    action: share?.action,
    method: share?.method,
    params: share?.params,
  };
}

async function proveFileHandlerContract() {
  const data = manifest();
  const handlers = data.file_handlers ?? [];
  assert(handlers.length === 1, `expected one file handler, got ${handlers.length}`);
  assert(JSON.stringify(handlers) === JSON.stringify(YENTL_FILE_HANDLERS), "manifest file_handlers drifted from launch-files contract");

  const accept = handlers[0]?.accept ?? {};
  const expectedMimes = [
    "text/plain",
    "text/markdown",
    "text/vtt",
    "application/x-subrip",
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "audio/mpeg",
    "audio/wav",
    "audio/x-m4a",
    "audio/ogg",
    "audio/webm",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ];
  const requiredVideoTypes = ["video/mp4", "video/quicktime", "video/webm"];

  for (const mime of expectedMimes) {
    assert(Array.isArray(accept[mime]), `file handler missing ${mime}`);
  }
  for (const mime of requiredVideoTypes) {
    assert(Array.isArray(accept[mime]), `file handler missing launch-ready video MIME ${mime}`);
  }
  for (const ext of [...TEXT_LAUNCH_EXTENSIONS, ...MEDIA_LAUNCH_EXTENSIONS]) {
    assert(
      Object.values(accept).some((extensions) => extensions.includes(ext)),
      `file handler missing extension ${ext}`,
    );
  }

  return {
    action: handlers[0]?.action,
    mime_count: Object.keys(accept).length,
    text_extensions: TEXT_LAUNCH_EXTENSIONS,
    media_extensions: MEDIA_LAUNCH_EXTENSIONS,
    required_video_types: requiredVideoTypes,
  };
}

async function proveLaunchFileRouting() {
  const cases = [
    { name: "transcript.txt", type: "text/plain", expectedKind: "text_doc" },
    { name: "brief.pdf", type: "", expectedKind: "text_doc" },
    { name: "captions.vtt", type: "text/vtt", expectedKind: "text_doc" },
    { name: "clip.mp4", type: "video/mp4", expectedKind: "audio_file" },
    { name: "phone-recording.mov", type: "video/quicktime", expectedKind: "audio_file" },
    { name: "screen-recording.webm", type: "video/webm", expectedKind: "audio_file" },
    { name: "screen-recording.webm", type: "", expectedKind: "audio_file" },
    { name: "room.wav", type: "", expectedKind: "audio_file" },
    { name: "archive.zip", type: "application/zip", expectedKind: null },
  ];

  const routed = cases.map((candidate) => {
    const source = sourceForLaunchFile({ name: candidate.name, type: candidate.type, size: 4096 });
    const kind = source?.kind ?? null;
    assert(kind === candidate.expectedKind, `${candidate.name} routed to ${String(kind)}, expected ${String(candidate.expectedKind)}`);
    return {
      name: candidate.name,
      type: candidate.type || "(from extension)",
      expected_kind: candidate.expectedKind,
      actual_kind: kind,
      mime: source && "mime" in source ? source.mime : null,
    };
  });

  return { routed };
}

async function proveAssetContract() {
  const data = manifest();
  const icons = data.icons ?? [];
  const screenshots = data.screenshots ?? [];

  const requiredIcons = [
    { src: "/icon-192.png", width: 192, height: 192 },
    { src: "/icon-512.png", width: 512, height: 512 },
    { src: "/icon-maskable-512.png", width: 512, height: 512 },
  ];

  const iconResults = requiredIcons.map((expected) => {
    assert(icons.some((icon) => icon.src === expected.src), `manifest missing icon ${expected.src}`);
    const size = pngSize(expected.src);
    assert(size.width === expected.width && size.height === expected.height, `${expected.src} is ${size.width}x${size.height}`);
    return { ...expected, actual: size };
  });

  const screenshotResults = screenshots.map((shot) => {
    assert(typeof shot.src === "string", "screenshot missing src");
    const absolute = publicPath(shot.src);
    assert(existsSync(absolute), `screenshot missing on disk: ${shot.src}`);
    return {
      src: shot.src,
      sizes: shot.sizes,
      form_factor: shot.form_factor,
      exists: true,
    };
  });

  assert(screenshotResults.some((shot) => shot.form_factor === "narrow"), "manifest missing narrow screenshot");
  assert(screenshotResults.some((shot) => shot.form_factor === "wide"), "manifest missing wide screenshot");

  return {
    icons: iconResults,
    screenshots: screenshotResults,
  };
}

async function proveMobileNativeShellCopy() {
  const source = readFileSync(join(ROOT, "app/mobile/page.tsx"), "utf8");
  const requiredText = [
    "Native shell status",
    "Installable web app first; store shells after proof.",
    "PWA install first",
    "Native shells later",
    "Native iOS and Android store shells are not shipped in v1",
    "Installed-capable browsers can hand audio, video, captions, PDFs, DOCX, Markdown, and text files into /session.",
  ];

  for (const text of requiredText) {
    assert(source.includes(text), `mobile page missing copy: ${text}`);
  }

  return { required_text_count: requiredText.length };
}

function publicPath(pathname: string) {
  return join(ROOT, "public", pathname.replace(/^\/+/, ""));
}

function pngSize(pathname: string): { width: number; height: number } {
  const file = readFileSync(publicPath(pathname));
  return {
    width: file.readUInt32BE(16),
    height: file.readUInt32BE(20),
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
