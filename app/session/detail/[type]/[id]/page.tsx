import { ItemDetail } from "@/components/session/item-detail";

export default async function DetailPage({
  params,
}: {
  params: Promise<{ type: string; id: string }>;
}) {
  const { type, id } = await params;
  if (type !== "claim" && type !== "marker") {
    return <div className="p-8 text-ink-3">Unknown detail type.</div>;
  }
  return <ItemDetail type={type} id={id} />;
}
