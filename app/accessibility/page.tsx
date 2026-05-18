import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Accessibility Statement — Yentl",
  description: "Yentl's accessibility conformance statement, known gaps, and how to report issues.",
};

export default function AccessibilityPage() {
  const lastAudit = "2026-05-18";

  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Accessibility Statement</h1>

      <section aria-labelledby="conformance">
        <h2 id="conformance" className="text-xl font-semibold mb-3">
          Conformance level
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          <strong>Target:</strong> WCAG 2.2 Level AA — required under the European
          Accessibility Act (EAA), enforcement date 28 June 2025.
        </p>
        <p className="text-muted-foreground leading-relaxed mt-2">
          <strong>Current status:</strong> Substantial conformance as of {lastAudit}. The
          following WCAG 2.2 AA success criteria are implemented and audited:
        </p>
        <ul className="mt-2 space-y-1 text-muted-foreground list-disc list-inside">
          <li>
            <strong>1.4.1 Use of Color</strong> — Verdict states use color stripe + icon +
            text label (triple-encoded). Color is not the sole means of conveying information.
          </li>
          <li>
            <strong>1.4.3 Contrast (Minimum)</strong> — Text contrast ≥4.5:1 verified for
            primary content; large text ≥3:1.
          </li>
          <li>
            <strong>1.4.4 Resize Text</strong> — No content breaks at 200% zoom.
          </li>
          <li>
            <strong>2.1.1 Keyboard</strong> — All interactive elements keyboard-accessible.
            Tab order follows visual order.
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
            <strong>2.5.5 Target Size</strong> — All interactive targets ≥44×44 CSS px.
          </li>
          <li>
            <strong>3.2.3 Consistent Navigation</strong> — Navigation structure consistent
            across pages.
          </li>
          <li>
            <strong>3.3.1 Error Identification</strong> — Form errors (ReportFlow) are
            identified and described to users.
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
          will disable or shorten all animations in Yentl.
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
            of {lastAudit}. Manual screen reader testing (VoiceOver, NVDA) is planned before
            commercial launch.
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
          Audits run on: <code>/</code> (home) and <code>/session</code>.
        </p>
      </section>

      <section aria-labelledby="contact-a11y">
        <h2 id="contact-a11y" className="text-xl font-semibold mb-3">
          Report an accessibility issue
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          If you encounter an accessibility barrier or have a specific accommodation request,
          contact us via the{" "}
          <a href="/contact" className="underline">
            contact page
          </a>
          . We aim to respond within 5 business days and to remediate critical barriers within
          30 days.
        </p>
      </section>
    </main>
  );
}
