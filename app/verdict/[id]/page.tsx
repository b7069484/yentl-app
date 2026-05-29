import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { VerdictView } from "@/components/verdict/VerdictView";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, id),
  });
  const title = row?.title ?? "Yentl verdict";
  const description =
    "AI-generated fact-check verdict from a Yentl session. Verify before sharing.";

  // Phase 1e — OpenGraph + Twitter cards so shared verdict URLs render
  // preview cards on Slack, iMessage, Twitter/X, Discord, LinkedIn, etc.
  // Uses the brand mark as the default image. AI Act Art 50 disclosure
  // ("AI-generated") is part of the description so platforms that strip
  // OG images still surface it.
  return {
    title: `${title} — Yentl`,
    description,
    openGraph: {
      title: `${title} — Yentl`,
      description,
      url: `/verdict/${id}`,
      siteName: "Yentl",
      type: "article",
      images: [
        {
          url: "/yentl-mark.svg",
          width: 512,
          height: 512,
          alt: "Yentl — speak truth.",
        },
      ],
    },
    twitter: {
      card: "summary",
      title: `${title} — Yentl`,
      description,
      images: ["/yentl-mark.svg"],
    },
  };
}

export default async function VerdictPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const row = await db.query.sessions.findFirst({
    where: eq(schema.sessions.id, id),
  });

  if (!row || !row.data) {
    notFound();
  }

  return <VerdictView sessionId={row.id} session={row.data as Session} />;
}
