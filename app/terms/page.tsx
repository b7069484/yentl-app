import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Yentl",
  description: "Yentl's terms of service: informational use only, no warranty, 18+, California law.",
};

export default function TermsPage() {
  const lastUpdated = "2026-05-18";

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

      <div
        className="rounded-lg border border-amber-300 bg-amber-50 px-5 py-4 text-amber-900"
        role="note"
        aria-label="Important disclaimer"
      >
        <p className="font-semibold text-lg mb-1">Informational use only — not advice.</p>
        <p className="text-sm leading-relaxed">
          Yentl provides AI-generated analysis for informational purposes only. Nothing
          produced by Yentl constitutes legal, medical, financial, journalistic, or any other
          professional advice. Verdicts may be wrong. Sources may be incomplete. Use your
          judgment. Consult qualified professionals for decisions that matter.
        </p>
      </div>

      <section aria-labelledby="eligibility">
        <h2 id="eligibility" className="text-xl font-semibold mb-3">Eligibility — 18+</h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl is intended for users who are 18 years of age or older. By using Yentl, you
          represent and warrant that you are at least 18 years old. If you are under 18, do
          not use Yentl. This restriction exists because Yentl processes audio that may contain
          sensitive content, and because Yentl&apos;s AI verdicts require adult judgment to
          interpret appropriately.
        </p>
      </section>

      <section aria-labelledby="methodology">
        <h2 id="methodology" className="text-xl font-semibold mb-3">Methodology</h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl&apos;s verdict process is documented at{" "}
          <Link href="/methodology" className="underline">
            /methodology
          </Link>
          . The methodology is public and versioned. Prompt and model changes are logged in
          the{" "}
          <Link href="/changelog" className="underline">
            Changelog
          </Link>
          .
        </p>
      </section>

      <section aria-labelledby="no-warranty">
        <h2 id="no-warranty" className="text-xl font-semibold mb-3">
          No warranty — AI may be wrong
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty
          of any kind, express or implied, including but not limited to warranties of
          merchantability, fitness for a particular purpose, and non-infringement. Yentl does
          not warrant that:
        </p>
        <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
          <li>Verdicts are accurate, complete, or current.</li>
          <li>Sources cited are authoritative or unbiased.</li>
          <li>The service will be uninterrupted or error-free.</li>
          <li>AI output is free from hallucinations, omissions, or errors.</li>
        </ul>
        <p className="text-muted-foreground leading-relaxed mt-3">
          To the maximum extent permitted by law, Yentl&apos;s liability for any claim arising
          from use of the service is limited to the amount you paid for the service in the
          preceding 12 months (which, for a free service, is $0).
        </p>
      </section>

      <section aria-labelledby="user-obligations">
        <h2 id="user-obligations" className="text-xl font-semibold mb-3">
          User obligations
        </h2>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>
            <strong>Lawful use.</strong> You agree to use Yentl only for lawful purposes and
            in accordance with these Terms.
          </li>
          <li>
            <strong>Recording consent.</strong> You are responsible for complying with
            applicable laws on recording consent in your jurisdiction. In two-party consent
            states and countries, you must obtain consent from all parties before recording.
          </li>
          <li>
            <strong>No automated abuse.</strong> You may not use Yentl via automated scripts,
            bots, or scrapers. You may not attempt to overload, probe, or circumvent any
            security or rate-limiting measures.
          </li>
          <li>
            <strong>No circumvention.</strong> You may not attempt to bypass the
            scope and safety policy or extract refused verdicts by rephrasing prohibited
            content.
          </li>
          <li>
            <strong>No redistribution of verdicts as authoritative.</strong> AI-generated
            verdicts from Yentl must not be presented as definitive fact-checks by journalists,
            broadcasters, or other publishers without independent verification.
          </li>
        </ul>
      </section>

      <section aria-labelledby="choice-of-law">
        <h2 id="choice-of-law" className="text-xl font-semibold mb-3">
          Choice of law &amp; anti-SLAPP
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          These Terms are governed by the laws of the State of California, without regard to
          its conflict of law provisions. California is chosen in part because of its strong
          anti-SLAPP statute (Code of Civil Procedure § 425.16), which provides meaningful
          protection against strategic lawsuits aimed at silencing public-interest speech and
          fact-checking activity.
        </p>
      </section>

      <section aria-labelledby="dispute-resolution">
        <h2 id="dispute-resolution" className="text-xl font-semibold mb-3">
          Dispute resolution
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Any dispute arising from these Terms or your use of Yentl will be resolved through
          binding individual arbitration under the rules of the American Arbitration Association
          (AAA), except that either party may seek injunctive relief in court. Class action
          waivers apply to the maximum extent permitted by applicable law.
        </p>
      </section>

      <section aria-labelledby="changes">
        <h2 id="changes" className="text-xl font-semibold mb-3">Changes to these Terms</h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl may update these Terms from time to time. Material changes will be announced
          in the{" "}
          <Link href="/changelog" className="underline">
            Changelog
          </Link>
          . Continued use of Yentl after changes constitutes acceptance of the updated Terms.
        </p>
      </section>
    </main>
  );
}
