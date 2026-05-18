import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Yentl",
  description: "What Yentl is, how it works, and what it doesn't claim to be.",
};

export default function AboutPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">About Yentl</h1>

      <section aria-labelledby="what-yentl-does">
        <h2 id="what-yentl-does" className="text-xl font-semibold mb-3">
          What Yentl does
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl is a real-time speech analysis tool that listens to live audio, transcribes
          it, and evaluates factual claims, cognitive biases, logical fallacies, and rhetorical
          patterns — with source-backed verdicts. It is designed to support critical thinking
          during talks, debates, and media consumption. It does not record audio to any server,
          and its verdicts are explicitly advisory: AI-generated, potentially incomplete, and
          always subject to your own judgment.
        </p>
      </section>

      <section aria-labelledby="engines-used">
        <h2 id="engines-used" className="text-xl font-semibold mb-3">
          Engines used
        </h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <strong>Deepgram Nova-3</strong> — real-time speech-to-text transcription. Audio
            streams directly from your browser to Deepgram&apos;s API; no audio is stored on
            Yentl&apos;s servers.
          </li>
          <li>
            <strong>Anthropic Claude Opus 4.7</strong> — large-language-model fact-checking,
            bias identification, fallacy detection, and source citation analysis.
          </li>
          <li>
            <strong>Vercel AI Gateway</strong> — API request routing and observability layer
            between the application and upstream AI providers.
          </li>
        </ul>
      </section>

      <section aria-labelledby="taxonomy-source">
        <h2 id="taxonomy-source" className="text-xl font-semibold mb-3">
          Taxonomy source
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The bias and fallacy taxonomy used by Yentl is derived from{" "}
          <em>Cognitive Biases &amp; Logical Fallacies Used by Antisemites</em> by Israel B.
          Bitton (2024), supplemented with additional entries covering general cognitive biases,
          logical fallacies, and rhetorical patterns. The full taxonomy (123 entries) is
          available at <Link href="/taxonomy.json" className="underline">taxonomy.json</Link>.
        </p>
      </section>

      <section aria-labelledby="funding-model">
        <h2 id="funding-model" className="text-xl font-semibold mb-3">
          Funding model
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Self-funded · seeking responsible partners. Yentl does not sell user data.
          No advertising. No third-party data brokers.
        </p>
      </section>

      <section aria-labelledby="known-limitations">
        <h2 id="known-limitations" className="text-xl font-semibold mb-3">
          Known limitations
        </h2>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>
            <strong>AI verdicts may be wrong.</strong> Language models hallucinate, misread
            context, and have knowledge cutoffs. Treat every verdict as a starting point for
            your own inquiry, not a conclusion.
          </li>
          <li>
            <strong>Sources may be incomplete.</strong> Web search coverage varies by topic,
            recency, and language. Absence of a source is not confirmation.
          </li>
          <li>
            <strong>Transcription is imperfect.</strong> Deepgram Nova-3 is highly accurate
            but makes errors — especially with names, technical jargon, accents, and overlapping
            speech. Errors in transcription propagate into fact-check analysis.
          </li>
          <li>
            <strong>Context is limited.</strong> Yentl analyzes individual claims in isolation.
            It does not understand the full arc of a conversation or the speaker&apos;s intent.
          </li>
          <li>
            <strong>Not a legal or professional opinion.</strong> Nothing Yentl produces
            constitutes legal, medical, financial, or other professional advice. See{" "}
            <Link href="/terms" className="underline">Terms of Service</Link>.
          </li>
          <li>
            <strong>Engagement limits.</strong> Yentl declines to adjudicate certain claim
            types (private individuals, harassment vectors, extremism). See{" "}
            <Link href="/methodology" className="underline">Methodology</Link> for the full
            engagement-gate policy.
          </li>
        </ul>
      </section>

      <section aria-labelledby="accessibility">
        <h2 id="accessibility" className="text-xl font-semibold mb-3">
          Accessibility
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          <strong>Target conformance level:</strong> WCAG 2.2 Level AA (required by the
          European Accessibility Act, enforcement date 28 June 2025).
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Current status:</strong> Substantial compliance — skip-to-content navigation,
          focus ring tokens meeting ≥3:1 contrast, 44×44 px touch targets, prefers-reduced-motion
          support, and aria-live transcript regions are implemented as of 2026-05-18. Full
          automated axe-core + Lighthouse audits are run in CI.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Known gaps:</strong> Audio playback controls are not yet implemented (v1 does
          not persist audio). Complex data visualizations (planned for v2) will require
          additional table/chart accessibility work.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Date of last audit:</strong> 2026-05-18.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Contact for accessibility issues:</strong>{" "}
          <a href="/contact" className="underline">contact page</a> or email
          the address listed there. We aim to respond within 5 business days.
        </p>
      </section>
    </main>
  );
}
