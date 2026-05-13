import { NextRequest, NextResponse } from "next/server";
import { fetchPreview } from "@/lib/server/og-fetch";
import { ssrfReject } from "./ssrf-guard";
import type { SourcePreview } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 15;

const MAX_URLS = 20;

async function safeFetchPreview(url: string): Promise<SourcePreview | null> {
  const reason = await ssrfReject(url);
  if (reason !== null) {
    console.warn(`[source-preview] blocked ${url}: ${reason}`);
    return null;
  }
  return fetchPreview(url);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const urls = (body as { urls?: unknown }).urls;
  if (!Array.isArray(urls) || urls.some((u) => typeof u !== "string")) {
    return NextResponse.json({ error: "urls must be string[]" }, { status: 400 });
  }
  const trimmed = (urls as string[]).slice(0, MAX_URLS);

  const settled = await Promise.allSettled(trimmed.map((u) => safeFetchPreview(u)));

  const previews: Record<string, SourcePreview | null> = {};
  trimmed.forEach((u, i) => {
    const r = settled[i];
    previews[u] = r.status === "fulfilled" ? r.value : null;
  });

  return NextResponse.json({ previews });
}
