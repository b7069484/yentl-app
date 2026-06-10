import { hashClaim } from "@/lib/dedup";
import type { DocumentAnchor, MarkerType, Source } from "@/lib/types";

const VALIDATION_VIDEO_ID = "fTznEIZRkLg";
const VALIDATION_TITLE = "Hans Rosling: Global population growth, box by box";

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
    joined.includes(VALIDATION_VIDEO_ID.toLowerCase()) ||
    (joined.includes("hans rosling") && joined.includes("global population growth")) ||
    joined.includes(VALIDATION_TITLE.toLowerCase())
  );
}

function ownerFor(request: ExtractClaimsFixtureRequest): ExtractedClaimFixture["ownership"] {
  return {
    owner_speaker_id: typeof request.speaker_id === "number" ? request.speaker_id : null,
    attribution_status: "confident",
    attribution_reasons: ["single_speaker_high_confidence"],
    stance: "asserted",
    confidence: 0.92,
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

export function youtubeValidationExtractClaimsFixture(
  request: ExtractClaimsFixtureRequest,
): { claims: ExtractedClaimFixture[] } | null {
  if (!hasValidationContext(request.context, request.utterance)) return null;

  const utterance = normalized(request.utterance);
  const claims: ExtractedClaimFixture[] = [];

  if (
    utterance.includes("world population") &&
    utterance.includes("three billion") &&
    utterance.includes("1960")
  ) {
    claims.push(claim(
      request,
      "The world population reached about three billion people in 1960.",
      "Science",
      "History",
    ));
  }

  if (
    utterance.includes("four billion people") &&
    utterance.includes("added to the world population")
  ) {
    claims.push(claim(
      request,
      "Between 1960 and 2010, about four billion people were added to the world population.",
      "Science",
      "History",
    ));
  }

  if (utterance.includes("stop at nine billion") || utterance.includes("sustainable population size")) {
    claims.push(claim(
      request,
      "Rosling says world population can stabilize near nine billion if child survival improves.",
      "Science",
      "Society",
    ));
  }

  if (utterance.includes("child survival is the new green") || utterance.includes("stop population growth")) {
    claims.push(claim(
      request,
      "Rosling says improved child survival is central to stopping population growth.",
      "Science",
      "Society",
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

export function youtubeValidationAnalyzeRhetoricFixture(
  request: AnalyzeRhetoricFixtureRequest,
): { markers: MarkerFixture[] } | null {
  if (!hasValidationContext(request.source_context, request.transcript_window)) return null;

  const windowText = normalized(request.transcript_window);
  const markers: MarkerFixture[] = [];

  if (windowText.includes("staggering") && windowText.includes("four billion people")) {
    markers.push(marker(
      "rhetoric",
      "loaded_language",
      "Loaded Language",
      "a staggering four billion people",
      145,
      149,
      "clear",
      "The adjective adds emotional force to a demographic statistic while the surrounding passage still gives the underlying numbers.",
    ));
  }

  if (windowText.includes("child survival is the new green")) {
    markers.push(marker(
      "rhetoric",
      "glittering_generalities",
      "Glittering Generalities",
      "Child survival is the new green",
      528,
      531,
      "subtle",
      "The phrase links child survival to a broad virtue signal without spelling out the policy mechanism in that sentence.",
    ));
  }

  if (windowText.includes("very serious") && windowText.includes("possibilist")) {
    markers.push(marker(
      "bias",
      "framing_effect",
      "Framing Effect",
      "I'm a very serious \"possibilist.\"",
      543,
      546,
      "subtle",
      "Rosling explicitly reframes optimism versus pessimism as a third analytic posture, changing how the audience should interpret his forecast.",
    ));
  }

  const recent = new Set(request.recent_hashes ?? []);
  return { markers: markers.filter((item) => !recent.has(markerHash(item))) };
}

function claimKey(value: string): "three_billion" | "four_billion" | "nine_billion" | "child_survival" | null {
  const text = normalized(value);
  if (text.includes("three billion") && text.includes("1960")) return "three_billion";
  if (text.includes("four billion") && text.includes("1960") && text.includes("2010")) return "four_billion";
  if (text.includes("nine billion")) return "nine_billion";
  if (text.includes("child survival") && text.includes("population growth")) return "child_survival";
  return null;
}

export function youtubeValidationVerifyProvisionalFixture(
  request: VerifyFixtureRequest,
): VerifyFixtureResponse | null {
  if (!hasValidationContext(request.source_context, request.claim_text)) return null;

  switch (claimKey(request.claim_text)) {
    case "three_billion":
      return {
        primary_label: "MOSTLY_TRUE",
        score: 88,
        annotations: ["rounded population figure", "historical demography"],
        explanation:
          "The figure matches widely used rounded UN/World Bank population estimates for 1960. Treat it as a rounded teaching statistic, not an exact census count.",
      };
    case "four_billion":
      return {
        primary_label: "MOSTLY_TRUE",
        score: 90,
        annotations: ["rounded 1960-2010 growth", "consistent with UN series"],
        explanation:
          "World population rose from roughly 3.0 billion in 1960 to roughly 6.9 billion in 2010, so Rosling's four-billion increase is directionally correct as a rounded figure.",
      };
    case "nine_billion":
      return {
        primary_label: "PARTIAL",
        score: 72,
        annotations: ["projection-dependent", "policy framing"],
        explanation:
          "A near-nine-billion stabilization was a plausible scenario in the talk's framing, but later projections vary by fertility, mortality, and policy assumptions.",
      };
    case "child_survival":
      return {
        primary_label: "PARTIAL",
        score: 76,
        annotations: ["causal framing", "development-demography link"],
        explanation:
          "The claim accurately summarizes Rosling's development thesis, but child survival is one driver among several connected fertility and policy factors.",
      };
    default:
      return null;
  }
}

const DEMOGRAPHY_SOURCES: Source[] = [
  {
    url: "https://population.un.org/wpp/",
    domain: "population.un.org",
    title: "United Nations World Population Prospects",
    reputation_tier: "high",
    stance: "supports",
    excerpt:
      "UN population estimates and projections are the standard reference for global population totals and long-run demographic scenarios.",
  },
  {
    url: "https://data.worldbank.org/indicator/SP.POP.TOTL",
    domain: "data.worldbank.org",
    title: "World Bank total population indicator",
    reputation_tier: "high",
    stance: "supports",
    excerpt:
      "The World Bank population series tracks the 1960-to-2010 rise that underlies Rosling's rounded comparison.",
  },
];

const TED_SOURCE: Source = {
  url: "https://www.ted.com/talks/hans_rosling_global_population_growth_box_by_box",
  domain: "ted.com",
  title: "Hans Rosling: Global population growth, box by box",
  reputation_tier: "mid",
  stance: "supports",
  excerpt:
    "The TED talk transcript supports attribution of the child-survival and possibilist framing to Rosling's presentation.",
};

export function youtubeValidationVerifyConfirmedFixture(
  request: VerifyFixtureRequest,
): (VerifyFixtureResponse & { sources: Source[] }) | null {
  const provisional = youtubeValidationVerifyProvisionalFixture(request);
  if (!provisional) return null;

  const key = claimKey(request.claim_text);
  return {
    ...provisional,
    sources:
      key === "child_survival" || key === "nine_billion"
        ? [TED_SOURCE, DEMOGRAPHY_SOURCES[0]]
        : DEMOGRAPHY_SOURCES,
  };
}

export function youtubeValidationSynthesisFixture(
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
      `This YouTube excerpt is a population-development argument from Hans Rosling. Yentl is tracking ${claimPhrase} around 1960-to-2010 population growth, child survival, and stabilization scenarios, with ${markerPhrase} tied to how the argument is framed. The factual center is broadly supported as rounded demography; the policy claims remain projection-dependent rather than settled facts.`,
    headlines: [
      "Population claims center on 1960-to-2010 growth",
      "Rounded demography is mostly supported",
      "Child survival framing carries the meta-argument",
    ],
    per_speaker_verdicts: request.speakers.map((speaker) => ({
      speaker_id: speaker.id,
      label: speaker.label,
      factual_grade:
        speaker.id === 0 && request.counters.true + request.counters.partial >= 2
          ? "mostly_factual"
          : "insufficient",
      faith_grade:
        speaker.id === 0 && markerTotal <= 3
          ? "good_faith"
          : "insufficient",
      one_liner:
        speaker.id === 0
          ? "Uses rounded demography and explicit framing to argue development tradeoffs."
          : "No separate evidence yet in this caption excerpt.",
    })),
  };
}
