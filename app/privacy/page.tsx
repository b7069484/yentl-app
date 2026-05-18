import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Yentl",
  description: "How Yentl handles your data: processors, retention, rights, and legal bases.",
};

export default function PrivacyPage() {
  const lastUpdated = "2026-05-18";

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>

      <section aria-labelledby="overview">
        <h2 id="overview" className="text-xl font-semibold mb-3">Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl is a real-time speech analysis tool. This Privacy Policy explains what data
          is processed, by whom, on what legal basis, and what rights you have.{" "}
          <strong>
            In v1, Yentl does not persist audio or transcripts on its own servers.
          </strong>{" "}
          All processing is in-memory and ephemeral.
        </p>
      </section>

      <section aria-labelledby="processors">
        <h2 id="processors" className="text-xl font-semibold mb-3">
          Processors (subprocessors)
        </h2>
        <p className="text-muted-foreground mb-3">
          Yentl uses the following named processors. There are no unnamed third parties:
        </p>
        <ul className="space-y-4 text-muted-foreground">
          <li>
            <strong>Deepgram</strong> — Processes audio for real-time transcription. Audio
            streams from your browser directly to Deepgram&apos;s API. For EU/EEA users,
            Yentl routes traffic to Deepgram&apos;s EU endpoint (api.eu.deepgram.com). Deepgram
            is a US-based processor covered by the EU-US Data Privacy Framework and Standard
            Contractual Clauses (SCCs). See{" "}
            <a
              href="https://deepgram.com/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Deepgram Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Anthropic</strong> — Processes transcript text for fact-checking,
            bias/fallacy analysis, and source citation. Anthropic is a US-based processor.
            Yentl&apos;s use of Anthropic&apos;s commercial API is covered by Anthropic&apos;s
            Data Processing Agreement (DPA) and SCCs (auto-incorporated in Commercial ToS
            since January 1, 2026). See{" "}
            <a
              href="https://www.anthropic.com/privacy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Anthropic Privacy Policy
            </a>
            .
          </li>
          <li>
            <strong>Vercel</strong> — Hosts the Yentl web application and routes API requests
            via Vercel AI Gateway. Vercel operates a global edge network (US/EU/global).
            Vercel maintains a DPA and SCCs for EU data subjects. See{" "}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vercel Privacy Policy
            </a>
            .
          </li>
        </ul>
        <p className="text-muted-foreground mt-3">
          Full subprocessor details are available at{" "}
          <a href="/subprocessors" className="underline">
            /subprocessors
          </a>
          .
        </p>
      </section>

      <section aria-labelledby="lawful-basis">
        <h2 id="lawful-basis" className="text-xl font-semibold mb-3">
          Lawful basis for processing (GDPR)
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          For EU/EEA users, Yentl&apos;s processing is based on:
        </p>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>
            <strong>GDPR Art. 6(1)(a) — Consent</strong>: You give explicit consent before
            any recording begins (via the session consent gate).
          </li>
          <li>
            <strong>GDPR Art. 9(2)(a) — Explicit consent for special-category data</strong>:
            Audio may incidentally contain special-category data (health, political views,
            religion, sexual orientation, ethnicity). Explicit consent is obtained before
            processing begins.
          </li>
        </ul>
        <p className="text-muted-foreground mt-3">
          You may withdraw consent at any time by ending your session. Withdrawal does not
          affect the lawfulness of processing already completed.
        </p>
      </section>

      <section aria-labelledby="retention">
        <h2 id="retention" className="text-xl font-semibold mb-3">
          Data retention
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          <strong>
            No audio or transcripts are persisted on Yentl&apos;s servers in v1; analysis is
            in-memory only.
          </strong>{" "}
          When your browser tab closes or your session ends, session data is gone. Yentl does
          not maintain user accounts, session histories, or server-side logs of session content.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          Deepgram and Anthropic may retain API request data per their own retention policies.
          Refer to their respective privacy policies for details.
        </p>
      </section>

      <section aria-labelledby="cross-border">
        <h2 id="cross-border" className="text-xl font-semibold mb-3">
          Cross-border data transfers
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl uses processors based in the United States. Cross-border transfers are covered
          by:
        </p>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside mt-2">
          <li>
            EU-US Data Privacy Framework (DPF) — where the processor is DPF-certified
            (Deepgram).
          </li>
          <li>
            Standard Contractual Clauses (SCCs) — for all US-based processors (Deepgram,
            Anthropic, Vercel), as incorporated into their respective DPAs.
          </li>
          <li>UK International Data Transfer Agreement (IDTA) — for UK data subjects.</li>
          <li>
            For EU/EEA audio traffic: Deepgram EU endpoint (api.eu.deepgram.com) is used to
            keep audio processing within the EEA where technically feasible.
          </li>
        </ul>
        {/* TODO: legal review needed — confirm TIA complete for all three processors before EU commercial launch */}
      </section>

      <section aria-labelledby="gdpr-rights">
        <h2 id="gdpr-rights" className="text-xl font-semibold mb-3">
          Your rights under GDPR
        </h2>
        <p className="text-muted-foreground mb-3">
          EU/EEA data subjects have the following rights:
        </p>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>
            <strong>Right of access</strong> (Art. 15) — request a copy of personal data held
            about you.
          </li>
          <li>
            <strong>Right to rectification</strong> (Art. 16) — correct inaccurate data.
          </li>
          <li>
            <strong>Right to erasure</strong> (Art. 17) — request deletion of your data
            (&ldquo;right to be forgotten&rdquo;).
          </li>
          <li>
            <strong>Right to data portability</strong> (Art. 20) — receive your data in a
            structured, machine-readable format.
          </li>
          <li>
            <strong>Right to restriction</strong> (Art. 18) — restrict processing in certain
            circumstances.
          </li>
          <li>
            <strong>Right to object</strong> (Art. 21) — object to processing based on
            legitimate interests.
          </li>
          <li>
            <strong>Right to lodge a complaint</strong> — with your national supervisory
            authority (e.g., CNIL in France, ICO in the UK, DPC in Ireland).
          </li>
        </ul>
        <p className="text-muted-foreground mt-3">
          Note: Because Yentl v1 does not persist server-side data, most rights (access,
          erasure, portability) are satisfied by the in-memory-only architecture. To exercise
          rights regarding data held by our processors, contact them directly using the links
          above.
        </p>
      </section>

      <section aria-labelledby="ccpa">
        <h2 id="ccpa" className="text-xl font-semibold mb-3">
          California residents — CCPA notice
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          California residents have rights under the California Consumer Privacy Act (CCPA) as
          amended by the California Privacy Rights Act (CPRA), including the right to know,
          delete, and opt out of the sale of personal information. Yentl does not sell personal
          information. Yentl supports Global Privacy Control (GPC) signals — see{" "}
          <a
            href="https://globalprivacycontrol.org/"
            className="underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            globalprivacycontrol.org
          </a>
          .
        </p>
      </section>

      <section aria-labelledby="quebec">
        <h2 id="quebec" className="text-xl font-semibold mb-3">
          Quebec — Law 25 acknowledgment
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Quebec&apos;s Act respecting the protection of personal information in the private
          sector (Law 25 / Bill 64) applies to processing of Quebec residents&apos; personal
          information. Yentl&apos;s in-memory-only architecture minimizes personal data
          retention consistent with Law 25 data minimization principles.
          {/* TODO: legal review needed — confirm full Law 25 compliance including privacy impact assessment (PIA) requirements before commercial launch in Quebec */}
        </p>
      </section>

      <section aria-labelledby="contact">
        <h2 id="contact" className="text-xl font-semibold mb-3">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          For privacy inquiries, contact us via the{" "}
          <a href="/contact" className="underline">
            contact page
          </a>
          .{/* TODO: replace with actual email address before launch */}
        </p>
      </section>
    </main>
  );
}
