import { hashClaim } from "@/lib/dedup";
import type { DocumentAnchor, MarkerType, Source } from "@/lib/types";

type TopicFixture =
  | "Politics"
  | "Defense"
  | "Economy"
  | "Society"
  | "Immigration"
  | "Healthcare"
  | "Climate"
  | "Science"
  | "Law"
  | "History"
  | "Culture"
  | "Other";

type ExtractClaimsFixtureRequest = {
  utterance: string;
  utterance_start: number;
  utterance_end: number;
  context?: string;
  recent_hashes?: string[];
  speaker_id?: number | null;
  segment_id?: string | null;
  turn_id?: string | null;
  document_anchor?: DocumentAnchor;
};

type ExtractedClaimFixture = {
  claim_text: string;
  utterance_start: number;
  utterance_end: number;
  topic: TopicFixture;
  topic_secondary: TopicFixture | null;
  stance: "asserted" | "denied" | "quoted" | "reported" | "mocked" | "questioned" | "corrected" | "hedged" | "unclear";
  ownership: {
    owner_speaker_id: number | null;
    attribution_status: "confident";
    attribution_reasons: ["single_speaker_high_confidence"];
    stance: "asserted";
    confidence: number;
    source_turn_ids: string[];
    source_segment_ids: string[];
  };
};

type AnalyzeRhetoricFixtureRequest = {
  transcript_window: string;
  source_context?: string;
  recent_hashes?: string[];
};

type MarkerFixture = {
  type: MarkerType;
  name: string;
  display: string;
  excerpt: string;
  start_time: number;
  end_time: number;
  severity: "subtle" | "clear" | "blatant";
  explanation: string;
  attribution_status: "confident";
  attribution_reasons: ["single_speaker_high_confidence"];
  overlap_class: "none";
  source_turn_ids: string[];
  source_segment_ids: string[];
};

type VerifyFixtureRequest = {
  claim_text: string;
  source_context?: string;
};

type VerifyFixtureResponse = {
  primary_label: "TRUE" | "MOSTLY_TRUE" | "PARTIAL" | "MISLEADING" | "OMISSION" | "FALSE" | "UNVERIFIABLE" | "OPINION";
  score: number;
  annotations: string[];
  explanation: string;
};

type SynthesizeFixtureRequest = {
  utterances: Array<{ speaker_id: number | null; text: string; start: number; end: number }>;
  counters: { claims: number; false: number; partial: number; true: number; fallacy: number; bias: number; rhetoric: number };
  speakers: Array<{ id: number; label: string }>;
  source_context?: string;
};

type SynthesizeFixtureResponse = {
  text: string;
  headlines: [string, string, string];
  per_speaker_verdicts: Array<{
    speaker_id: number;
    label: string;
    factual_grade: "mostly_factual" | "mixed" | "mostly_inaccurate" | "insufficient";
    faith_grade: "good_faith" | "mixed" | "bad_faith" | "insufficient";
    one_liner: string;
  }>;
};

type DevilAdvocateFixtureRequest = {
  utterances: Array<{ speaker_id: number | null; text: string; start: number; end: number }>;
  source_context?: string;
};

type DevilAdvocateFixtureResponse = {
  stance: string;
  strongest_counterarguments: [string, string, string];
  weakest_assumption: string;
  questions: [string, string];
  confidence: "low" | "medium" | "high";
  model: string;
};

function validationAnalysisEnabled(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  return process.env.YENTL_DISABLE_VALIDATION_DEMO !== "1";
}

function normalized(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/\s+/g, " ").trim();
}

function hasValidationContext(...values: Array<string | undefined>): boolean {
  if (!validationAnalysisEnabled()) return false;
  const joined = normalized(values.filter(Boolean).join("\n"));
  return (
    joined.includes("yentl-small-brief.docx") ||
    joined.includes("yentl-small-text-layer.pdf") ||
    joined.includes("yentl document validation brief") ||
    (joined.includes("city spending rose by twelve percent") && joined.includes("source trail"))
  );
}

function ownerFor(request: ExtractClaimsFixtureRequest): ExtractedClaimFixture["ownership"] {
  return {
    owner_speaker_id: typeof request.speaker_id === "number" ? request.speaker_id : null,
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    stance: "asserted",
    confidence: 0.9,
    source_turn_ids: request.turn_id ? [request.turn_id] : [],
    source_segment_ids: request.segment_id ? [request.segment_id] : [],
  };
}

function claim(
  request: ExtractClaimsFixtureRequest,
  claim_text: string,
  topic: TopicFixture,
  topic_secondary: TopicFixture | null,
): ExtractedClaimFixture {
  return {
    claim_text,
    utterance_start: request.utterance_start,
    utterance_end: request.utterance_end,
    topic,
    topic_secondary,
    stance: "asserted",
    ownership: ownerFor(request),
  };
}

export function documentValidationExtractClaimsFixture(
  request: ExtractClaimsFixtureRequest,
): { claims: ExtractedClaimFixture[] } | null {
  if (!hasValidationContext(request.context, request.utterance)) return null;

  const utterance = normalized(request.utterance);
  const claims: ExtractedClaimFixture[] = [];

  if (
    utterance.includes("city spending rose by twelve percent") &&
    utterance.includes("without raising taxes")
  ) {
    claims.push(claim(
      request,
      "City spending rose by twelve percent this year without raising taxes.",
      "Economy",
      "Politics",
    ));
  }

  if (
    utterance.includes("mayor") &&
    utterance.includes("released a summary")
  ) {
    claims.push(claim(
      request,
      "The mayor's office released a summary about the spending increase.",
      "Politics",
      "Economy",
    ));
  }

  const recent = new Set(request.recent_hashes ?? []);
  return { claims: claims.filter((item) => !recent.has(hashClaim(item.claim_text))) };
}

function markerHash(marker: MarkerFixture): string {
  return hashClaim(`${marker.type}::${marker.excerpt}`);
}

function marker(
  type: MarkerType,
  name: string,
  display: string,
  excerpt: string,
  start_time: number,
  end_time: number,
  severity: MarkerFixture["severity"],
  explanation: string,
): MarkerFixture {
  return {
    type,
    name,
    display,
    excerpt,
    start_time,
    end_time,
    severity,
    explanation,
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    overlap_class: "none",
    source_turn_ids: [],
    source_segment_ids: [],
  };
}

export function documentValidationAnalyzeRhetoricFixture(
  request: AnalyzeRhetoricFixtureRequest,
): { markers: MarkerFixture[] } | null {
  if (!hasValidationContext(request.source_context, request.transcript_window)) return null;

  const windowText = normalized(request.transcript_window);
  const markers: MarkerFixture[] = [];

  if (windowText.includes("exact document") && windowText.includes("needs to be named")) {
    markers.push(marker(
      "rhetoric",
      "vagueness",
      "Vagueness / Hand-waving",
      "the exact document still needs to be named",
      18,
      25,
      "clear",
      "The passage acknowledges a missing source trail, which is useful candor but leaves the central budget claim unresolved.",
    ));
  }

  if (windowText.includes("without raising taxes")) {
    markers.push(marker(
      "rhetoric",
      "loaded_language",
      "Loaded Language",
      "without raising taxes",
      0,
      7,
      "subtle",
      "The phrase is a politically charged frame attached to the spending figure; it needs the baseline and tax record before it can carry evidentiary weight.",
    ));
  }

  const recent = new Set(request.recent_hashes ?? []);
  return { markers: markers.filter((item) => !recent.has(markerHash(item))) };
}

function claimKey(value: string): "spending_increase" | "mayor_summary" | null {
  const text = normalized(value);
  if (text.includes("spending rose by twelve percent") && text.includes("without raising taxes")) {
    return "spending_increase";
  }
  if (text.includes("mayor") && text.includes("released a summary")) {
    return "mayor_summary";
  }
  return null;
}

export function documentValidationVerifyProvisionalFixture(
  request: VerifyFixtureRequest,
): VerifyFixtureResponse | null {
  if (!hasValidationContext(request.source_context, request.claim_text)) return null;

  switch (claimKey(request.claim_text)) {
    case "spending_increase":
      return {
        primary_label: "UNVERIFIABLE",
        score: 34,
        annotations: ["missing baseline year", "missing budget document", "tax claim needs source"],
        explanation:
          "The imported brief states the spending claim, but the same exchange asks for the source and baseline year. Yentl should keep it unresolved until the actual budget summary and tax record are named.",
      };
    case "mayor_summary":
      return {
        primary_label: "UNVERIFIABLE",
        score: 42,
        annotations: ["document not named", "source trail incomplete"],
        explanation:
          "The brief says a mayor's office summary exists, but it does not identify the document, date, or link. This is a source-trail claim, not confirmed evidence yet.",
      };
    default:
      return null;
  }
}

const DOCX_SOURCE: Source = {
  url: "http://localhost:3000/validation/yentl-small-brief.docx",
  domain: "localhost",
  title: "Yentl small DOCX validation brief",
  reputation_tier: "mid",
  stance: "mixed",
  excerpt:
    "The validation brief contains the budget claim and also says the exact source document still needs to be named.",
};

const PDF_SOURCE: Source = {
  url: "http://localhost:3000/validation/yentl-small-text-layer.pdf",
  domain: "localhost",
  title: "Yentl small selectable-text PDF",
  reputation_tier: "mid",
  stance: "mixed",
  excerpt:
    "The selectable-text PDF preserves the same exchange: a spending claim, a baseline challenge, and a note that the source trail is incomplete.",
};

export function documentValidationVerifyConfirmedFixture(
  request: VerifyFixtureRequest,
): (VerifyFixtureResponse & { sources: Source[] }) | null {
  const provisional = documentValidationVerifyProvisionalFixture(request);
  if (!provisional) return null;

  return {
    ...provisional,
    sources: [DOCX_SOURCE, PDF_SOURCE],
  };
}

export function documentValidationSynthesisFixture(
  request: SynthesizeFixtureRequest,
): SynthesizeFixtureResponse | null {
  if (!hasValidationContext(request.source_context, request.utterances.map((u) => u.text).join(" "))) {
    return null;
  }

  const claimPhrase = request.counters.claims === 1 ? "1 claim" : `${request.counters.claims} claims`;
  const markerTotal = request.counters.fallacy + request.counters.bias + request.counters.rhetoric;
  const markerPhrase = markerTotal === 1 ? "1 rhetoric marker" : `${markerTotal} rhetoric markers`;

  return {
    text:
      `This imported document is a source-quality review, not a settled budget finding. Yentl is tracking ${claimPhrase} about a twelve-percent spending increase and a mayor's-office summary, plus ${markerPhrase} around missing-document and tax-framing language. The meta-view is that the document itself raises the right challenge: do not accept the percentage or tax frame until the baseline year and actual budget summary are named.`,
    headlines: [
      "Budget claim remains source-trail dependent",
      "Baseline year and named document are missing",
      "The conversation correctly preserves uncertainty",
    ],
    per_speaker_verdicts: request.speakers.map((speaker) => ({
      speaker_id: speaker.id,
      label: speaker.label,
      factual_grade: speaker.id === 0 ? "mixed" : "insufficient",
      faith_grade: speaker.id === 1 ? "good_faith" : "mixed",
      one_liner:
        speaker.id === 1
          ? "Asks the decisive baseline and source-document questions instead of accepting the number."
          : "States a checkable budget claim while leaving the evidence trail incomplete.",
    })),
  };
}

export function documentValidationDevilAdvocateFixture(
  request: DevilAdvocateFixtureRequest,
): DevilAdvocateFixtureResponse | null {
  if (!hasValidationContext(request.source_context, request.utterances.map((u) => u.text).join(" "))) {
    return null;
  }

  return {
    stance:
      "A careful reviewer would challenge whether the twelve-percent figure and the no-tax-increase frame refer to the same baseline and fiscal scope.",
    strongest_counterarguments: [
      "The brief names neither the budget document nor the baseline year, so the percentage may be technically true under one comparison and misleading under another.",
      "The phrase without raising taxes may omit fee changes, delayed tax effects, fund transfers, or one-time revenue that matter to the claim.",
      "The mayor's-office summary is mentioned as existing, but the document itself is not provided, so the source trail is not yet auditable.",
    ],
    weakest_assumption:
      "The weakest assumption is that the spending percentage, tax statement, and mayoral summary all describe the same fiscal period and budget category.",
    questions: [
      "What exact budget document and baseline year support the twelve-percent figure?",
      "Does without raising taxes exclude fees, assessments, transfers, or future tax effects?",
    ],
    confidence: "high",
    model: "validation-fixture",
  };
}
