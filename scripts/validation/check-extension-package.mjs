#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const EXTENSION_DIR = join(ROOT, "extension");
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
const REQUIRED_PERMISSIONS = ["activeTab", "offscreen", "scripting", "storage", "tabCapture", "tabs"];
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

function parseJson(path) {
  try {
    return JSON.parse(readExtensionFile(path));
  } catch (error) {
    fail(`${path} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return null;
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

const manifest = parseJson("manifest.json");
const localManifest = parseJson("manifest.local.json");

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
  if (manifest.options_page !== "options.html") {
    fail("manifest options_page must be options.html");
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
}

if (localManifest) {
  for (const localOrigin of LOCAL_ORIGINS) {
    if (!localManifest.host_permissions?.includes(localOrigin)) {
      fail(`manifest.local host_permissions must include ${localOrigin}`);
    }
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

const checkedFiles = REQUIRED_FILES.map((file) => relative(ROOT, join(EXTENSION_DIR, file)));
console.log(JSON.stringify({
  ok: true,
  manifestVersion: manifest?.manifest_version,
  version: manifest?.version,
  checkedFiles,
}, null, 2));
