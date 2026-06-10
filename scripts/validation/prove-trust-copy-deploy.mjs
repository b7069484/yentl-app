#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const APP_ORIGIN = process.env.YENTL_TRUST_COPY_PROOF_ORIGIN ?? "https://yentl.it";
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/trust-copy-deploy-proof.json");
const REQUEST_TIMEOUT_MS = Number(process.env.YENTL_TRUST_COPY_PROOF_TIMEOUT_MS ?? 15000);

const TRUST_PAGES = [
  {
    path: "/contact",
    mustInclude: ["support@yentl.it", "privacy@yentl.it", "accessibility@yentl.it", "Contact Yentl"],
    mustNotInclude: ["contact page is not enabled", "contact is not enabled", "yentl.app"],
  },
  {
    path: "/privacy",
    mustInclude: ["Privacy Policy", "privacy@yentl.it", "/contact"],
    mustNotInclude: ["yentl.app"],
  },
  {
    path: "/terms",
    mustInclude: ["Terms of Service", "/privacy", "/contact"],
    mustNotInclude: ["yentl.app"],
  },
  {
    path: "/accessibility",
    mustInclude: ["Accessibility Statement", "accessibility@yentl.it", "/contact"],
    mustNotInclude: ["yentl.app"],
  },
  {
    path: "/pricing",
    mustInclude: ["no published paid plan", "/contact"],
    mustNotInclude: ["yentl.app"],
  },
  {
    path: "/faq",
    mustInclude: ["Do I need an account?", "no published paid plan", "handled by contact"],
    mustNotInclude: ["contact page is not enabled", "yentl.app"],
    preferredInclude: ["/contact", "privacy@yentl.it"],
  },
  {
    path: "/about",
    mustInclude: ["About Yentl", "/methodology", "/privacy"],
    mustNotInclude: ["yentl.app"],
  },
];

async function main() {
  const checks = [];
  const deployBlockers = [];
  for (const page of TRUST_PAGES) {
    checks.push(await runCheck(`trust-page-${page.path}`, () => proveTrustPage(page)));
    deployBlockers.push(...(await probePreferredCopy(page)));
  }

  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    app_origin: APP_ORIGIN,
    pages: TRUST_PAGES.map((page) => page.path),
    checks,
    deploy_blockers: deployBlockers.filter(Boolean),
    failures: failures.map(({ name, error }) => ({ name, error })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Trust/copy deploy proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

async function proveTrustPage(page) {
  const { status, text } = await readText(page.path);
  if (status !== 200) {
    throw new Error(`${page.path} returned ${status}`);
  }

  for (const expected of page.mustInclude) {
    if (!text.includes(expected)) {
      throw new Error(`${page.path} missing required copy: ${expected}`);
    }
  }

  for (const forbidden of page.mustNotInclude) {
    if (text.includes(forbidden)) {
      throw new Error(`${page.path} still contains stale copy: ${forbidden}`);
    }
  }

  return { status, path: page.path };
}

async function probePreferredCopy(page) {
  if (!page.preferredInclude?.length) return [];
  const { status, text } = await readText(page.path);
  if (status !== 200) return [];

  return page.preferredInclude
    .filter((snippet) => !text.includes(snippet))
    .map((snippet) => ({
      page: page.path,
      missing_preferred_copy: snippet,
      note: "Required in repo source; redeploy needed if this blocker appears on production.",
    }));
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

async function readText(path) {
  const res = await fetch(`${APP_ORIGIN}${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const text = await res.text().catch(() => "");
  return { status: res.status, text };
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});