import type { BrowserTabContext, ClaimCard, SessionSource } from "@/lib/types";

const MAX_VERIFY_SOURCE_CONTEXT_CHARS = 6_000;

export function compactContextPairs(pairs: Array<[string, string | string[] | number | undefined | null]>) {
  return pairs
    .flatMap(([label, value]) => {
      if (Array.isArray(value)) {
        return value.length > 0 ? [`${label}: ${value.join(", ")}`] : [];
      }
      if (value === undefined || value === null || value === "") return [];
      return [`${label}: ${String(value)}`];
    })
    .join("\n");
}

function browserContextForPrompt(context?: BrowserTabContext) {
  if (!context) return "";
  return compactContextPairs([
    ["page title", context.page_title],
    ["site", context.site_name],
    ["channel", context.channel_name],
    ["author", context.author_name],
    ["username", context.username],
    ["canonical url", context.canonical_url],
    ["description", context.description],
    ["detected names", context.detected_names],
  ]);
}

function compactPromptText(text: string, maxChars: number): string {
  const compact = text.replace(/\s+/g, " ").trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 3).trim()}...`;
}

function clampSourceContext(text: string, maxChars = MAX_VERIFY_SOURCE_CONTEXT_CHARS): string {
  const compact = text.trim();
  if (compact.length <= maxChars) return compact;
  return `${compact.slice(0, maxChars - 3).trim()}...`;
}

function documentStats(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const lines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0).length;
  const paragraphs = trimmed.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length;
  const words = trimmed.split(/\s+/).filter(Boolean).length;
  return `${words} words, ${paragraphs} blocks, ${lines} non-empty lines`;
}

function textDocOverviewForPrompt(source: Extract<SessionSource, { kind: "text_doc" }>) {
  if (!source.initial_text?.trim()) return "";
  const text = source.initial_text.trim();
  const tail = text.length > 1_200 ? compactPromptText(text.slice(-1_200), 600) : "";
  const outline = source.document_meta?.outline
    ?.slice(0, 8)
    .map((item, index) => `${index + 1}. ${item.label}${item.preview ? ` - ${compactPromptText(item.preview, 160)}` : ""}`);
  return compactContextPairs([
    ["document extraction", source.document_meta?.extraction_kind],
    ["document pages", source.document_meta?.page_count],
    ["document outline", outline],
    ["document stats", documentStats(text)],
    ["opening excerpt", compactPromptText(text, 900)],
    ["closing excerpt", tail],
  ]);
}

export function sourceContextForPrompt(source: SessionSource) {
  if (source.kind === "browser_tab") {
    return browserContextForPrompt({
      ...(source.context ?? {}),
      page_title: source.context?.page_title ?? source.title,
      canonical_url: source.context?.canonical_url ?? source.url,
    });
  }

  if (source.kind === "youtube") {
    return compactContextPairs([
      ["source type", "YouTube"],
      ["title", source.title],
      ["channel", source.channel],
      ["url", source.url],
      ["video id", source.video_id],
      ["duration seconds", source.duration_sec],
    ]);
  }

  if (source.kind === "media_url") {
    return compactContextPairs([
      ["source type", "media URL"],
      ["url", source.url],
    ]);
  }

  if (source.kind === "audio_file" || source.kind === "text_doc") {
    return compactContextPairs([
      ["source type", source.kind],
      ["filename", source.filename],
      ["mime", source.mime],
      ["intent", source.kind === "text_doc" ? source.intent : undefined],
      ["source url", source.kind === "text_doc" ? source.source_url : undefined],
      ["byte count", source.kind === "text_doc" ? source.byte_count : undefined],
      ["document overview", source.kind === "text_doc" ? textDocOverviewForPrompt(source) : undefined],
    ]);
  }

  return "";
}

export function claimContextForVerification(claim: ClaimCard) {
  return {
    speaker_id: claim.ownership?.owner_speaker_id ?? claim.speaker_id,
    topic: claim.topic,
    stance: claim.ownership?.stance ?? claim.stance,
    attribution_status: claim.ownership?.attribution_status,
    attribution_reasons: claim.ownership?.attribution_reasons ?? [],
  };
}

export function sourceContextForClaimVerification(source: SessionSource, claim: ClaimCard) {
  const sessionContext = sourceContextForPrompt(source);
  const claimContext = claim.source_context?.trim();
  if (!claimContext) return sessionContext;
  if (sessionContext.includes(claimContext)) return clampSourceContext(sessionContext);

  return clampSourceContext([
    sessionContext,
    `CLAIM_SOURCE_CONTEXT (for disambiguation only; not evidence):\n${claimContext}`,
  ].filter(Boolean).join("\n\n"));
}
