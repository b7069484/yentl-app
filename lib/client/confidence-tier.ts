export type ConfidenceTier = "low" | "medium" | "high";

// Phase 1b Task 5 — derive a 3-tier confidence indicator from the existing
// 0-100 `score` field on a ClaimCard. Thresholds picked to match the audit's
// "make uncertainty visible" guidance and the existing color semantics in
// the codebase (≥85 = good, 65-84 = caution, <65 = doubt).
export const CONFIDENCE_TIER_THRESHOLDS = {
  high: 85,
  medium: 65,
} as const;

export function confidenceTier(score: number): ConfidenceTier {
  if (score >= CONFIDENCE_TIER_THRESHOLDS.high) return "high";
  if (score >= CONFIDENCE_TIER_THRESHOLDS.medium) return "medium";
  return "low";
}
