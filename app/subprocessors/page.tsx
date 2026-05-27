import type { Metadata } from "next";
import Link from "next/link";
import { contactEmails, mailto } from "@/lib/contact";

export const metadata: Metadata = {
  title: "Subprocessors — Yentl",
  description: "List of Yentl's data subprocessors with purpose, location, and DPA status.",
};

export default function SubprocessorsPage() {
  const lastUpdated = "2026-05-18";

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Subprocessors</h1>
      <p className="text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
      <p className="text-muted-foreground leading-relaxed">
        Yentl uses the following subprocessors to deliver its service. This list is maintained
        as a transparency measure consistent with GDPR Art. 28(3)(d) and Yentl&apos;s Privacy
        Policy. There are no unnamed third parties with access to personal data.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3 pr-6 font-semibold">Subprocessor</th>
              <th className="text-left py-3 pr-6 font-semibold">Purpose</th>
              <th className="text-left py-3 pr-6 font-semibold">Location</th>
              <th className="text-left py-3 font-semibold">DPA / Transfer mechanism</th>
            </tr>
          </thead>
          <tbody className="text-muted-foreground">
            <tr className="border-b">
              <td className="py-3 pr-6 font-medium text-foreground">Deepgram</td>
              <td className="py-3 pr-6">Audio transcription for live, uploaded, or linked media</td>
              <td className="py-3 pr-6">
                US (default); EU endpoint: api.eu.deepgram.com for EU/EEA traffic
              </td>
              <td className="py-3">
                DPF-certified · SCCs incorporated in Deepgram Enterprise ToS ·{" "}
                <a
                  href="https://deepgram.com/privacy"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </td>
            </tr>
            <tr className="border-b">
              <td className="py-3 pr-6 font-medium text-foreground">Anthropic</td>
              <td className="py-3 pr-6">
                AI fact-check, bias/fallacy analysis, source citation (transcript text,
                request-scoped)
              </td>
              <td className="py-3 pr-6">US</td>
              <td className="py-3">
                DPA + SCCs auto-incorporated in Commercial ToS (effective January 1, 2026) ·{" "}
                <a
                  href="https://www.anthropic.com/privacy"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </td>
            </tr>
            <tr>
              <td className="py-3 pr-6 font-medium text-foreground">Vercel</td>
              <td className="py-3 pr-6">Application hosting and edge routing (Vercel AI Gateway)</td>
              <td className="py-3 pr-6">US / global edge network</td>
              <td className="py-3">
                DPA + SCCs ·{" "}
                <a
                  href="https://vercel.com/legal/privacy-policy"
                  className="underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Privacy Policy
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-sm text-muted-foreground">
        For questions about this list or to request notification of subprocessor changes,
        email{" "}
        <a
          href={mailto(contactEmails.privacy, "Yentl subprocessor question")}
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
    </main>
  );
}
