import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";
import { contactEmails, mailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Privacy Policy — Yentl",
  description: "How Yentl handles your data: processors, retention, rights, and legal bases.",
};

export default function PrivacyPage() {
  const lastUpdated = "2026-05-18";

  return (
    <PublicInfoPage
      currentPath="/privacy"
      eyebrow="Privacy"
      title="Privacy Policy"
      description="How Yentl handles source material, saved sessions, processors, retention, and data-rights requests."
      lastUpdated={lastUpdated}
    >
      <section aria-labelledby="overview">
        <h2 id="overview" className="text-xl font-semibold mb-3">Overview</h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl is a source-anchored speech and media analysis tool. This
          Privacy Policy explains what data is processed, by whom, on what
          legal basis, and what rights you have.{" "}
          <strong>
            In v1, Yentl is guest-first and saves sessions locally in your
            browser first. If you sign in on a deployment with account sync
            configured, saved sessions can also be stored in Yentl&apos;s database
            so they can be restored on another device.
          </strong>{" "}
          API requests may temporarily process audio, media, transcript text,
          claims, sources, and analysis so the app can work.
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
            <strong>Deepgram</strong> — Processes audio for transcription,
            including live audio and uploaded or linked media. For EU/EEA
            users, Yentl routes traffic to Deepgram&apos;s EU endpoint
            (api.eu.deepgram.com) where technically feasible. Deepgram
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
            via Vercel AI Gateway. Vercel may also temporarily handle uploaded
            media or media URLs during transcription workflows. Vercel operates
            a global edge network (US/EU/global).
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
          <li>
            <strong>Clerk</strong> — Provides authentication and account identity
            when sign-in is enabled for a deployment. Clerk may process account
            identifiers, email addresses, session cookies, and related metadata.
            Guest use does not require a Clerk account.
          </li>
          <li>
            <strong>Neon</strong> — Provides the Postgres database used for
            account-synced saved sessions when the cloud backend is configured.
            Synced records include serialized session data, source metadata,
            timestamps, and the saved-session display name.
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
            Saved sessions are local-first.
          </strong>{" "}
          If you use the Save button, the session snapshot is stored in this
          browser&apos;s IndexedDB so it can appear in the saved sessions library.
          Clearing site data, changing browsers, or using another device can
          remove or hide browser-local saves. If you are signed in and account
          sync is configured, Yentl also stores the serialized session, source
          metadata, timestamps, and display name in its database so the session
          can be listed, restored, renamed, deleted, and exported from another
          device.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          Yentl server routes may temporarily process media, transcript text,
          and analysis while a request runs. Deepgram, Anthropic, Vercel, and
          Clerk, Neon, and any deployment-specific provider may retain API
          request, account, or database metadata per their own retention
          policies. Refer to their respective privacy policies for details.
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
            Standard Contractual Clauses (SCCs) — for US-based processors and
            deployment-specific auth/database providers where incorporated into
            their respective agreements.
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
          Note: Because Yentl v1 session saves are local to your browser, most
          saved-session access, erasure, and portability actions are handled by
          your local library, exports, or browser site-data controls. To
          exercise rights regarding request metadata or processor-handled data,
          email{" "}
          <a
            href={mailto(contactEmails.privacy, "Yentl privacy rights request")}
            className="underline"
          >
            {contactEmails.privacy}
          </a>
          .
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
          information. Yentl&apos;s guest-first, local-first save model minimizes
          account-backed personal data retention unless the user signs in and
          uses account sync, consistent with Law 25 data minimization principles.
          {/* TODO: legal review needed — confirm full Law 25 compliance including privacy impact assessment (PIA) requirements before commercial launch in Quebec */}
        </p>
      </section>

      <section aria-labelledby="contact">
        <h2 id="contact" className="text-xl font-semibold mb-3">Contact</h2>
        <p className="text-muted-foreground leading-relaxed">
          For privacy questions, data-rights requests, processor questions, or
          consent and retention concerns, email{" "}
          <a
            href={mailto(contactEmails.privacy, "Yentl privacy request")}
            className="underline"
          >
            {contactEmails.privacy}
          </a>{" "}
          or use the{" "}
          <Link href="/contact" className="underline">
            contact page
          </Link>
          .
        </p>
      </section>
    </PublicInfoPage>
  );
}
