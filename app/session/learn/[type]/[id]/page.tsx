import { LearnMore } from "@/components/session/learn-more";
import { ValidationSampleHydrator } from "@/components/session/validation-sample-hydrator";

export default async function LearnPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { type, id } = await params;
  const sampleId = validationSampleId(await searchParams);
  if (type !== "marker" && type !== "claim") {
    return <div className="p-8 text-ink-3">Unknown learn type.</div>;
  }
  return (
    <ValidationSampleHydrator sampleId={sampleId}>
      <LearnMore type={type} id={decodeURIComponent(id)} />
    </ValidationSampleHydrator>
  );
}

function validationSampleId(
  searchParams?: Record<string, string | string[] | undefined>,
): string | null {
  if (valueOf(searchParams?.demo) !== "validation") return null;
  return valueOf(searchParams?.sample);
}

function valueOf(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
