import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, FlaskConical, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing - Yentl",
  description: "Current Yentl pricing posture for the v1 public preview and responsible partner pilots.",
};

const previewFeatures = [
  "Start a source review without an account.",
  "Use browser-local saved sessions, with account sync available when configured.",
  "Export Markdown or JSON snapshots when available in the workspace.",
  "Review AI-generated claims, source cards, and rhetoric markers with visible limitations.",
];

const partnerFeatures = [
  "Deployment planning for organizations that need a controlled review environment.",
  "Privacy, accessibility, and subprocessor review before rollout.",
  "Feedback loop for corpus evaluation, classroom workflows, and evidence presentation.",
];

export default function PricingPage() {
  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto w-full max-w-5xl px-5 py-12">
        <Link
          href="/"
          className="-ml-2 inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-teal hover:text-teal-2"
        >
          Back to home
        </Link>

        <div className="mt-10 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs font-semibold uppercase text-ink-3">
            <FlaskConical className="h-4 w-4 text-teal" aria-hidden />
            Public preview
          </p>
          <h1 className="mt-5 font-serif text-[44px] font-medium leading-[1.08] text-ink sm:text-[58px]">
            Yentl has no published paid plan in v1.
          </h1>
          <p className="mt-5 text-lg leading-8 text-ink-3">
            The current launch posture is guest-first public preview. That means
            the product should not imply a paid tier, team billing, or
            enterprise commitments unless a deployment explicitly enables and
            documents those terms. Account sync is for saved sessions, not a
            paid-plan promise.
          </p>
        </div>

        <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_0.9fr]">
          <section aria-labelledby="preview-plan" className="rounded-lg border border-line bg-paper p-6">
            <div className="flex items-start gap-4">
              <span className="rounded-lg bg-teal-soft p-3 text-teal">
                <ShieldCheck className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 id="preview-plan" className="font-serif text-3xl font-medium text-ink">
                  Free public preview
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-3">
                  Best for trying the product, reviewing a source on one device,
                  and exporting work you want to keep.
                </p>
              </div>
            </div>
            <p className="mt-6 font-serif text-5xl font-medium text-ink">$0</p>
            <p className="mt-1 text-sm text-ink-3">No card. No account required for the v1 guest flow.</p>
            <ul className="mt-6 space-y-3">
              {previewFeatures.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm leading-6 text-ink-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/session"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
            >
              Start checking <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>

          <section aria-labelledby="partner-plan" className="rounded-lg border border-line bg-paper p-6">
            <div className="flex items-start gap-4">
              <span className="rounded-lg border border-amber-2/30 bg-amber-soft p-3 text-ink-2">
                <Building2 className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h2 id="partner-plan" className="font-serif text-3xl font-medium text-ink">
                  Responsible partner pilot
                </h2>
                <p className="mt-2 text-sm leading-6 text-ink-3">
                  For schools, civic groups, researchers, and media-literacy
                  teams that need a more deliberate launch path.
                </p>
              </div>
            </div>
            <p className="mt-6 font-serif text-5xl font-medium text-ink">Contact</p>
            <p className="mt-1 text-sm text-ink-3">Scope, support, and privacy review depend on the pilot.</p>
            <ul className="mt-6 space-y-3">
              {partnerFeatures.map((feature) => (
                <li key={feature} className="flex gap-3 text-sm leading-6 text-ink-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/contact"
              className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-cream px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Contact Yentl <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </section>
        </div>

        <section aria-labelledby="pricing-limits" className="mt-8 rounded-lg border border-line bg-paper p-6">
          <h2 id="pricing-limits" className="text-xl font-semibold text-ink">
            What this page does not promise
          </h2>
          <p className="mt-3 text-sm leading-6 text-ink-3">
            This is not a commitment to unlimited processing, account sync, SLA,
            legal review, custom hosting, or production support. Those features
            need explicit commercial and operational terms before they can be
            advertised as launch-ready.
          </p>
        </section>
      </section>
    </main>
  );
}
