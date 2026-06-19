export type AuthSearchParams = Record<string, string | string[] | undefined>;

export type AuthReturnTarget = {
  href: string | null;
  unsafeIgnored: boolean;
};

const RETURN_PARAM_KEYS = [
  "redirect_url",
  "redirectUrl",
  "return_to",
  "returnTo",
  "next",
] as const;

const SAFE_RETURN_PREFIXES = ["/session", "/sessions", "/tv", "/mobile", "/demo"] as const;

export function readAuthReturnTarget(searchParams?: AuthSearchParams | null): AuthReturnTarget {
  const rawTarget = RETURN_PARAM_KEYS.map((key) => firstValue(searchParams?.[key])).find(Boolean);
  const href = sanitizeAuthReturnHref(rawTarget);

  return {
    href,
    unsafeIgnored: Boolean(rawTarget && !href),
  };
}

export function sanitizeAuthReturnHref(rawTarget?: string | null): string | null {
  const trimmed = rawTarget?.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed.startsWith("//")) return null;

  let parsed: URL;
  try {
    parsed = new URL(trimmed, "https://yentl.local");
  } catch {
    return null;
  }

  if (parsed.origin !== "https://yentl.local") return null;
  if (isAuthRoute(parsed.pathname)) return null;
  if (!SAFE_RETURN_PREFIXES.some((prefix) => matchesPrefix(parsed.pathname, prefix))) return null;

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

function firstValue(value?: string | string[]): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isAuthRoute(pathname: string) {
  return matchesPrefix(pathname, "/signin") || matchesPrefix(pathname, "/signup");
}
