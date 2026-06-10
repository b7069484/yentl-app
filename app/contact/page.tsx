import type { Metadata } from "next";
import { PublicInfoPage } from "@/components/public-info-page";
import { contactEmails, mailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Contact — Yentl",
  description: "How to contact Yentl for support, privacy rights, and accessibility issues.",
};

export default function ContactPage() {
  return (
    <PublicInfoPage
      currentPath="/contact"
      eyebrow="Contact"
      title="Contact Yentl"
      description="Support, privacy, and accessibility routes for practical product questions and review requests."
    >
      <section aria-labelledby="support">
        <h2 id="support" className="text-xl font-semibold mb-3">Support</h2>
        <p className="text-muted-foreground leading-relaxed">
          For product questions, source-ingest problems, extension setup, or
          report/export issues, email{" "}
          <a
            href={mailto(contactEmails.support, "Yentl support request")}
            className="underline"
          >
            {contactEmails.support}
          </a>
          . Include the source type you used, the browser/device, and any
          visible error message. Do not email passwords, API keys, or private
          media unless a support follow-up explicitly asks for a minimal
          reproduction.
        </p>
      </section>

      <section aria-labelledby="privacy">
        <h2 id="privacy" className="text-xl font-semibold mb-3">Privacy</h2>
        <p className="text-muted-foreground leading-relaxed">
          For privacy questions, data-rights requests, processor questions, or
          consent/retention concerns, email{" "}
          <a
            href={mailto(contactEmails.privacy, "Yentl privacy request")}
            className="underline"
          >
            {contactEmails.privacy}
          </a>
          . If you are making a legal rights request, include your jurisdiction
          and the request type, such as access, deletion, portability,
          correction, or restriction.
        </p>
      </section>

      <section aria-labelledby="accessibility">
        <h2 id="accessibility" className="text-xl font-semibold mb-3">Accessibility</h2>
        <p className="text-muted-foreground leading-relaxed">
          To report an accessibility barrier or request an accommodation, email{" "}
          <a
            href={mailto(contactEmails.accessibility, "Yentl accessibility issue")}
            className="underline"
          >
            {contactEmails.accessibility}
          </a>
          . Helpful details include the page URL, assistive technology, browser,
          device, and the task that was blocked.
        </p>
      </section>
    </PublicInfoPage>
  );
}
