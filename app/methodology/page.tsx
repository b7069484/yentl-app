import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Methodology — Yentl",
  description: "How Yentl evaluates claims: version, decision tree, reputation tiers, taxonomy, engagement rules.",
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
            <strong>Transcription</strong> — Deepgram Nova-3 converts live microphone audio
            to text in near-real-time (word-level timestamps, speaker tagging disabled in v1 for biometric-privacy compliance).
          </li>
          <li>
            <strong>Claim extraction</strong> — An Anthropic Claude model (Haiku-class)
            identifies discrete factual claims in the transcript segment. Claims that are pure
            opinions, jokes, rhetorical questions, or contain no verifiable proposition are
            not forwarded for fact-check.
          </li>
          <li>
            <strong>Engagement gate</strong> — Each claim passes through a classifier that
            determines whether Yentl should <em>engage</em>, <em>engage cautiously</em>,
            <em>decline</em>, or <em>refuse silently</em>. See the{" "}
            <Link href="/methodology#engagement-gate-rules" className="underline">
              engagement-gate rules
            </Link>{" "}
            section below and the full policy specification at{" "}
            <Link href="/docs/engagement-gate" className="underline">
              docs/engagement-gate.md
            </Link>.
          </li>
          <li>
            <strong>Provisional fact-check</strong> — Claude Opus performs a web-search-backed
            analysis, retrieving sources and evaluating their stance (supports / contradicts /
            mixed). A provisional verdict is issued while deeper verification runs in the
            background.
          </li>
          <li>
            <strong>Confirmed fact-check</strong> — After source reconciliation, a final
            verdict is issued: <strong>TRUE</strong>, <strong>FALSE</strong>,{" "}
            <strong>MIXED</strong>, or <strong>UNVERIFIED</strong>.
          </li>
          <li>
            <strong>Bias / fallacy / rhetoric markers</strong> — In parallel, Claude identifies
            cognitive biases, logical fallacies, and rhetorical patterns from the{" "}
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

      <section aria-labelledby="engagement-gate-rules">
        <h2 id="engagement-gate-rules" className="text-xl font-semibold mb-3">
          Decline-to-engage rules
        </h2>
        <p className="text-muted-foreground leading-relaxed mb-3">
          Yentl applies an engagement-gate classifier to every claim before running
          fact-checking. The full policy specification is at{" "}
          <Link href="/docs/engagement-gate" className="underline">
            docs/engagement-gate.md
          </Link>. In summary:
        </p>
        <dl className="space-y-3 text-muted-foreground">
          <div>
            <dt className="font-semibold text-foreground">Engage</dt>
            <dd>Verifiable factual claim about public facts, public figures in their public roles, scientific consensus, or historical record.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Engage cautiously</dt>
            <dd>Contested empirical matters where reasonable experts disagree; Yentl includes confidence level, named dissenting positions, and extra source requirements.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Decline</dt>
            <dd>Pure opinions, jokes, rhetorical questions, claims with no verifiable proposition.</dd>
          </div>
          <div>
            <dt className="font-semibold text-foreground">Refuse (silent)</dt>
            <dd>Private-individual harassment vectors, doxxing, hate speech, extremist or threatening content, CSAM, defamation-trap setups. Yentl silently drops these without generating a verdict or error message.</dd>
          </div>
        </dl>
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
              <td className="py-2">Initial prompt set. Claim extraction, fact-check, bias/fallacy/rhetoric detection. Claude Opus 4.7.</td>
            </tr>
          </tbody>
        </table>
      </section>
    </main>
  );
}
