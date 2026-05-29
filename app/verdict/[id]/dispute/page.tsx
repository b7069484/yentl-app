import { DisputeForm } from "@/components/disputes/DisputeForm";

export const runtime = "nodejs";

export const metadata = {
  title: "Dispute a verdict — Yentl",
  description: "Flag a Yentl verdict for editorial review.",
};

export default async function DisputePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = (await searchParams) ?? {};
  const rawClaim = sp.claim;
  const claimId = Array.isArray(rawClaim) ? rawClaim[0] : rawClaim;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-foreground sm:text-3xl">
          Flag this verdict for review
        </h1>
        <p className="text-sm text-muted-foreground">
          Tell us what we got wrong and how. We log every dispute and review
          them on a rolling basis. If a correction lands, it appears on{" "}
          <a className="underline" href="/corrections">
            /corrections
          </a>{" "}
          and the verdict card is flagged.
        </p>
      </header>

      <DisputeForm sessionId={id} claimId={claimId ?? null} />
    </main>
  );
}
