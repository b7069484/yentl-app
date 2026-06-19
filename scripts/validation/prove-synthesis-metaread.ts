#!/usr/bin/env tsx
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { SynthesizeRequest, type SpeakerVerdict, type SynthesisMetaRead } from "@/lib/prompts/synthesize";
import {
  assessSynthesisMetaReadQuality,
  buildSynthesisMetaRead,
  sanitizeSynthesisMetaRead,
  type SynthesisMetaReadInput,
} from "@/lib/synthesis-meta-read";

const ROOT = process.cwd();
const REPORT_PATH = join(ROOT, "docs/superpowers/validation/synthesis-metaread-proof.json");

type ExpectedMetaRead = Partial<Pick<SynthesisMetaRead, "posture" | "source_health" | "scope">> & {
  summaryIncludes?: string[];
  uncertaintyIncludes?: string[];
  keyQuestionIncludes?: string[];
};

type CaseDefinition = {
  id: string;
  description: string;
  input: SynthesisMetaReadInput;
  verdicts: SpeakerVerdict[];
  expected: ExpectedMetaRead;
};

const CASES: CaseDefinition[] = [
  {
    id: "thin-live-window",
    description: "A live window with no clean claims or source context must stay explicitly insufficient.",
    input: request({
      utterances: [{ speaker_id: null, text: "We are still setting up the topic.", start: 0, end: 3 }],
      counters: { claims: 0, false: 0, partial: 0, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
      speakers: [],
      source_context: "",
      analysis_scope: { mode: "live_window", total_utterances: 1, included_utterances: 1 },
    }),
    verdicts: [],
    expected: {
      posture: "insufficient",
      source_health: "unknown",
      scope: "live_window",
      uncertaintyIncludes: ["source context is thin"],
      keyQuestionIncludes: ["first clean owned claim"],
    },
  },
  {
    id: "good-faith-full-session-strong-sources",
    description: "A full-session read with multiple clean source-backed claims should allow a strong good-faith read.",
    input: request({
      utterances: [
        { speaker_id: 0, text: "The audit was published Friday.", start: 0, end: 3 },
        { speaker_id: 0, text: "The release log was also posted that day.", start: 4, end: 7 },
      ],
      counters: { claims: 2, false: 0, partial: 0, true: 2, fallacy: 0, bias: 0, rhetoric: 0 },
      speakers: [{ id: 0, label: "Mira" }],
      claims: [
        cleanClaim("The audit was published Friday.", "TRUE"),
        cleanClaim("The release log was posted Friday.", "MOSTLY_TRUE"),
      ],
      source_context: "source type: article\nsource: city.gov audit archive\nsource: release log with dated publication record",
      analysis_scope: { mode: "full_session", total_utterances: 2, included_utterances: 2 },
    }),
    verdicts: [
      {
        speaker_id: 0,
        label: "Mira",
        factual_grade: "mostly_factual",
        faith_grade: "good_faith",
        one_liner: "Claims stay close to the record.",
      },
    ],
    expected: {
      posture: "good_faith",
      source_health: "strong",
      scope: "full_session",
      summaryIncludes: ["full session"],
      uncertaintyIncludes: ["later context"],
    },
  },
  {
    id: "bad-faith-risk-pattern",
    description: "A repeated bad-faith verdict with multiple markers should surface risk without claiming final intent.",
    input: request({
      utterances: [
        { speaker_id: 1, text: "The budget doubled and the clerk hid the file.", start: 0, end: 6 },
        { speaker_id: 1, text: "Everyone defending the audit is lying.", start: 7, end: 10 },
      ],
      counters: { claims: 2, false: 2, partial: 0, true: 0, fallacy: 1, bias: 0, rhetoric: 2 },
      speakers: [{ id: 1, label: "Jon" }],
      claims: [
        cleanClaim("The budget doubled.", "FALSE", 1),
        cleanClaim("The clerk hid the file.", "MISLEADING", 1),
      ],
      source_context: "source type: public record\nsource: published budget ledger and audit archive",
      analysis_scope: { mode: "full_session", total_utterances: 2, included_utterances: 2 },
    }),
    verdicts: [
      {
        speaker_id: 1,
        label: "Jon",
        factual_grade: "mostly_inaccurate",
        faith_grade: "bad_faith",
        one_liner: "Repeated contradicted claims and hostile framing.",
      },
    ],
    expected: {
      posture: "bad_faith_risk",
      source_health: "strong",
      scope: "full_session",
      summaryIncludes: ["pattern"],
      keyQuestionIncludes: ["contradicted claim"],
    },
  },
  {
    id: "quoted-reported-uncertainty",
    description: "Quoted/reported claims should not become clean owned claims for the meta-view.",
    input: request({
      utterances: [
        { speaker_id: 0, text: "The article quotes a witness saying the file vanished.", start: 0, end: 4 },
        { speaker_id: 0, text: "Another person reportedly questioned the release date.", start: 5, end: 8 },
      ],
      counters: { claims: 2, false: 1, partial: 1, true: 0, fallacy: 0, bias: 0, rhetoric: 0 },
      speakers: [{ id: 0, label: "Reporter" }],
      claims: [
        cleanClaim("The file vanished.", "FALSE", 0, { stance: "quoted", attribution_status: "quote_or_clip" }),
        cleanClaim("The release date was questioned.", "PARTIAL", 0, { stance: "reported", attribution_status: "uncertain" }),
      ],
      source_context: "",
      analysis_scope: { mode: "live_window", total_utterances: 2, included_utterances: 2 },
    }),
    verdicts: [],
    expected: {
      posture: "insufficient",
      source_health: "unknown",
      scope: "live_window",
      uncertaintyIncludes: ["2 claims have uncertain ownership or stance", "source context is thin"],
      keyQuestionIncludes: ["first clean owned claim"],
    },
  },
  {
    id: "mixed-full-session-partial-evidence",
    description: "A full-session read with source context and partial evidence should stay mixed.",
    input: request({
      utterances: [
        { speaker_id: 0, text: "The city published the audit, but the budget summary is incomplete.", start: 0, end: 6 },
        { speaker_id: 1, text: "The hearing date was moved after the archive update.", start: 7, end: 11 },
      ],
      counters: { claims: 2, false: 0, partial: 1, true: 1, fallacy: 0, bias: 0, rhetoric: 1 },
      speakers: [{ id: 0, label: "Mira" }, { id: 1, label: "Jon" }],
      claims: [
        cleanClaim("The city published the audit.", "TRUE", 0),
        cleanClaim("The budget summary is incomplete.", "PARTIAL", 1),
      ],
      source_context: "source type: document\nsource: audit archive and partial budget summary",
      analysis_scope: { mode: "full_session", total_utterances: 2, included_utterances: 2 },
    }),
    verdicts: [
      {
        speaker_id: 0,
        label: "Mira",
        factual_grade: "mixed",
        faith_grade: "mixed",
        one_liner: "Evidence points in different directions.",
      },
    ],
    expected: {
      posture: "mixed",
      source_health: "mixed",
      scope: "full_session",
      uncertaintyIncludes: ["partial or qualified"],
    },
  },
];

async function main() {
  const caseChecks = CASES.map(runCase);
  const sanitizerCheck = proveSanitizerDowngrade();
  const checks = [...caseChecks, sanitizerCheck];
  const failures = checks.filter((check) => !check.ok);
  const report = {
    ok: failures.length === 0,
    generated_at: new Date().toISOString(),
    proof: "synthesis-metaread",
    case_count: CASES.length,
    checks,
    failures: failures.map(({ name, error }) => ({ name, error })),
  };

  await mkdir(dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

  if (!report.ok) {
    throw new Error(`Synthesis meta-read proof failed. Report: ${REPORT_PATH}`);
  }

  console.log(JSON.stringify(report, null, 2));
}

function runCase(definition: CaseDefinition) {
  try {
    const metaRead = buildSynthesisMetaRead(definition.input, definition.verdicts);
    assertExpectedMeta(definition.id, metaRead, definition.expected);
    const quality = assessSynthesisMetaReadQuality(metaRead, definition.input, definition.verdicts);
    assert(quality.ok, `${definition.id}: quality mismatches ${JSON.stringify(quality.mismatches)}`);
    return {
      name: definition.id,
      ok: true,
      description: definition.description,
      meta_read: metaRead,
      quality,
    };
  } catch (error) {
    return {
      name: definition.id,
      ok: false,
      description: definition.description,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function proveSanitizerDowngrade() {
  const input = CASES[0].input;
  const rawMetaRead: SynthesisMetaRead = {
    posture: "good_faith",
    source_health: "strong",
    scope: "full_session",
    summary: "",
    uncertainty: "",
    key_question: "",
  };
  const rawQuality = assessSynthesisMetaReadQuality(rawMetaRead, input);
  const sanitized = sanitizeSynthesisMetaRead(rawMetaRead, input);
  const sanitizedQuality = assessSynthesisMetaReadQuality(sanitized, input);

  try {
    assert(!rawQuality.ok, "raw overconfident meta-read should fail quality assessment");
    assert(rawQuality.score < 100, "raw overconfident meta-read should lose quality points");
    assert(sanitized.posture === "insufficient", "sanitizer should downgrade overconfident posture when evidence is insufficient");
    assert(sanitized.source_health === "unknown", "sanitizer should downgrade source health to unknown without source context or clean claims");
    assert(sanitized.scope === "live_window", "sanitizer should force request scope");
    assert(sanitized.summary.length > 0, "sanitizer should fill blank summary");
    assert(sanitized.uncertainty.length > 0, "sanitizer should fill blank uncertainty");
    assert(sanitized.key_question.length > 0, "sanitizer should fill blank key question");
    assert(sanitizedQuality.ok, `sanitized meta-read should pass quality assessment: ${JSON.stringify(sanitizedQuality.mismatches)}`);
    return {
      name: "sanitize-overconfident-source-health",
      ok: true,
      raw_meta_read: rawMetaRead,
      raw_quality: rawQuality,
      meta_read: sanitized,
      quality: sanitizedQuality,
    };
  } catch (error) {
    return {
      name: "sanitize-overconfident-source-health",
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      raw_meta_read: rawMetaRead,
      raw_quality: rawQuality,
      meta_read: sanitized,
      quality: sanitizedQuality,
    };
  }
}

function request(input: Parameters<typeof SynthesizeRequest.parse>[0]): SynthesisMetaReadInput {
  return SynthesizeRequest.parse(input);
}

function cleanClaim(
  text: string,
  verdict: string,
  speakerId = 0,
  overrides: Partial<SynthesisMetaReadInput["claims"][number]> = {},
): SynthesisMetaReadInput["claims"][number] {
  return {
    text,
    verdict,
    score: 90,
    speaker_id: speakerId,
    topic: "Law",
    stance: "asserted",
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    explanation: "Corpus-style controlled claim.",
    ...overrides,
  };
}

function assertExpectedMeta(id: string, actual: SynthesisMetaRead, expected: ExpectedMetaRead) {
  if (expected.posture) assert(actual.posture === expected.posture, `${id}: posture ${actual.posture} !== ${expected.posture}`);
  if (expected.source_health) {
    assert(actual.source_health === expected.source_health, `${id}: source_health ${actual.source_health} !== ${expected.source_health}`);
  }
  if (expected.scope) assert(actual.scope === expected.scope, `${id}: scope ${actual.scope} !== ${expected.scope}`);
  for (const text of expected.summaryIncludes ?? []) {
    assert(actual.summary.includes(text), `${id}: summary missing ${JSON.stringify(text)}`);
  }
  for (const text of expected.uncertaintyIncludes ?? []) {
    assert(actual.uncertainty.includes(text), `${id}: uncertainty missing ${JSON.stringify(text)}`);
  }
  for (const text of expected.keyQuestionIncludes ?? []) {
    assert(actual.key_question.includes(text), `${id}: key_question missing ${JSON.stringify(text)}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
