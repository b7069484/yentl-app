import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const SYNTHETIC_ARTICLE_PATH = "/validation/yentl-synthetic-article.html";
export const SYNTHETIC_ARTICLE_FIXTURE_ID = "yentl_synthetic_article_html";

const LOCAL_VALIDATION_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export type ValidationArticleFixture = {
  html: string;
  finalUrl: string;
  contentType: "text/html";
  validation_fixture: true;
  validation_fixture_id: typeof SYNTHETIC_ARTICLE_FIXTURE_ID;
};

export function validationArticleFixturesEnabled(): boolean {
  if (process.env.YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function isSyntheticArticleValidationUrl(value: string): boolean {
  if (!validationArticleFixturesEnabled()) return false;
  const trimmed = value.trim();
  if (trimmed === SYNTHETIC_ARTICLE_PATH) return true;

  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      LOCAL_VALIDATION_HOSTS.has(url.hostname) &&
      url.pathname === SYNTHETIC_ARTICLE_PATH
    );
  } catch {
    return false;
  }
}

export async function loadSyntheticArticleValidationFixture(value: string): Promise<ValidationArticleFixture | null> {
  if (!isSyntheticArticleValidationUrl(value)) return null;
  const html = await readFile(
    join(process.cwd(), "public", "validation", "yentl-synthetic-article.html"),
    "utf8",
  );
  const finalUrl = value.trim().startsWith("http")
    ? value.trim()
    : `http://localhost:3000${SYNTHETIC_ARTICLE_PATH}`;

  return {
    html,
    finalUrl,
    contentType: "text/html",
    validation_fixture: true,
    validation_fixture_id: SYNTHETIC_ARTICLE_FIXTURE_ID,
  };
}
