import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";

export const runtime = "nodejs";
export const maxDuration = 10;

// Phase 1c Task 4 — current user's subscription tier + usage. Defaults to
// free + 0 audio seconds used when no row exists, so a brand-new user can
// be gated without an explicit provisioning step. Stripe webhook (Phase 1d)
// will write the row on checkout; cron (Phase 1d) will reset audioSecondsUsed
// + bump periodResetAt monthly.

export type SubscriptionMeResponse = {
  tier: "free" | "pro" | "studio";
  audioSecondsUsed: number;
  periodResetAt: string | null;
};

const DEFAULT_RESPONSE: SubscriptionMeResponse = {
  tier: "free",
  audioSecondsUsed: 0,
  periodResetAt: null,
};

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const row = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.clerkUserId, userId),
  });

  if (!row) {
    return NextResponse.json(DEFAULT_RESPONSE);
  }

  const tierString = (row.tier ?? "free").toLowerCase();
  const tier: SubscriptionMeResponse["tier"] =
    tierString === "pro" || tierString === "studio" ? tierString : "free";

  return NextResponse.json({
    tier,
    audioSecondsUsed: row.audioSecondsUsed ?? 0,
    periodResetAt: row.periodResetAt
      ? new Date(row.periodResetAt).toISOString()
      : null,
  });
}
