"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type SubscriptionTier = "free" | "pro" | "studio";

// V3.29 wireframes per project memory: free = 30 min audio/month, pro = 10
// hours, studio = unlimited. Pro pricing $15/mo, studio $50/mo.
export const FREE_TIER_AUDIO_SECONDS = 30 * 60;

export function isOverCap(input: {
  tier: SubscriptionTier;
  audioSecondsUsed: number;
}): boolean {
  if (input.tier !== "free") return false;
  return input.audioSecondsUsed >= FREE_TIER_AUDIO_SECONDS;
}

export function CapReachedSheet({
  open,
  onClose,
  audioSecondsUsed,
  periodResetAt,
  onUpgradeIntent,
}: {
  open: boolean;
  onClose: () => void;
  audioSecondsUsed: number;
  periodResetAt: string | null;
  onUpgradeIntent?: () => void;
}) {
  const minutesUsed = Math.round(audioSecondsUsed / 60);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-testid="cap-reached-sheet"
      >
        <DialogHeader>
          <DialogTitle>
            You&apos;ve used your free 30 minutes this month
          </DialogTitle>
          <DialogDescription>
            Yentl gives every free account 30 minutes of audio per month.
            You&apos;re at {minutesUsed} minutes — upgrade to keep
            fact-checking without interruption.
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg border border-border/60 bg-card p-4">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-foreground">
              Yentl Pro
            </span>
            <span className="text-2xl font-bold text-foreground">
              $15<span className="text-sm font-normal text-muted-foreground">/mo</span>
            </span>
          </div>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            <li>10 hours of audio per month</li>
            <li>Shareable verdict URLs</li>
            <li>Higher-resolution sources + faster checks</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={onClose}>
            Not now
          </Button>
          <Button
            onClick={() => {
              onUpgradeIntent?.();
              // Phase 1c will wire this to Stripe Checkout via
              // POST /api/billing/checkout. For now the click only logs
              // intent so we can measure interest.
            }}
          >
            Upgrade to Pro — $15/mo
          </Button>
        </div>

        {periodResetAt && (
          <p className="mt-3 text-xs text-muted-foreground">
            Free quota resets on {new Date(periodResetAt).toLocaleDateString()}.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
