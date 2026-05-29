import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  clerkUserId: text("clerk_user_id").primaryKey(),
  email: text("email").notNull(),
  displayName: text("display_name"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id")
    .notNull()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  title: text("title"),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  sourceKind: text("source_kind").notNull(),
  sourceMeta: jsonb("source_meta"),
  data: jsonb("data"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  clerkUserId: text("clerk_user_id")
    .primaryKey()
    .references(() => users.clerkUserId, { onDelete: "cascade" }),
  tier: text("tier").notNull().default("free"),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  status: text("status"),
  currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
  audioSecondsUsed: integer("audio_seconds_used").default(0).notNull(),
  wordsUsed: integer("words_used").default(0).notNull(),
  periodResetAt: timestamp("period_reset_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Phase 1c Task 3 — disputes scaffold. Committee #20 + audit Phase B editorial
// integrity ask: every verdict needs a recourse path or Yentl's editorial
// posture is weaker than required for AI Act Art 50 + defamation defense.
// Submission lands here; review/auto-flag UX is Phase 1d.
export const disputes = pgTable("disputes", {
  id: text("id").primaryKey(),                                                        // dispute_<ulid>
  sessionId: text("session_id")
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  claimId: text("claim_id"),                                                          // optional — session-wide vs claim-specific
  disputerClerkUserId: text("disputer_clerk_user_id"),                                // nullable — supports anonymous disputes
  disputerEmail: text("disputer_email"),
  evidenceUrl: text("evidence_url"),
  correctionRequested: text("correction_requested").notNull(),
  status: text("status").notNull().default("pending"),                                // pending | reviewing | resolved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
