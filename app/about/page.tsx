import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";

export const metadata: Metadata = {
  title: "About — Yentl",
  description: "What Yentl is, how it works, and what it doesn't claim to be.",
};

export default function AboutPage() {
  return (
    <PublicInfoPage
      currentPath="/about"
      eyebrow="About"
      title="About Yentl"
      description="What Yentl is, what it checks, what it stores locally, and what it does not claim to be."
    >
      <section aria-labelledby="what-yentl-does">
        <h2 id="what-yentl-does" className="text-xl font-semibold mb-3">
          What Yentl does
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl checks what is being said. It can work from a live tab,
          microphone audio, uploaded media, a YouTube link, a media URL, or
          pasted text, then keeps the source, transcript, claims, evidence, and
          rhetoric markers together. It is designed to support critical thinking
          during talks, debates, classes, and media consumption. Its verdicts are
          advisory: AI-generated, potentially incomplete, and always subject to
          your own judgment.
        </p>
      </section>

      <section aria-labelledby="account-saves">
        <h2 id="account-saves" className="text-xl font-semibold mb-3">
          Accounts and saved sessions
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          The current v1 experience is guest-first. Saved sessions are stored
          in this browser first so guests can return to work on the same
          device. Deployments with Clerk and the Yentl database configured can
          also sync saved sessions to a signed-in account for restore, rename,
          delete, and export on another device.
        </p>
      </section>

      <section aria-labelledby="engines-used">
        <h2 id="engines-used" className="text-xl font-semibold mb-3">
          Processing services
        </h2>
        <ul className="space-y-2 text-muted-foreground">
          <li>
            <strong>Deepgram</strong> — speech-to-text transcription for live
            audio and uploaded or linked media.
          </li>
          <li>
            <strong>Anthropic</strong> — claim checking, bias identification,
            fallacy detection, and source citation analysis from transcript
            text.
          </li>
          <li>
            <strong>Vercel</strong> — application hosting, API routing, and
            temporary server processing needed to run the app.
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
          Self-funded; seeking responsible partners. Yentl does not sell user
          data. No advertising. No third-party data brokers. See{" "}
          <Link href="/pricing" className="underline">Pricing</Link> for the
          current public-preview posture.
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
            <strong>Scope limits.</strong> Yentl declines to adjudicate certain claim
            types (private individuals, harassment vectors, extremism). See{" "}
            <Link href="/methodology" className="underline">Methodology</Link> for the full
            scope policy.
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
          <strong>Current status:</strong> Automated checks on <code>/</code> and{" "}
          <code>/session</code> as of 2026-05-18 support the documented implementation work:
          skip-to-content navigation, focus ring tokens, mobile-sized primary touch targets,
          prefers-reduced-motion support, and aria-live transcript regions. This is not a
          full-product or manual assistive-technology conformance claim.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Known gaps:</strong> Audio playback controls are not yet implemented (v1 does
          not save replayable audio in the local library). Complex data visualizations will require
          additional table/chart accessibility work.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Date of last documented audit:</strong> 2026-05-18. The CI workflow defines
          an axe-core audit step that runs when <code>RUN_A11Y_AUDIT</code> is enabled.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Contact for accessibility issues:</strong>{" "}
          <Link href="/contact" className="underline">Use the accessibility contact</Link>{" "}
          for barriers, assistive-technology bugs, or accommodation requests.
        </p>
      </section>
    </PublicInfoPage>
  );
}
