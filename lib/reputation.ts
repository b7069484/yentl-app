import type { ReputationTier } from "./types";

const HIGH = new Set([
  "reuters.com",
  "apnews.com",
  "afp.com",
  "bbc.com",
  "bbc.co.uk",
  "nytimes.com",
  "washingtonpost.com",
  "wsj.com",
  "ft.com",
  "economist.com",
  "theguardian.com",
  "nature.com",
  "science.org",
  "thelancet.com",
  "nejm.org",
  "scholar.google.com",
  "pubmed.ncbi.nlm.nih.gov",
]);

const LOW = new Set([
  "infowars.com",
  "naturalnews.com",
  "breitbart.com",
  "rt.com",
  "sputniknews.com",
]);

export function extractDomain(urlOrHost: string): string {
  let s = urlOrHost.trim().toLowerCase();
  s = s.replace(/^https?:\/\//, "");
  s = s.split("/")[0];
  s = s.replace(/^www\./, "");
  return s;
}

export function classifyDomain(domain: string): ReputationTier {
  const d = extractDomain(domain);
  if (HIGH.has(d)) return "high";
  if (LOW.has(d)) return "low";
  if (d.endsWith(".gov") || d.endsWith(".edu")) return "high";
  // social / community
  if (
    d === "twitter.com" || d === "x.com" ||
    d === "facebook.com" || d === "reddit.com" ||
    d === "tiktok.com" || d === "instagram.com"
  ) return "low";
  return "mid";
}
