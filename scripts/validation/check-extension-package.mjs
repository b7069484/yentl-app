#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";

const ROOT = process.cwd();
const EXTENSION_DIR = join(ROOT, "extension");
const STORE_LISTING_PATH = join(ROOT, "docs/superpowers/chrome-web-store-listing.json");
const PRODUCTION_ORIGIN = "https://yentl.it";
const LOCAL_ORIGINS = ["http://localhost:3000/*", "http://127.0.0.1:3000/*"];
const REQUIRED_FILES = [
  "manifest.json",
  "manifest.local.json",
  "background.js",
  "content-script.js",
  "offscreen.html",
  "offscreen.js",
  "options.html",
  "options.js",
  "popup.html",
  "popup.js",
  "README.md",
];
const REQUIRED_ICON_FILES = [
  ["icons/icon-16.png", 16, 16],
  ["icons/icon-32.png", 32, 32],
  ["icons/icon-48.png", 48, 48],
  ["icons/icon-128.png", 128, 128],
];
const REQUIRED_PERMISSIONS = ["activeTab", "offscreen", "scripting", "storage", "tabCapture", "tabs"];
const REQUIRED_PERMISSION_RATIONALES = [
  ...REQUIRED_PERMISSIONS,
  `${PRODUCTION_ORIGIN}/*`,
  "https://api.deepgram.com/*",
  "wss://api.deepgram.com",
];
const FORBIDDEN_STRINGS = [
  "factify",
  "factify-rose",
  "vercel.app/factify",
];

const failures = [];

function fail(message) {
  failures.push(message);
}

function readExtensionFile(path) {
  return readFileSync(join(EXTENSION_DIR, path), "utf8");
}

function assertFile(path) {
  try {
    const stat = statSync(join(EXTENSION_DIR, path));
    if (!stat.isFile()) fail(`${path} is not a file`);
  } catch {
    fail(`${path} is missing`);
  }
}

function assertRootFile(path) {
  try {
    const stat = statSync(join(ROOT, path));
    if (!stat.isFile()) fail(`${path} is not a file`);
  } catch {
    fail(`${path} is missing`);
  }
}

function parseJson(path) {
  try {
    return JSON.parse(readExtensionFile(path));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function parseRootJson(path) {
  try {
    return JSON.parse(readFileSync(join(ROOT, path), "utf8"));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function pngDimensions(path) {
  try {
    const file = readFileSync(path);
    if (!file.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
      fail(`${relative(ROOT, path)} must be a PNG file`);
      return null;
    }
    return {
      width: file.readUInt32BE(16),
      height: file.readUInt32BE(20),
    };
  } catch (error) {
    fail(`${relative(ROOT, path)} could not be read: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function assertPngSize(path, width, height) {
  const dimensions = pngDimensions(path);
  if (!dimensions) return;
  if (dimensions.width !== width || dimensions.height !== height) {
    fail(`${relative(ROOT, path)} must be ${width}x${height}px, got ${dimensions.width}x${dimensions.height}px`);
  }
}

function assertArrayIncludesAll(label, values, required) {
  if (!Array.isArray(values)) {
    fail(`${label} must be an array`);
    return;
  }
  for (const item of required) {
    if (!values.includes(item)) fail(`${label} must include ${item}`);
  }
}

function assertNoForbiddenStrings(path) {
  const text = readExtensionFile(path);
  for (const forbidden of FORBIDDEN_STRINGS) {
    if (text.toLowerCase().includes(forbidden)) {
      fail(`${path} still contains forbidden legacy string: ${forbidden}`);
    }
  }
}

function assertParses(path) {
  const source = readExtensionFile(path);
  try {
    // Parse only; do not execute extension code.
    new Function(source);
  } catch (error) {
    fail(`${path} does not parse as JavaScript: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const file of REQUIRED_FILES) assertFile(file);
for (const [file, width, height] of REQUIRED_ICON_FILES) {
  assertFile(file);
  assertPngSize(join(EXTENSION_DIR, file), width, height);
}
assertRootFile(relative(ROOT, STORE_LISTING_PATH));

const manifest = parseJson("manifest.json");
const localManifest = parseJson("manifest.local.json");
const storeListing = parseRootJson(relative(ROOT, STORE_LISTING_PATH));

if (manifest) {
  if (manifest.manifest_version !== 3) fail("manifest.json must be MV3");
  if (manifest.minimum_chrome_version !== "116") fail("manifest.json must require Chrome 116");
  if (manifest.name !== "Yentl Tab Listener") fail("manifest.json name must be Yentl Tab Listener");
  assertArrayIncludesAll("manifest.permissions", manifest.permissions, REQUIRED_PERMISSIONS);

  if (manifest.background?.service_worker !== "background.js") {
    fail("manifest background service_worker must be background.js");
  }
  if (manifest.background?.type !== "module") {
    fail("manifest background type must be module");
  }
  if (manifest.action?.default_popup !== "popup.html") {
    fail("manifest action.default_popup must be popup.html");
  }
  for (const [size, iconPath] of Object.entries({
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
  })) {
    if (manifest.action?.default_icon?.[size] !== iconPath) {
      fail(`manifest action.default_icon.${size} must be ${iconPath}`);
    }
  }
  for (const [size, iconPath] of Object.entries({
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  })) {
    if (manifest.icons?.[size] !== iconPath) {
      fail(`manifest icons.${size} must be ${iconPath}`);
    }
  }
  if (manifest.options_page !== "options.html") {
    fail("manifest options_page must be options.html");
  }
  if (!/^\d+\.\d+\.\d+$/.test(manifest.version ?? "")) {
    fail("manifest version must use dotted semantic version form");
  }
  if ((manifest.description ?? "").length < 40 || (manifest.description ?? "").length > 132) {
    fail("manifest description must be between 40 and 132 characters for store listing quality");
  }

  for (const localOrigin of LOCAL_ORIGINS) {
    if (manifest.host_permissions?.includes(localOrigin)) {
      fail(`production host_permissions must not include ${localOrigin}`);
    }
    if (!manifest.optional_host_permissions?.includes(localOrigin)) {
      fail(`optional_host_permissions must include ${localOrigin}`);
    }
  }

  if (!manifest.host_permissions?.includes(`${PRODUCTION_ORIGIN}/*`)) {
    fail(`production host_permissions must include ${PRODUCTION_ORIGIN}/*`);
  }

  const csp = manifest.content_security_policy?.extension_pages ?? "";
  for (const required of [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    PRODUCTION_ORIGIN,
    "https://api.deepgram.com",
    "wss://api.deepgram.com",
  ]) {
    if (!csp.includes(required)) fail(`manifest CSP must include ${required}`);
  }

  const contentScriptFiles = manifest.content_scripts?.flatMap((entry) => entry.js ?? []) ?? [];
  for (const js of contentScriptFiles) assertFile(js);
  const contentScriptMatches = manifest.content_scripts?.flatMap((entry) => entry.matches ?? []) ?? [];
  for (const localOrigin of LOCAL_ORIGINS) {
    if (contentScriptMatches.includes(localOrigin)) {
      fail(`production content_scripts must not include ${localOrigin}`);
    }
  }
}

if (localManifest) {
  for (const localOrigin of LOCAL_ORIGINS) {
    if (!localManifest.host_permissions?.includes(localOrigin)) {
      fail(`manifest.local host_permissions must include ${localOrigin}`);
    }
  }
  for (const [size, iconPath] of Object.entries({
    16: "icons/icon-16.png",
    32: "icons/icon-32.png",
    48: "icons/icon-48.png",
    128: "icons/icon-128.png",
  })) {
    if (localManifest.icons?.[size] !== iconPath) {
      fail(`manifest.local icons.${size} must be ${iconPath}`);
    }
  }
}

if (storeListing) {
  if (storeListing.name !== manifest?.name) fail("store listing name must match manifest name");
  if (typeof storeListing.summary !== "string" || storeListing.summary.length < 40 || storeListing.summary.length > 132) {
    fail("store listing summary must be between 40 and 132 characters");
  }
  for (const [field, expected] of Object.entries({
    home_page_url: PRODUCTION_ORIGIN,
    privacy_policy_url: `${PRODUCTION_ORIGIN}/privacy`,
    support_url: `${PRODUCTION_ORIGIN}/contact`,
  })) {
    if (storeListing[field] !== expected) fail(`store listing ${field} must be ${expected}`);
  }
  for (const permission of REQUIRED_PERMISSION_RATIONALES) {
    const rationale = storeListing.permission_rationale?.[permission];
    if (typeof rationale !== "string" || rationale.trim().length < 30) {
      fail(`store listing permission_rationale must explain ${permission}`);
    }
  }
  if (!Array.isArray(storeListing.screenshots) || storeListing.screenshots.length < 1) {
    fail("store listing must include at least one screenshot");
  } else {
    for (const screenshot of storeListing.screenshots) {
      if (typeof screenshot.path !== "string") {
        fail("store listing screenshot path must be a string");
        continue;
      }
      assertRootFile(screenshot.path);
      assertPngSize(join(ROOT, screenshot.path), screenshot.width, screenshot.height);
      const storeSized =
        (screenshot.width === 1280 && screenshot.height === 800) ||
        (screenshot.width === 640 && screenshot.height === 400);
      if (!storeSized) fail(`${screenshot.path} must use a 1280x800 or 640x400 store screenshot size`);
    }
  }
  const promo = storeListing.small_promo_tile;
  if (!promo?.path) {
    fail("store listing must include a small promotional tile");
  } else {
    assertRootFile(promo.path);
    assertPngSize(join(ROOT, promo.path), 440, 280);
  }
  if (!Array.isArray(storeListing.data_use_disclosure) || storeListing.data_use_disclosure.length < 2) {
    fail("store listing must document data-use disclosures");
  }
}

for (const file of REQUIRED_FILES) assertNoForbiddenStrings(file);

for (const file of ["background.js", "content-script.js", "offscreen.js", "options.js", "popup.js"]) {
  assertParses(file);
}

const background = readExtensionFile("background.js");
const options = readExtensionFile("options.js");
const popup = readExtensionFile("popup.js");
const readme = readExtensionFile("README.md");

if (!background.includes(`const DEFAULT_APP_ORIGIN = "${PRODUCTION_ORIGIN}"`)) {
  fail("background.js must default to the production Yentl origin");
}
if (!options.includes(`const DEFAULT_APP_ORIGIN = "${PRODUCTION_ORIGIN}"`)) {
  fail("options.js must default to the production Yentl origin");
}
if (!popup.includes("status-request") || !popup.includes("popup-start-active-tab") || !popup.includes("app-stop-capture")) {
  fail("popup.js must expose status, start, and stop capture controls");
}
if (!readme.includes("Local Validation") || !readme.includes("Production Install")) {
  fail("README.md must document production install and local validation");
}

if (failures.length > 0) {
  console.error("Extension package check failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const checkedFiles = [...REQUIRED_FILES, ...REQUIRED_ICON_FILES.map(([file]) => file)].map((file) =>
  relative(ROOT, join(EXTENSION_DIR, file)),
);
checkedFiles.push(relative(ROOT, STORE_LISTING_PATH));
const report = {
  ok: true,
  generated_at: new Date().toISOString(),
  production_origin: PRODUCTION_ORIGIN,
  manifest_version: manifest?.manifest_version ?? null,
  version: manifest?.version ?? null,
  minimum_chrome_version: manifest?.minimum_chrome_version ?? null,
  permissions: manifest?.permissions ?? [],
  host_permissions: manifest?.host_permissions ?? [],
  optional_host_permissions: manifest?.optional_host_permissions ?? [],
  store_readiness: {
    mv3: manifest?.manifest_version === 3,
    production_host_permission: manifest?.host_permissions?.includes(`${PRODUCTION_ORIGIN}/*`) ?? false,
    local_origins_optional_only: LOCAL_ORIGINS.every(
      (origin) => !manifest?.host_permissions?.includes(origin) && manifest?.optional_host_permissions?.includes(origin),
    ),
    icons_declared: REQUIRED_ICON_FILES.every(([file, width, height]) => {
      const size = String(width);
      return manifest?.icons?.[size] === file && pngDimensions(join(EXTENSION_DIR, file))?.height === height;
    }),
    listing_metadata_present: Boolean(storeListing?.privacy_policy_url && storeListing?.support_url),
    screenshot_assets_present: Boolean(storeListing?.screenshots?.length),
    permission_rationales_complete: REQUIRED_PERMISSION_RATIONALES.every(
      (permission) => typeof storeListing?.permission_rationale?.[permission] === "string",
    ),
    popup_controls_documented: popup.includes("status-request") && popup.includes("popup-start-active-tab"),
    readme_install_docs: readme.includes("Local Validation") && readme.includes("Production Install"),
  },
  store_listing: storeListing
    ? {
        path: relative(ROOT, STORE_LISTING_PATH),
        privacy_policy_url: storeListing.privacy_policy_url,
        support_url: storeListing.support_url,
        screenshots: storeListing.screenshots?.map((screenshot) => screenshot.path) ?? [],
        small_promo_tile: storeListing.small_promo_tile?.path ?? null,
      }
    : null,
  checked_files: checkedFiles,
};

const reportPath = join(ROOT, "docs/superpowers/validation/extension-store-readiness.json");
await mkdir(dirname(reportPath), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
