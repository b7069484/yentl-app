import { LearnMore } from "@/components/session/learn-more";

export default async function LearnPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "marker" && type !== "claim") {
    return <div className="p-8 text-ink-3">Unknown learn type.</div>;
  }
  return <LearnMore type={type} id={decodeURIComponent(id)} />;
}
