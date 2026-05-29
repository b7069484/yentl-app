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
  return {
    title: `${title} — Yentl`,
    description: "AI-generated fact-check verdict from a Yentl session.",
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
