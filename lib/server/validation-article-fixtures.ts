import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SYNTHETIC_ARTICLE_PATH = "/validation/yentl-synthetic-article.html";
export const SYNTHETIC_ARTICLE_FIXTURE_ID = "yentl_synthetic_article_html";
export const MESSY_ARTICLE_PATH = "/validation/yentl-messy-article.html";
export const MESSY_ARTICLE_FIXTURE_ID = "yentl_messy_article_html";

const LOCAL_VALIDATION_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const ARTICLE_FIXTURES = [
  {
    path: SYNTHETIC_ARTICLE_PATH,
    filename: "yentl-synthetic-article.html",
    id: SYNTHETIC_ARTICLE_FIXTURE_ID,
  },
  {
    path: MESSY_ARTICLE_PATH,
    filename: "yentl-messy-article.html",
    id: MESSY_ARTICLE_FIXTURE_ID,
  },
] as const;

export type ValidationArticleFixture = {
  html: string;
  finalUrl: string;
  contentType: "text/html";
  validation_fixture: true;
  validation_fixture_id: (typeof ARTICLE_FIXTURES)[number]["id"];
};

export function validationArticleFixturesEnabled(): boolean {
  if (process.env.YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function isSyntheticArticleValidationUrl(value: string): boolean {
  if (!validationArticleFixturesEnabled()) return false;
  return Boolean(findValidationArticleFixture(value));
}

function findValidationArticleFixture(value: string) {
  const trimmed = value.trim();
  const fixture = ARTICLE_FIXTURES.find((entry) => entry.path === trimmed);
  if (fixture) return fixture;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!LOCAL_VALIDATION_HOSTS.has(url.hostname)) return null;
    return ARTICLE_FIXTURES.find((entry) => entry.path === url.pathname) ?? null;
  } catch {
    return null;
  }
}

export async function loadSyntheticArticleValidationFixture(value: string): Promise<ValidationArticleFixture | null> {
  if (!validationArticleFixturesEnabled()) return null;
  const fixture = findValidationArticleFixture(value);
  if (!fixture) return null;
  const html = await readFile(
    join(process.cwd(), "public", "validation", fixture.filename),
    "utf8",
  );
  const finalUrl = value.trim().startsWith("http")
    ? value.trim()
    : `http://localhost:3000${fixture.path}`;

  return {
    html,
    finalUrl,
    contentType: "text/html",
    validation_fixture: true,
    validation_fixture_id: fixture.id,
  };
}
