import { TVDashboard } from "@/components/session/tv-dashboard";
import { SavedSessionHydrator } from "@/components/session/saved-session-hydrator";
import { ValidationSampleHydrator } from "@/components/session/validation-sample-hydrator";

export default async function TVPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const restoreId = restoreSessionId(params);
  const sampleId = restoreId ? null : validationSampleId(params);

  return (
    <SavedSessionHydrator restoreId={restoreId}>
      <ValidationSampleHydrator sampleId={sampleId}>
        <TVDashboard />
      </ValidationSampleHydrator>
    </SavedSessionHydrator>
  );
}

function restoreSessionId(
  searchParams?: Record<string, string | string[] | undefined>,
): string | null {
  return valueOf(searchParams?.restore);
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
