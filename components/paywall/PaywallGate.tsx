"use client";

import { useEffect, useState } from "react";
import {
  CapReachedSheet,
  isOverCap,
  type SubscriptionTier,
} from "@/components/paywall/CapReachedSheet";

type Snapshot = {
  tier: SubscriptionTier;
  audioSecondsUsed: number;
  periodResetAt: string | null;
};

// Phase 1c Task 4 — fetches the current user's subscription snapshot on mount
// and shows CapReachedSheet when over the free cap. Pro/Studio never show.
// Unauthed (401) silently no-ops — session page handles auth at the route
// level, so reaching this without auth means we're in a test harness or the
// keyless dev path; either way no paywall.
//
// onUpgradeIntent will be wired to POST /api/billing/checkout in Phase 1d
// when Stripe lands.
export function PaywallGate() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/subscriptions/me");
        if (!res.ok) return;
        const data = (await res.json()) as Snapshot;
        if (!cancelled) setSnapshot(data);
      } catch {
        // Network error — fail open (no paywall). Better than blocking a
        // session on a transient failure.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!snapshot) return null;
  const over = isOverCap({
    tier: snapshot.tier,
    audioSecondsUsed: snapshot.audioSecondsUsed,
  });
  if (!over || dismissed) return null;

  return (
    <CapReachedSheet
      open
      onClose={() => setDismissed(true)}
      audioSecondsUsed={snapshot.audioSecondsUsed}
      periodResetAt={snapshot.periodResetAt}
      onUpgradeIntent={() => {
        // Phase 1d: POST /api/billing/checkout
        console.info("[paywall] upgrade intent logged");
      }}
    />
  );
}
