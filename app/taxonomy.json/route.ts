import { ALL } from "@/lib/taxonomy";

export const dynamic = "force-static";

export function GET() {
  const payload = {
    _license: "CC-BY-4.0",
    _source: "Cognitive Biases & Logical Fallacies Used by Antisemites by Israel B. Bitton, 2024",
    _generated: new Date().toISOString().slice(0, 10),
    entries: ALL,
  };
  return Response.json(payload);
}
