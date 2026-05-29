import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology — Yentl",
  description: "How Yentl evaluates claims: version, decision tree, reputation tiers, taxonomy, and scope rules.",
};

export default function MethodologyPage() {
  return (
    <main id="main-content" className="mx-auto max-w-2xl px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold">Methodology</h1>

      <section aria-labelledby="version">
        <h2 id="version" className="text-xl font-semibold mb-3">Version</h2>
        <p className="text-muted-foreground">
          <strong>v1</strong> — Initial release. Locked 2026-05-17.
        </p>
      </section>

      <section aria-labelledby="decision-tree">
        <h2 id="decision-tree" className="text-xl font-semibold mb-3">
          Decision tree — how a claim becomes a verdict
        </h2>
        <ol className="space-y-3 text-muted-foreground list-decimal list-inside">
          <li>
            <strong>Transcription</strong> — Yentl converts audio or media into
            transcript text with timestamps. Biometric speaker tagging is
            disabled by default in v1 for privacy compliance.
          </li>
          <li>
            <strong>Claim extraction</strong> — Yentl identifies discrete
            factual claims in the transcript segment. Pure opinions, jokes,
            rhetorical questions, and statements with no checkable proposition
            are not treated as factual verdicts.
          </li>
          <li>
            <strong>Scope screen</strong> — Each claim is checked for whether
            it is appropriate to assess, needs caution, or should be left
            without a factual verdict. See the{" "}
            <Link href="/methodology#scope-rules" className="underline">
              scope rules
            </Link>{" "}
            section below.
          </li>
          <li>
            <strong>Initial check</strong> — Yentl searches for evidence,
            retrieves sources, and evaluates whether those sources support,
            contradict, or complicate the claim while deeper review continues.
          </li>
          <li>
            <strong>Reviewed verdict</strong> — After source reconciliation,
            the visible label becomes <strong>Supported</strong>,{" "}
            <strong>Mixed</strong>, <strong>False</strong>,{" "}
            <strong>No reliable backing</strong>, or <strong>Opinion</strong>.
          </li>
          <li>
            <strong>Bias / fallacy / rhetoric markers</strong> — In parallel,
            Yentl identifies cognitive biases, logical fallacies, and
            rhetorical patterns from the{" "}
            <Link href="/taxonomy.json" className="underline">
              Yentl taxonomy
            </Link>{" "}
            (123 entries, CC-BY-4.0).
          </li>
        </ol>
      </section>

      <section aria-labelledby="reputation-tiers">
        <h2 id="reputation-tiers" className="text-xl font-semibold mb-3">
          Reputation tier definitions
        </h2>
        <dl className="space-y-3 text-muted-foreground">
          <div>
            <dt className="font-semibold text-foreground">High</dt>
            <dd>
              Peer-reviewed journals, major national news organizations with documented
              editorial standards, government statistical agencies, established international
              institutions (WHO, UN bodies, etc.). Strong track record of corrections.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Medium</dt>
            <dd>
              Credible regional outlets, specialized trade publications, think tanks with
              disclosed funding, official organization statements. Some editorial standards
              present; possible institutional bias.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Low</dt>
            <dd>
              Blogs, opinion sites, advocacy organizations without editorial independence,
              sources with documented history of inaccuracy or partisan framing, social media
              posts, anonymous sources.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="marker-taxonomy">
        <h2 id="marker-taxonomy" className="text-xl font-semibold mb-3">
          Marker taxonomy
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          Yentl detects 123 markers across three categories: cognitive biases (55 + 28 extras),
          logical fallacies (25 extras), and rhetorical patterns (15). The full machine-readable
          taxonomy is available at{" "}
          <Link href="/taxonomy.json" className="underline">
            /taxonomy.json
          </Link>{" "}
          (CC-BY-4.0). Primary source:{" "}
          <em>Cognitive Biases &amp; Logical Fallacies Used by Antisemites</em> by Israel B.
          Bitton (2024).
        </p>
      </section>

      <section aria-labelledby="scope-rules">
        <h2 id="scope-rules" className="text-xl font-semibold mb-3">
          Scope rules
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Yentl checks claims when there is a public factual proposition and
          enough context to search for evidence responsibly. In summary:
        </p>
        <dl className="space-y-3 text-muted-foreground">
          <div>
            <dt className="font-semibold text-foreground">Check</dt>
            <dd>Verifiable factual claim about public facts, public figures in their public roles, scientific consensus, or historical record.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Check carefully</dt>
            <dd>Contested empirical matters where reasonable experts disagree; Yentl includes confidence level, named dissenting positions, and extra source requirements.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Treat as opinion or context</dt>
            <dd>Pure opinions, jokes, rhetorical questions, claims with no verifiable proposition.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Do not verdict</dt>
            <dd>Private-individual harassment vectors, doxxing, hate speech, extremist or threatening content, CSAM, defamation-trap setups. Yentl avoids turning these into verdict-like output.</dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="not-fact-checked">
        <h2 id="not-fact-checked" className="text-xl font-semibold mb-3">
          What Yentl doesn&apos;t fact-check
        </h2>
        <p className="text-muted-foreground mb-3">
          Some things sound like factual claims but aren&apos;t, and we
          deliberately skip them:
        </p>
        <ul className="list-disc pl-6 space-y-1 text-muted-foreground">
          <li>
            <span className="font-semibold text-foreground">Satire and jokes</span>
            {" — if it’s obviously not meant literally, we let it pass."}
          </li>
          <li>
            <span className="font-semibold text-foreground">Predictions about the future</span>
            {" — there’s no source of truth to check against."}
          </li>
          <li>
            <span className="font-semibold text-foreground">Opinions and value judgments</span>
            {" — “this is bad” isn’t a claim about reality."}
          </li>
          <li>
            <span className="font-semibold text-foreground">Hypotheticals</span>
            {" — “if X then Y” doesn’t claim X happened."}
          </li>
          <li>
            <span className="font-semibold text-foreground">Personal experience reports</span>
            {" — we can’t verify what someone says happened to them."}
          </li>
        </ul>
        <p className="text-muted-foreground mt-3 text-sm">
          If you think we miscategorized something, flag it via the
          verdict&apos;s dispute link.
        </p>
      </section>

      <section aria-labelledby="prompt-version-log">
        <h2 id="prompt-version-log" className="text-xl font-semibold mb-3">
          Prompt-version log
        </h2>
        <table className="w-full text-sm text-muted-foreground border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 pr-4 font-semibold text-foreground">Version</th>
              <th className="text-left py-2 pr-4 font-semibold text-foreground">Date</th>
              <th className="text-left py-2 font-semibold text-foreground">Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b">
              <td className="py-2 pr-4">v1</td>
              <td className="py-2 pr-4">2026-05-17</td>
              <td className="py-2">Initial claim extraction, fact-check, bias/fallacy/rhetoric detection, and scope-screen prompt set.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
