"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ExternalLink, FileText, ListChecks, MessageSquareText, Target } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { sessionViewHref } from "@/lib/client/session-route";
import { documentAnchorDetail, documentAnchorLabel } from "@/lib/document-anchor";
import { bestSourceQuoteRange, sourceQuoteOverlapScore } from "@/lib/source-evidence";
import type {
  ClaimCard,
  DocumentAnchor,
  SessionSource,
  TextDocumentOutlineItem,
  TranscriptSegment,
} from "@/lib/types";

type SourceBlock = {
  index: number;
  label: string;
  preview: string;
  text: string;
};

type SourceQuoteAnchor = {
  claimId: string;
  blockIndex: number;
  text: string;
  start: number;
  end: number;
  score: number;
};

function extractionLabel(kind?: string): string {
  switch (kind) {
    case "docx_text":
      return "Word document";
    case "pdf_text_layer":
      return "PDF text layer";
    case "timed_text":
      return "Caption file";
    case "plain_text":
    default:
      return "Plain text";
  }
}

function sourceDisplayName(source: SessionSource): string {
  if (source.kind !== "text_doc") return "Session source";
  if (source.filename?.trim()) return source.filename.trim();
  if (source.source_url) {
    try {
      return new URL(source.source_url).hostname;
    } catch {
      return source.source_url;
    }
  }
  return "Imported text";
}

function compact(value: string, max = 160): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, max - 3).trimEnd()}...`;
}

function sourceInitialText(source: Extract<SessionSource, { kind: "text_doc" }>): string {
  return typeof source.initial_text === "string" ? source.initial_text : "";
}

function validOutlineItem(value: unknown): value is TextDocumentOutlineItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<TextDocumentOutlineItem>;
  return (
    (item.kind === "heading" || item.kind === "paragraph") &&
    typeof item.label === "string" &&
    typeof item.preview === "string"
  );
}

function safeOutline(source: Extract<SessionSource, { kind: "text_doc" }>): TextDocumentOutlineItem[] {
  const outline = source.document_meta?.outline;
  if (!Array.isArray(outline)) return [];
  return outline.filter(validOutlineItem);
}

function validSourceBlock(value: unknown): value is SourceBlock {
  if (!value || typeof value !== "object") return false;
  const block = value as Partial<SourceBlock>;
  return (
    typeof block.index === "number" &&
    Number.isInteger(block.index) &&
    block.index >= 0 &&
    typeof block.label === "string" &&
    typeof block.preview === "string" &&
    typeof block.text === "string"
  );
}

function safeSourceBlocks(blocks: unknown): SourceBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.filter(validSourceBlock);
}

function sourceTextLooksLikeTitle(text: string): boolean {
  const compactText = text.replace(/\s+/g, " ").trim();
  if (!compactText) return false;
  return compactText.split(/\s+/).length <= 12 && !/[.!?]$/.test(compactText);
}

function splitSourceBlocks(source: Extract<SessionSource, { kind: "text_doc" }>): SourceBlock[] {
  const raw = sourceInitialText(source).replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
  if (!raw) return [];

  const outline = safeOutline(source);
  const usedOutlineIndexes = new Set<number>();
  const paragraphs = raw
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  return paragraphs.map((text, index) => {
    const outlineIndex = outline.findIndex((item, itemIndex) => {
      if (usedOutlineIndexes.has(itemIndex)) return false;
      const preview = compact(item.preview, 140);
      const label = compact(item.label, 140);
      const compactText = compact(text, 140);
      return (
        compactText === preview ||
        text.startsWith(preview) ||
        (item.kind === "heading" && compactText === label)
      );
    });
    const outlineItem = outlineIndex >= 0 ? outline[outlineIndex] : undefined;
    if (outlineIndex >= 0) usedOutlineIndexes.add(outlineIndex);
    const looksLikeTitle = index === 0 && paragraphs.length > 1 && sourceTextLooksLikeTitle(text);

    return {
      index,
      label: outlineItem?.label ?? (looksLikeTitle ? "Title" : `Paragraph ${index + 1}`),
      preview: outlineItem?.preview ?? compact(text),
      text,
    };
  });
}

function sourceBlockIndex(anchor?: DocumentAnchor): number | null {
  if (!anchor) return null;
  if (anchor.paragraph_index !== undefined) return anchor.paragraph_index;
  if (anchor.cue_index !== undefined) return anchor.cue_index;
  return anchor.block_index;
}

function bestTextMatchBlockIndex(claim: ClaimCard, blocks: SourceBlock[]): number | null {
  blocks = safeSourceBlocks(blocks);
  let bestIndex: number | null = null;
  let bestScore = 0;
  for (const block of blocks) {
    const score = sourceQuoteOverlapScore(claim.claim_text, block.text);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = block.index;
    }
  }
  return bestScore >= 0.45 ? bestIndex : null;
}

function claimSourceBlockIndex(claim: ClaimCard, blocks: SourceBlock[]): number | null {
  blocks = safeSourceBlocks(blocks);
  const anchoredIndex = sourceBlockIndex(claim.document_anchor);
  if (anchoredIndex === null) return bestTextMatchBlockIndex(claim, blocks);

  const anchoredBlock = blocks.find((block) => block.index === anchoredIndex);
  if (!anchoredBlock) return bestTextMatchBlockIndex(claim, blocks) ?? anchoredIndex;

  const anchoredScore = sourceQuoteOverlapScore(claim.claim_text, anchoredBlock.text);
  const titleLikeBlock = anchoredBlock.label === "Title" || sourceTextLooksLikeTitle(anchoredBlock.text);
  if (anchoredScore >= 0.45) return anchoredIndex;

  const bestMatch = bestTextMatchBlockIndex(claim, blocks);
  if (bestMatch !== null && (titleLikeBlock || anchoredScore < 0.25)) {
    return bestMatch;
  }

  return anchoredIndex;
}

function blockClaims(claims: ClaimCard[], blocks: SourceBlock[], blockIndex: number): ClaimCard[] {
  blocks = safeSourceBlocks(blocks);
  return claims.filter((claim) => claimSourceBlockIndex(claim, blocks) === blockIndex);
}

function blockSegments(segments: TranscriptSegment[], blockIndex: number): TranscriptSegment[] {
  return segments.filter((segment) => sourceBlockIndex(segment.document_anchor) === blockIndex);
}

function sourceQuoteFromPersistedAnchor(claim: ClaimCard, block: SourceBlock): SourceQuoteAnchor | null {
  const anchor = claim.document_anchor;
  const quoteText = anchor?.quote_text?.trim();
  const start = anchor?.char_start;
  const end = anchor?.char_end;

  if (
    typeof start === "number" &&
    typeof end === "number" &&
    start >= 0 &&
    end > start &&
    end <= block.text.length
  ) {
    const text = block.text.slice(start, end);
    if (!quoteText || text.replace(/\s+/g, " ").trim() === quoteText.replace(/\s+/g, " ").trim()) {
      return {
        claimId: claim.id,
        blockIndex: block.index,
        text: text.trim(),
        start,
        end,
        score: 1,
      };
    }
  }

  if (quoteText) {
    const exactStart = block.text.indexOf(quoteText);
    if (exactStart >= 0) {
      return {
        claimId: claim.id,
        blockIndex: block.index,
        text: quoteText,
        start: exactStart,
        end: exactStart + quoteText.length,
        score: 0.95,
      };
    }
  }

  return null;
}

function sourceQuoteForClaim(claim: ClaimCard, block: SourceBlock): SourceQuoteAnchor | null {
  const persisted = sourceQuoteFromPersistedAnchor(claim, block);
  if (persisted) return persisted;

  const quote = bestSourceQuoteRange(claim.claim_text, block.text);
  if (!quote) return null;
  return {
    claimId: claim.id,
    blockIndex: block.index,
    text: quote.text,
    start: quote.start,
    end: quote.end,
    score: quote.score,
  };
}

function SourceBlockText({ text, quote }: { text: string; quote: SourceQuoteAnchor | null }) {
  if (!quote || quote.start < 0 || quote.end > text.length || quote.start >= quote.end) {
    return <>{text}</>;
  }

  return (
    <>
      {text.slice(0, quote.start)}
      <mark
        data-testid="source-quote-highlight"
        className="rounded-sm bg-yellow-100 px-0.5 text-ink-2 ring-1 ring-yellow-300/70"
      >
        {text.slice(quote.start, quote.end)}
      </mark>
      {text.slice(quote.end)}
    </>
  );
}

function SourceQuotePreview({ quote }: { quote: SourceQuoteAnchor | null }) {
  if (!quote) {
    return (
      <div className="mt-2 rounded-md border border-line bg-paper px-2.5 py-2 text-[11.5px] leading-snug text-ink-4">
        No exact source sentence match yet.
      </div>
    );
  }

  return (
    <div
      data-testid="source-quote-preview"
      className="mt-2 rounded-md border border-teal/20 bg-paper px-2.5 py-2 text-[11.5px] leading-snug text-ink-3"
    >
      <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.1em] text-teal">
        Source quote
      </div>
      &ldquo;{quote.text}&rdquo;
    </div>
  );
}

function parseBlockParam(value: string | null): number | null {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function sourceClaimDetailHref(
  claim: ClaimCard,
  blocks: SourceBlock[],
  fallbackBlockIndex?: number,
): string {
  blocks = safeSourceBlocks(blocks);
  const blockIndex = claimSourceBlockIndex(claim, blocks) ?? fallbackBlockIndex ?? null;
  const from = blockIndex === null ? "" : `?from=${encodeURIComponent(`source:block:${blockIndex}`)}`;
  return `/session/detail/claim/${claim.id}${from}`;
}

function sourceStatLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function formatSourceTime(seconds: number): string {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  const minutes = Math.floor(safe / 60);
  const rest = Math.floor(safe % 60);
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function SourceReviewEmptyState({ source }: { source: SessionSource }) {
  const searchParams = useSearchParams();
  const label = source.kind === "text_doc" ? sourceDisplayName(source) : "Live source";
  return (
    <main
      data-testid="source-review-empty"
      className="mx-auto flex min-h-[55vh] w-full max-w-[760px] flex-col justify-center px-5 py-12"
    >
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-line bg-paper px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
        <FileText className="h-3.5 w-3.5 text-teal" aria-hidden />
        Source review
      </div>
      <h1 className="mt-4 font-serif text-[34px] leading-tight text-ink">
        No imported source text
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-ink-3">
        {label} does not include document text that can be anchored back to claims yet.
      </p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link
          href={sessionViewHref(searchParams, "overview", { block: null })}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-4 text-[13px] font-semibold text-ink-2 hover:bg-cream-2"
        >
          Overview
        </Link>
        <Link
          href={sessionViewHref(searchParams, "transcript", { block: null })}
          className="inline-flex min-h-11 items-center rounded-lg border border-line bg-paper px-4 text-[13px] font-semibold text-ink-2 hover:bg-cream-2"
        >
          Transcript
        </Link>
      </div>
    </main>
  );
}

export function SourceReviewView() {
  const source = useSession((s) => s.source);
  const transcript = useSession((s) => s.transcript);
  const claims = useSession((s) => s.claims);
  const searchParams = useSearchParams();
  const [focusedBlockIndex, setFocusedBlockIndex] = useState<number | null>(null);
  const [jumpedBlockIndex, setJumpedBlockIndex] = useState<number | null>(null);
  const [highlightedQuoteClaimId, setHighlightedQuoteClaimId] = useState<string | null>(null);
  const blockRefs = useRef<Record<number, HTMLElement | null>>({});
  const lastRouteBlockRef = useRef<number | null>(null);
  const routeBlockIndex = parseBlockParam(searchParams.get("block"));
  const textSource = source.kind === "text_doc" && sourceInitialText(source).trim() ? source : null;
  const blocks = textSource ? splitSourceBlocks(textSource) : [];
  const selectedRouteBlockIndex = blocks.some((block) => block.index === routeBlockIndex)
    ? routeBlockIndex
    : null;

  const anchoredTranscript = transcript.filter((segment) => segment.document_anchor).length;
  const anchoredClaims = claims.filter((claim) => claim.document_anchor).length;
  const sourceBackedClaims = claims.filter((claim) => claim.document_anchor && claim.sources.length > 0).length;
  const extraction = extractionLabel(textSource?.document_meta?.extraction_kind);
  const defaultFocusedBlockIndex =
    blocks.find((block) => blockClaims(claims, blocks, block.index).length > 0)?.index ??
    blocks.find((block) => blockSegments(transcript, block.index).length > 0)?.index ??
    blocks[0]?.index ??
    0;
  const selectedBlockIndex = focusedBlockIndex ?? selectedRouteBlockIndex ?? defaultFocusedBlockIndex;
  const selectedBlock = blocks.find((block) => block.index === selectedBlockIndex) ?? blocks[0];
  const selectedBlockClaims = selectedBlock ? blockClaims(claims, blocks, selectedBlock.index) : [];
  const selectedBlockSegments = selectedBlock ? blockSegments(transcript, selectedBlock.index) : [];
  const selectedQuoteClaimId = selectedBlockClaims.some((claim) => claim.id === highlightedQuoteClaimId)
    ? highlightedQuoteClaimId
    : selectedBlockClaims[0]?.id ?? null;

  useEffect(() => {
    if (
      selectedRouteBlockIndex === null ||
      selectedBlock?.index !== selectedRouteBlockIndex ||
      lastRouteBlockRef.current === selectedRouteBlockIndex
    ) {
      return;
    }

    lastRouteBlockRef.current = selectedRouteBlockIndex;
    setFocusedBlockIndex(selectedRouteBlockIndex);
    setJumpedBlockIndex(selectedRouteBlockIndex);
    const block = blockRefs.current[selectedRouteBlockIndex];
    block?.scrollIntoView({ block: "center", behavior: "smooth" });
    block?.focus({ preventScroll: true });
  }, [selectedBlock?.index, selectedRouteBlockIndex]);

  if (!textSource) {
    return <SourceReviewEmptyState source={source} />;
  }

  function revealBlock(index: number) {
    setFocusedBlockIndex(index);
    setJumpedBlockIndex(index);
    const block = blockRefs.current[index];
    block?.scrollIntoView({ block: "center", behavior: "smooth" });
    block?.focus({ preventScroll: true });
  }

  return (
    <main
      data-testid="source-review-view"
      className="mx-auto flex w-full max-w-[1280px] flex-col gap-5 px-5 py-6 sm:px-6 md:px-8"
    >
      <header className="flex flex-col gap-4 border-b border-line-soft pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal/25 bg-teal-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-teal">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Source review
          </div>
          <h1 className="mt-3 truncate font-serif text-[34px] leading-tight text-ink sm:text-[40px]">
            {sourceDisplayName(textSource)}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-ink-4">
            <span className="rounded-full border border-line bg-paper px-2 py-0.5">{extraction}</span>
            <span className="rounded-full border border-line bg-paper px-2 py-0.5">
              {sourceStatLabel(blocks.length, "block")}
            </span>
            <span className="rounded-full border border-line bg-paper px-2 py-0.5">
              {sourceStatLabel(anchoredTranscript, "anchored line")}
            </span>
            <span className="rounded-full border border-line bg-paper px-2 py-0.5">
              {sourceStatLabel(anchoredClaims, "anchored claim")}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href={sessionViewHref(searchParams, "transcript", { block: null })}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
          >
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden />
            Transcript
          </Link>
          <Link
            href={sessionViewHref(searchParams, "claims", {
              block: null,
              topic: null,
              type: null,
              severity: null,
            })}
            className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
          >
            <ListChecks className="h-3.5 w-3.5" aria-hidden />
            Claims
          </Link>
          {textSource.source_url && (
            <a
              href={textSource.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-line bg-paper px-3 text-[12px] font-semibold text-ink-2 hover:bg-cream-2"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Original
            </a>
          )}
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <section aria-label="Source document" className="space-y-3">
          {blocks.map((block) => {
            const claimsHere = blockClaims(claims, blocks, block.index);
            const segmentsHere = blockSegments(transcript, block.index);
            const hasClaims = claimsHere.length > 0;
            const isFocused = block.index === selectedBlockIndex;
            const activeQuoteClaim = claimsHere.find((claim) => claim.id === selectedQuoteClaimId);
            const activeQuote = activeQuoteClaim ? sourceQuoteForClaim(activeQuoteClaim, block) : null;
            return (
              <article
                key={block.index}
                id={`source-review-block-${block.index}`}
                ref={(element) => {
                  blockRefs.current[block.index] = element;
                }}
                tabIndex={-1}
                data-testid="source-review-block"
                data-source-block-index={block.index}
                data-source-block-focused={isFocused ? "true" : undefined}
                data-source-block-jumped={jumpedBlockIndex === block.index ? "true" : undefined}
                className={[
                  "rounded-lg border bg-paper px-4 py-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30",
                  isFocused
                    ? "border-teal shadow-[inset_3px_0_0_rgba(16,113,101,0.7)]"
                    : hasClaims
                      ? "border-teal/35 shadow-[inset_3px_0_0_rgba(16,113,101,0.45)]"
                      : "border-line",
                  jumpedBlockIndex === block.index ? "ring-2 ring-teal/25" : "",
                ].join(" ")}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-4">
                      {block.label}
                    </div>
                    <p className="mt-1 text-[12px] leading-snug text-ink-4">{block.preview}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5 text-[10.5px] font-semibold text-ink-4">
                    <span className="rounded-full border border-line bg-cream px-2 py-0.5">
                      {segmentsHere.length} lines
                    </span>
                    <span className="rounded-full border border-line bg-cream px-2 py-0.5">
                      {claimsHere.length} claims
                    </span>
                    <button
                      type="button"
                      onClick={() => setFocusedBlockIndex(block.index)}
                      aria-label={`Focus ${block.label}`}
                      aria-pressed={isFocused}
                      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-cream px-3 text-[11.5px] font-semibold text-ink-2 transition-colors hover:bg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
                    >
                      <Target className="h-3.5 w-3.5 text-teal" aria-hidden />
                      Focus
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-2">
                  <SourceBlockText text={block.text} quote={activeQuote} />
                </p>
                {claimsHere.length > 0 && (
                  <div className="mt-3 flex flex-col gap-2">
                    {claimsHere.map((claim) => {
                      const quote = sourceQuoteForClaim(claim, block);
                      const quoteActive = selectedQuoteClaimId === claim.id;
                      return (
                        <div
                          key={claim.id}
                          className={[
                            "rounded-lg border bg-cream px-3 py-2 text-[12px] leading-snug",
                            quoteActive ? "border-teal/40 ring-1 ring-teal/20" : "border-line",
                          ].join(" ")}
                        >
                          <Link
                            href={sourceClaimDetailHref(claim, blocks, block.index)}
                            className="-mx-2 block min-h-11 rounded-md px-2 py-2 text-ink-2 hover:bg-paper/80 hover:text-ink"
                          >
                            <span className="font-semibold text-teal">{claim.primary_label}</span>
                            <span className="mx-1 text-ink-4">·</span>
                            <span>{claim.claim_text}</span>
                          </Link>
                          <SourceQuotePreview quote={quote} />
                          {quote && (
                            <button
                              type="button"
                              onClick={() => {
                                setFocusedBlockIndex(block.index);
                                setHighlightedQuoteClaimId(claim.id);
                              }}
                              aria-label={`Highlight source quote for ${claim.claim_text}`}
                              aria-pressed={quoteActive}
                              data-testid="source-quote-highlight-button"
                              className="mt-2 inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-paper px-3 text-[11.5px] font-semibold text-teal hover:bg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
                            >
                              Highlight quote
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </section>

        <aside className="space-y-3 lg:sticky lg:top-24">
          <section className="rounded-lg border border-line bg-paper px-4 py-3.5">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-4">
              Anchored findings
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
              <div className="rounded-lg border border-line bg-cream px-3 py-2">
                <div className="text-[16px] font-semibold text-ink">{anchoredClaims}</div>
                <div className="text-ink-4">claims</div>
              </div>
              <div className="rounded-lg border border-line bg-cream px-3 py-2">
                <div className="text-[16px] font-semibold text-ink">{anchoredTranscript}</div>
                <div className="text-ink-4">lines</div>
              </div>
              <div className="rounded-lg border border-line bg-cream px-3 py-2">
                <div className="text-[16px] font-semibold text-ink">{sourceBackedClaims}</div>
                <div className="text-ink-4">sourced</div>
              </div>
            </div>
          </section>

          <section
            data-testid="source-review-focused-block"
            className="rounded-lg border border-teal/30 bg-teal-soft/50 px-4 py-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-teal">
                  Focused source block
                </div>
                <h2 className="mt-1 text-[15px] font-semibold text-ink">
                  {selectedBlock?.label ?? "Source block"}
                </h2>
                {selectedBlock && (
                  <p className="mt-1 text-[12px] leading-snug text-ink-3">
                    {selectedBlock.preview}
                  </p>
                )}
              </div>
              <div className="shrink-0 rounded-full border border-teal/25 bg-paper px-2.5 py-1 text-[11px] font-semibold text-teal">
                {selectedBlock ? `Block ${selectedBlock.index + 1}` : "Block"}
              </div>
            </div>

            {selectedBlock && (
              <button
                type="button"
                onClick={() => revealBlock(selectedBlock.index)}
                data-testid="source-review-jump-block"
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-teal/25 bg-paper px-3 text-[12px] font-semibold text-teal transition-colors hover:bg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
              >
                <Target className="h-3.5 w-3.5" aria-hidden />
                Jump to block
              </button>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
              <div className="rounded-lg border border-line bg-paper px-3 py-2">
                <div className="text-[16px] font-semibold text-ink">{selectedBlockSegments.length}</div>
                <div className="text-ink-4">transcript lines</div>
              </div>
              <div className="rounded-lg border border-line bg-paper px-3 py-2">
                <div className="text-[16px] font-semibold text-ink">{selectedBlockClaims.length}</div>
                <div className="text-ink-4">claims</div>
              </div>
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-4">
                Transcript context
              </div>
              {selectedBlockSegments.length === 0 ? (
                <div className="rounded-lg border border-line bg-paper px-3 py-2 text-[12px] text-ink-4">
                  No transcript lines are anchored to this block yet.
                </div>
              ) : (
                selectedBlockSegments.slice(0, 3).map((segment, index) => (
                  <div
                    key={`${segment.start}:${segment.end}:${index}`}
                    className="rounded-lg border border-line bg-paper px-3 py-2 text-[12px] leading-snug text-ink-2"
                  >
                    <div className="mb-1 font-mono text-[10.5px] text-ink-4">
                      {formatSourceTime(segment.start)}-{formatSourceTime(segment.end)}
                    </div>
                    {segment.text}
                  </div>
                ))
              )}
            </div>

            <div className="mt-3 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-[0.1em] text-ink-4">
                Claims in focus
              </div>
              {selectedBlockClaims.length === 0 ? (
                <div className="rounded-lg border border-line bg-paper px-3 py-2 text-[12px] text-ink-4">
                  No claims are mapped to this block yet.
                </div>
              ) : (
                selectedBlockClaims.slice(0, 3).map((claim) => {
                  const quote = selectedBlock ? sourceQuoteForClaim(claim, selectedBlock) : null;
                  const quoteActive = selectedQuoteClaimId === claim.id;
                  return (
                    <div
                      key={claim.id}
                      className={[
                        "rounded-lg border bg-paper px-3 py-2 text-[12px] leading-snug",
                        quoteActive ? "border-teal/40 ring-1 ring-teal/20" : "border-line",
                      ].join(" ")}
                    >
                      <Link
                        href={sourceClaimDetailHref(claim, blocks, selectedBlock?.index)}
                        className="-mx-2 block min-h-11 rounded-md px-2 py-2 text-ink-2 hover:bg-cream/80 hover:text-ink"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-teal">{claim.primary_label}</span>
                          <span className="shrink-0 text-[10.5px] text-ink-4">{claim.score}/100</span>
                        </div>
                        <div className="mt-1 line-clamp-2">{claim.claim_text}</div>
                      </Link>
                      <SourceQuotePreview quote={quote} />
                      {quote && (
                        <button
                          type="button"
                          onClick={() => {
                            setHighlightedQuoteClaimId(claim.id);
                            if (selectedBlock) revealBlock(selectedBlock.index);
                          }}
                          aria-label={`Highlight source quote for ${claim.claim_text}`}
                          aria-pressed={quoteActive}
                          data-testid="source-quote-highlight-button"
                          className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-line bg-cream px-3 text-[11.5px] font-semibold text-teal hover:bg-cream-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
                        >
                          Highlight quote
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-lg border border-line bg-paper px-4 py-3.5">
            <div className="text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-4">
              Claim map
            </div>
            <div className="mt-3 space-y-2">
              {anchoredClaims === 0 ? (
                <div className="rounded-lg border border-line bg-cream px-3 py-2 text-[12px] text-ink-4">
                  No claims are anchored to this source yet.
                </div>
              ) : (
                claims
                  .filter((claim) => claim.document_anchor)
                  .slice(0, 8)
                  .map((claim) => (
                    <Link
                      key={claim.id}
                      href={sourceClaimDetailHref(claim, blocks)}
                      className="block rounded-lg border border-line bg-cream px-3 py-2 text-[12px] leading-snug text-ink-2 hover:bg-cream-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-teal">{claim.primary_label}</span>
                        <span className="shrink-0 text-[10.5px] text-ink-4">
                          {claim.score}/100
                        </span>
                      </div>
                      <div className="mt-1 line-clamp-2">{claim.claim_text}</div>
                      <div className="mt-1 text-[10.5px] text-ink-4">
                        {documentAnchorDetail(claim.document_anchor) ?? documentAnchorLabel(claim.document_anchor)}
                      </div>
                    </Link>
                  ))
              )}
            </div>
          </section>
        </aside>
      </div>
    </main>
  );
}
