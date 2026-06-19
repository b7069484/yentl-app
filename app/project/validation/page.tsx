import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  PlayCircle,
} from "lucide-react";
import {
  corpusAcceptanceSummary,
  corpusFunctionalSamples,
  launchCanaryProofs,
  validationFixtures,
  validationRunbook,
} from "@/lib/validation/fixtures";

const statusLabels = {
  ready: "Ready",
  external: "External",
  "manual-extension": "Manual extension",
} as const;

export default function ProjectValidationPage() {
  const readyCount = validationFixtures.filter((f) => f.status === "ready").length;

  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="border-b border-line-soft bg-paper">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
              <FlaskConical className="h-3.5 w-3.5" aria-hidden />
              Project validation
            </div>
            <h1 className="font-serif text-[30px] leading-tight text-ink">
              Yentl source validation lab
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-3">
              Curated URLs, generated local files, and a repeatable runbook for
              validating every ingest path before calling the UX done.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href={corpusAcceptanceSummary.reportHref}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[13px] font-medium text-ink-2 shadow-sm hover:bg-cream-2"
            >
              Corpus report
              <ExternalLink className="h-4 w-4" aria-hidden />
            </Link>
            <Link
              href="/project/flows"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[13px] font-medium text-ink-2 shadow-sm hover:bg-cream-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Flow atlas
            </Link>
            <Link
              href="/session"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-teal px-3 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-teal-2"
            >
              Open app
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-full max-w-[1440px] gap-5 px-5 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <Metric label="Fixtures" value={validationFixtures.length} />
            <Metric label="Local ready" value={readyCount} />
            <Metric label="Source types" value={new Set(validationFixtures.map((f) => f.sourceType)).size} />
          </div>

          <section className="mb-5 rounded-lg border border-line bg-paper p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                  <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                  Functional samples
                </div>
                <h2 className="font-serif text-[24px] leading-tight text-ink">
                  100-video corpus proof, wired into Watch
                </h2>
                <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-3">
                  The report proves {corpusAcceptanceSummary.videos}/100 videos transcribed, median WER{" "}
                  {corpusAcceptanceSummary.medianWer}, and {corpusAcceptanceSummary.replaySlices} replay
                  slices against the local APIs. These samples open the actual Yentl
                  session UI with replayed transcripts, claims, and markers loaded.
                </p>
              </div>
              <Link
                href={corpusAcceptanceSummary.reportHref}
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
              >
                Open full report
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>

            <div className="mt-4 grid gap-3 xl:grid-cols-3">
              {corpusFunctionalSamples.map((sample) => (
                <article
                  key={sample.id}
                  className="min-w-0 rounded-lg border border-line bg-cream p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-line bg-paper px-2 py-0.5 font-mono text-[10.5px] text-ink-3">
                      {sample.id}
                    </span>
                    <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
                      {sample.status === "review" ? "Review" : "Pass"}
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold leading-snug text-ink">
                    {sample.title}
                  </h3>
                  <p className="mt-1 min-h-14 text-[12.5px] leading-relaxed text-ink-3">
                    {sample.purpose}
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniMetric label="Claims" value={sample.claims} />
                    <MiniMetric label="Markers" value={sample.markers} />
                    <MiniMetric label="Errors" value={sample.errors} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={sample.sessionHref}
                      className="inline-flex items-center justify-center rounded-lg bg-teal px-3 py-2 text-[12px] font-medium text-white hover:bg-teal-2"
                    >
                      Open functional sample
                    </Link>
                    <a
                      href={sample.youtubeUrl}
                      className="inline-flex items-center justify-center gap-1 rounded-lg border border-line bg-paper px-3 py-2 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
                    >
                      Source
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mb-5 rounded-lg border border-line bg-paper p-4 shadow-sm">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
                  <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />
                  Launch canaries
                </div>
                <h2 className="font-serif text-[24px] leading-tight text-ink">
                  External proof still required
                </h2>
                <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-3">
                  Local fixtures prove the core paths. These canaries collect the
                  real-world evidence needed before Yentl can be called launch-ready.
                </p>
              </div>
              <div className="min-w-0 break-all rounded-lg border border-line bg-cream px-3 py-2 font-mono text-[11px] text-ink-3 sm:break-normal">
                npm run release:canary-templates
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-3">
              {launchCanaryProofs.map((canary) => (
                <article
                  key={canary.id}
                  className="min-w-0 rounded-lg border border-line bg-cream p-3"
                >
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-line bg-paper px-2 py-0.5 text-[10.5px] font-semibold text-ink-3">
                      {canary.area}
                    </span>
                    <span className="rounded-full border border-amber/30 bg-amber-soft px-2 py-0.5 text-[10.5px] font-semibold text-amber">
                      Needs real evidence
                    </span>
                  </div>
                  <h3 className="text-[14px] font-semibold leading-snug text-ink">
                    {canary.title}
                  </h3>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
                    {canary.requirement}
                  </p>
                  <dl className="mt-3 space-y-2 text-[11px] leading-relaxed text-ink-3">
                    <CanaryPathList label="Command" values={canary.proofCommands} />
                    {canary.templatePath && (
                      <CanaryPath label="Template" value={canary.templatePath} />
                    )}
                    {canary.manifestPath && (
                      <CanaryPath label="Manifest" value={canary.manifestPath} />
                    )}
                    <CanaryPathList label="Proof" values={canary.proofArtifacts} />
                  </dl>
                  <div className="mt-3 border-t border-line pt-3">
                    <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                      Evidence needed
                    </div>
                    <ul className="mt-2 space-y-1 text-[12px] leading-relaxed text-ink-3">
                      {canary.evidenceNeeded.map((item) => (
                        <li key={item} className="flex gap-2">
                          <span aria-hidden>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="grid min-w-0 gap-3">
            {validationFixtures.map((fixture) => (
              <article
                key={fixture.id}
                className="min-w-0 rounded-lg border border-line bg-paper p-4 shadow-sm"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-line bg-cream px-2 py-0.5 text-[11px] font-semibold text-ink-3">
                        {fixture.sourceType}
                      </span>
                      <span className="rounded-full border border-line bg-cream-2 px-2 py-0.5 text-[11px] font-semibold text-ink-3">
                        {statusLabels[fixture.status]}
                      </span>
                    </div>
                    <h2 className="font-serif text-[22px] leading-tight text-ink">
                      {fixture.title}
                    </h2>
                    <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
                      {fixture.purpose}
                    </p>
                  </div>
                  {fixture.url && (
                    <a
                      href={fixture.url}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[12px] font-medium text-ink-2 hover:bg-cream-2"
                    >
                      Open
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                </div>

                <div className="mt-4 grid min-w-0 gap-2 text-[12.5px] sm:grid-cols-2">
                  <div className="min-w-0 rounded-lg border border-line bg-cream px-3 py-2">
                    <div className="font-semibold text-ink-4">Target</div>
                    <div className="mt-1 break-words text-ink-2">{fixture.primaryTarget}</div>
                  </div>
                  <div className="min-w-0 rounded-lg border border-line bg-cream px-3 py-2">
                    <div className="font-semibold text-ink-4">Expected result</div>
                    <div className="mt-1 break-words text-ink-2">{fixture.expectedResult}</div>
                  </div>
                </div>

                {fixture.localPath && (
                  <div className="mt-3 truncate rounded-lg border border-line bg-cream px-3 py-2 font-mono text-[11px] text-ink-4">
                    {fixture.localPath}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside className="h-fit rounded-lg border border-line bg-paper p-5 shadow-sm lg:sticky lg:top-5">
          <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
            <FileCheck2 className="h-3.5 w-3.5" aria-hidden />
            Runbook
          </div>
          <ol className="space-y-3">
            {validationRunbook.map((item, index) => (
              <li key={item} className="flex gap-3 text-[13px] leading-relaxed text-ink-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal text-[12px] font-semibold text-white">
                  {index + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ol>

          <div className="mt-5 rounded-lg border border-green/20 bg-green-soft p-3 text-[12.5px] leading-relaxed text-green">
            <div className="mb-1 flex items-center gap-2 font-semibold">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Acceptance rule
            </div>
            Do not mark an ingest path done until a fixture above has been run
            through the rendered app and the result has been recorded.
          </div>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-paper p-4 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
        {label}
      </div>
      <div className="mt-1 font-mono text-[28px] font-semibold text-ink">
        {value}
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-paper px-2 py-2">
      <div className="font-mono text-[18px] font-semibold leading-none text-ink">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
        {label}
      </div>
    </div>
  );
}

function CanaryPath({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-semibold text-ink-4">{label}</dt>
      <dd className="mt-0.5 break-all rounded-md border border-line bg-paper px-2 py-1 font-mono text-[10.5px] text-ink-3">
        {value}
      </dd>
    </div>
  );
}

function CanaryPathList({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <dt className="font-semibold text-ink-4">{label}</dt>
      <dd className="mt-0.5 space-y-1">
        {values.map((value) => (
          <div
            key={value}
            className="break-all rounded-md border border-line bg-paper px-2 py-1 font-mono text-[10.5px] text-ink-3"
          >
            {value}
          </div>
        ))}
      </dd>
    </div>
  );
}
