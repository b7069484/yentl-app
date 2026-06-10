import type { Metadata } from "next";
import Link from "next/link";
import { PublicInfoPage } from "@/components/public-info-page";
import { contactEmails, mailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Accessibility Statement — Yentl",
  description: "Yentl's accessibility conformance statement, known gaps, and how to report issues.",
};

export default function AccessibilityPage() {
  const lastAudit = "2026-05-18";

  return (
    <PublicInfoPage
      currentPath="/accessibility"
      eyebrow="Accessibility"
      title="Accessibility Statement"
      description="Yentl's accessibility target, audited-route evidence, known gaps, and reporting path."
      lastUpdated={lastAudit}
    >
      <section aria-labelledby="conformance">
        <h2 id="conformance" className="text-xl font-semibold mb-3">
          Conformance level
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          <strong>Target:</strong> WCAG 2.2 Level AA — required under the European
          Accessibility Act (EAA), enforcement date 28 June 2025.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Current status:</strong> Automated checks on <code>/</code> and{" "}
          <code>/session</code> as of {lastAudit} support the implementation notes below.
          They are not a full-product or manual assistive-technology conformance audit.
        </p>
        <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
          <li>
            <strong>1.4.1 Use of Color</strong> — Verdict states use color stripe + icon +
            text label (triple-encoded). Color is not the sole means of conveying information.
          </li>
          <li>
            <strong>1.4.3 Contrast (Minimum)</strong> — Text contrast checks passed on the
            audited routes for primary content; large text checks use the 3:1 threshold.
          </li>
          <li>
            <strong>1.4.4 Resize Text</strong> — The audited routes did not show blocking
            layout breakage at 200% zoom.
          </li>
          <li>
            <strong>2.1.1 Keyboard</strong> — Interactive elements on the audited routes are
            intended to be keyboard-accessible, with tab order following visual order.
          </li>
          <li>
            <strong>2.4.3 Focus Order</strong> — Skip-to-content link is first in tab order,
            anchors to #main-content.
          </li>
          <li>
            <strong>2.4.7 Focus Visible</strong> — Focus ring token (--ring) has ≥3:1 contrast
            against page background and common element backgrounds.
          </li>
          <li>
            <strong>2.5.5 Target Size</strong> — Primary interactive targets are designed for
            at least 44×44 CSS px.
          </li>
          <li>
            <strong>3.2.3 Consistent Navigation</strong> — Navigation structure is intended to
            stay consistent across public pages.
          </li>
          <li>
            <strong>3.3.1 Error Identification</strong> — Form errors in the checked report
            flow are identified and described to users.
          </li>
        </ul>
      </section>

      <section aria-labelledby="motion">
        <h2 id="motion" className="text-xl font-semibold mb-3">
          Motion &amp; animation
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Animated elements (recording beacon pulse, toast entrances) respect the{" "}
          <code>prefers-reduced-motion</code> media query via Tailwind&apos;s{" "}
          <code>motion-reduce:</code> variants. Enabling reduced motion in your OS settings
          disables or shortens the affected animations.
        </p>
      </section>

      <section aria-labelledby="known-gaps">
        <h2 id="known-gaps" className="text-xl font-semibold mb-3">
          Known limitations
        </h2>
        <ul className="space-y-2 text-muted-foreground list-disc list-inside">
          <li>
            <strong>Audio playback controls</strong> — Not applicable in v1 (audio is not
            persisted). When audio playback is added in a future version, accessible controls
            will be required.
          </li>
          <li>
            <strong>Complex data visualizations</strong> — Planned for v2. Will require
            accessible tables and chart alternatives.
          </li>
          <li>
            <strong>Screen reader testing</strong> — Automated axe-core audits are clean as
            of {lastAudit} for the audited routes. Manual screen reader testing (VoiceOver,
            NVDA) is planned before commercial launch.
          </li>
        </ul>
      </section>

      <section aria-labelledby="audit-info">
        <h2 id="audit-info" className="text-xl font-semibold mb-3">
          Audit information
        </h2>
        <p className="text-muted-foreground">
          <strong>Date of last automated audit:</strong> {lastAudit}
        </p>
        <p className="text-muted-foreground mt-1">
          <strong>Tools used:</strong> axe-core CLI, Lighthouse (accessibility category).
        </p>
        <p className="text-muted-foreground mt-1">
          Audits documented here ran on: <code>/</code> (home) and <code>/session</code>.
        </p>
      </section>

      <section aria-labelledby="contact-a11y">
        <h2 id="contact-a11y" className="text-xl font-semibold mb-3">
          Report an accessibility issue
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          If you encounter an accessibility barrier or have a specific accommodation request,
          email{" "}
          <a
            href={mailto(contactEmails.accessibility, "Yentl accessibility issue")}
            className="underline"
          >
            {contactEmails.accessibility}
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
