import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Changelog — Yentl",
  description: "Methodology, prompt, and model changes in Yentl.",
};

export default function ChangelogPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Changelog</h1>
      <p className="text-muted-foreground">
        This page documents methodology changes, prompt updates, and model version changes
        for transparency. It is not a release log for code changes — see{" "}
        <a
          href="https://github.com/project-witness/yentl-app/blob/main/CHANGELOG.md"
          className="underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          CHANGELOG.md
        </a>{" "}
        for that.
      </p>

      <section aria-labelledby="entry-2026-05-17">
        <h2 id="entry-2026-05-17" className="text-xl font-semibold mb-2">
          2026-05-17 · v1 baseline
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          <strong>launch trust layer + accessibility · compliance foundation goal</strong>
        </p>
        <ul className="mt-3 space-y-1 text-muted-foreground list-disc list-inside">
          <li>Initial v1 methodology published (claim extraction → engagement gate → fact-check → verdict).</li>
          <li>Model: Anthropic Claude Opus 4.7 for fact-check; Haiku-class for claim extraction and engagement gate.</li>
          <li>Transcription: Deepgram Nova-3.</li>
          <li>Taxonomy: 123-entry bias/fallacy/rhetoric taxonomy (CC-BY-4.0).</li>
          <li>Engagement gate policy defined; hard refusals: private-individual harassment, doxxing, hate speech, CSAM, extremism.</li>
          <li>Trust pages published: /about, /methodology, /privacy, /terms, /subprocessors, /accessibility.</li>
          <li>WCAG 2.2 AA baseline: skip-to-content, focus rings, 44px touch targets, prefers-reduced-motion, aria-live regions.</li>
          <li>DPIA completed (docs/dpia.md).</li>
          <li>AI-generated content disclosure added to all session views.</li>
        </ul>
      </section>
    </main>
  );
}
