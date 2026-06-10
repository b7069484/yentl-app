type SearchParamsLike =
  | string
  | URLSearchParams
  | { toString(): string }
  | null
  | undefined;

type ParamValue = string | number | boolean | null | undefined;

function paramsFrom(current: SearchParamsLike): URLSearchParams {
  return new URLSearchParams(
    typeof current === "string" ? current : current?.toString() ?? "",
  );
}

function applyParams(
  params: URLSearchParams,
  values: Record<string, ParamValue>,
): void {
  for (const [key, value] of Object.entries(values)) {
    if (value === null || value === undefined || value === "") {
      params.delete(key);
    } else {
      params.set(key, String(value));
    }
  }
}

function hrefFrom(pathname: string, params: URLSearchParams, hash?: string): string {
  const query = params.toString();
  const fragment = hash ? `#${hash.replace(/^#/, "")}` : "";
  return `${pathname}${query ? `?${query}` : ""}${fragment}`;
}

export function sessionViewHref(
  current: SearchParamsLike,
  view: string,
  params: Record<string, ParamValue> = {},
  hash?: string,
): string {
  const next = paramsFrom(current);
  next.set("view", view);
  applyParams(next, params);
  return hrefFrom("/session", next, hash);
}

export function sessionPathHref(
  current: SearchParamsLike,
  pathname: string,
  params: Record<string, ParamValue> = {},
  hash?: string,
): string {
  const next = paramsFrom(current);
  applyParams(next, params);
  return hrefFrom(pathname, next, hash);
}

export function tvHrefForSessionContext(current: SearchParamsLike): string {
  const params = paramsFrom(current);
  const next = new URLSearchParams();
  const restoreId = params.get("restore");
  const demo = params.get("demo");
  const sample = params.get("sample");

  if (restoreId) {
    next.set("restore", restoreId);
  } else if (demo === "validation" && sample) {
    next.set("demo", demo);
    next.set("sample", sample);
  }

  const query = next.toString();
  return query ? `/tv?${query}` : "/tv";
}
