"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { sessionViewHref } from "@/lib/client/session-route";
import { ClaimDetail } from "./claim-detail";
import { MarkerDetail } from "./marker-detail";
import {
  findSourceDetailSelection,
  SourceDetail,
  sourceDetailId,
  type SourceDetailSelection,
} from "./source-detail";
import { claimSiblings, markerSiblings, sourceBlockIndexFromQuery } from "@/lib/client/sibling-nav";
import type { Siblings } from "@/lib/client/sibling-nav";

// ─── parseFromQuery ───────────────────────────────────────────────────────────
//
// The L2 FilteredList passes the current filter state as a compact string in
// the ?from= query param when navigating to detail:
//   e.g. from=verdict:false,partial|speaker:0|sort:score
//
// We parse that back into a URLSearchParams so sibling-nav can reconstruct the
// filtered+sorted pool, preserving list context in the L3 view.

export function parseFromQuery(from: string | null): URLSearchParams | null {
  if (!from) return null;
  try {
    const params = new URLSearchParams();
    for (const pair of from.split("|")) {
      const colonIdx = pair.indexOf(":");
      if (colonIdx === -1) continue;
      const key = pair.slice(0, colonIdx).trim();
      const value = pair.slice(colonIdx + 1).trim();
      if (key && value) params.set(key, value);
    }
    return params;
  } catch {
    return null;
  }
}

// ─── originLabel ─────────────────────────────────────────────────────────────
// Human-readable breadcrumb text based on the from-query filter context.

export function originLabel(fromQuery: URLSearchParams | null): string {
  if (!fromQuery) return "Overview";

  const sourceBlockIndex = sourceBlockIndexFromQuery(fromQuery);
  const verdict = fromQuery.get("verdict");
  const type = fromQuery.get("type");
  const severity = fromQuery.get("severity");
  const speaker = fromQuery.get("speaker");

  if (sourceBlockIndex !== null) {
    return `Source block ${sourceBlockIndex + 1}`;
  }
  if (verdict) {
    const labels = verdict
      .split(",")
      .map((v) => v.toUpperCase())
      .join(", ");
    return `All ${labels} claims`;
  }
  if (type) {
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);
    if (severity) {
      const sevLabel = severity.charAt(0).toUpperCase() + severity.slice(1);
      return `${sevLabel} ${typeLabel} markers`;
    }
    return `All ${typeLabel} markers`;
  }
  if (speaker !== null) {
    const speakerNum = parseInt(speaker, 10);
    return `Speaker ${isNaN(speakerNum) ? speaker : speakerNum + 1} items`;
  }
  return "Overview";
}

// ─── DetailFrame ──────────────────────────────────────────────────────────────

function DetailFrame({
  breadcrumbLabel,
  siblings,
  onBack,
  onPrev,
  onNext,
  children,
}: {
  breadcrumbLabel: string;
  siblings: Siblings;
  onBack: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full min-h-screen bg-cream">
      {/* Top chrome: breadcrumb + sibling nav */}
      <div className="px-6 md:px-8 pt-5 max-w-[820px] mx-auto w-full flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          data-testid="detail-back-btn"
          className="inline-flex min-h-11 min-w-11 max-w-[52vw] items-center gap-1.5 rounded-md px-1.5 text-[12px] text-ink-3 hover:text-ink-2 font-medium transition-colors"
        >
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M10 4L6 8l4 4" />
          </svg>
          <span className="truncate">{breadcrumbLabel}</span>
        </button>

        {siblings.total > 1 && (
          <div className="flex flex-shrink-0 items-center gap-1 text-[11px] text-ink-4">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              aria-label="Previous item"
              data-testid="detail-prev-btn"
              title="Previous (↑)"
              className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-cream-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2 8L6 4l4 4" />
              </svg>
            </button>
            <span className="tabular-nums min-w-[40px] text-center">
              {siblings.index + 1} of {siblings.total}
            </span>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label="Next item"
              data-testid="detail-next-btn"
              title="Next (↓)"
              className="flex h-11 w-11 min-h-11 min-w-11 items-center justify-center rounded-md hover:bg-cream-2 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                className="w-3 h-3"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M2 4l4 4 4-4" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      {children}
    </div>
  );
}

// ─── NotFound ─────────────────────────────────────────────────────────────────

export function NotFound({ onBack }: { onBack: () => void }) {
  return (
    <div className="px-6 pt-12 pb-12 max-w-[820px] mx-auto text-center">
      <div className="font-serif text-[20px] text-ink-2">
        This item isn&apos;t in the current session.
      </div>
      <div className="text-[12px] text-ink-4 mt-2">
        It may have been removed or the link came from an older session.
      </div>
      <button
        type="button"
        onClick={onBack}
        data-testid="detail-notfound-back-btn"
        className="inline-flex min-h-11 items-center gap-1.5 mt-5 px-4 py-2 text-[12px] bg-paper border border-line rounded-lg hover:bg-cream-2 transition-colors"
      >
        ← Go back
      </button>
    </div>
  );
}

// ─── ItemDetail ───────────────────────────────────────────────────────────────

export function ItemDetail({
  type,
  id,
}: {
  type: "claim" | "marker" | "source";
  id: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);

  // Guard against the server/first-render window where the Zustand store
  // hasn't hydrated yet. Without this, claims/markers are empty on first
  // paint and the NotFound fallback fires prematurely (Bug 2).
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional hydration guard
  useEffect(() => { setMounted(true); }, []);

  const fromQuery = parseFromQuery(searchParams.get("from"));
  const sourceBlockIndex = sourceBlockIndexFromQuery(fromQuery);
  const sourceSelection =
    type === "source" ? findSourceDetailSelection(claims, id) : null;
  const siblings =
    type === "claim"
      ? claimSiblings(claims, id, fromQuery)
      : type === "marker"
        ? markerSiblings(markers, id, fromQuery)
        : sourceSiblings(sourceSelection);

  const qStr = searchParams.toString();

  // Keyboard navigation: ↑/↓ for prev/next, Escape to go back
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowUp" && siblings.prev) {
        e.preventDefault();
        router.push(
          `/session/detail/${type}/${siblings.prev}${qStr ? `?${qStr}` : ""}`,
        );
      } else if (e.key === "ArrowDown" && siblings.next) {
        e.preventDefault();
        router.push(
          `/session/detail/${type}/${siblings.next}${qStr ? `?${qStr}` : ""}`,
        );
      } else if (e.key === "Escape") {
        router.back();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [siblings.prev, siblings.next, type, router, qStr]);

  function onBack() {
    if (sourceBlockIndex !== null) {
      router.push(
        sessionViewHref(searchParams, "source", {
          block: sourceBlockIndex,
          from: null,
        }),
      );
      return;
    }
    if (type === "source" && sourceSelection) {
      router.push(`/session/detail/claim/${sourceSelection.claim.id}${qStr ? `?${qStr}` : ""}`);
      return;
    }
    router.back();
  }
  const breadcrumbLabel = type === "source" ? "Parent claim" : originLabel(fromQuery);

  // Wait for client hydration before checking the store (see mounted state above).
  if (!mounted) return null;

  if (type === "claim") {
    const claim = claims.find((c) => c.id === id);
    if (!claim) return <NotFound onBack={onBack} />;

    const onPrev = siblings.prev
      ? () =>
          router.push(
            `/session/detail/claim/${siblings.prev}${qStr ? `?${qStr}` : ""}`,
          )
      : undefined;
    const onNext = siblings.next
      ? () =>
          router.push(
            `/session/detail/claim/${siblings.next}${qStr ? `?${qStr}` : ""}`,
          )
      : undefined;

    return (
      <DetailFrame
        breadcrumbLabel={breadcrumbLabel}
        siblings={siblings}
        onBack={onBack}
        onPrev={onPrev}
        onNext={onNext}
      >
        <ClaimDetail claim={claim} speakers={speakers} />
      </DetailFrame>
    );
  }

  if (type === "source") {
    if (!sourceSelection) return <NotFound onBack={onBack} />;

    const onPrev = siblings.prev
      ? () =>
          router.push(
            `/session/detail/source/${siblings.prev}${qStr ? `?${qStr}` : ""}`,
          )
      : undefined;
    const onNext = siblings.next
      ? () =>
          router.push(
            `/session/detail/source/${siblings.next}${qStr ? `?${qStr}` : ""}`,
          )
      : undefined;

    return (
      <DetailFrame
        breadcrumbLabel={breadcrumbLabel}
        siblings={siblings}
        onBack={onBack}
        onPrev={onPrev}
        onNext={onNext}
      >
        <SourceDetail selection={sourceSelection} />
      </DetailFrame>
    );
  }

  // type === "marker"
  const marker = markers.find((m) => m.id === id);
  if (!marker) return <NotFound onBack={onBack} />;

  const onPrev = siblings.prev
    ? () =>
        router.push(
          `/session/detail/marker/${siblings.prev}${qStr ? `?${qStr}` : ""}`,
        )
    : undefined;
  const onNext = siblings.next
    ? () =>
        router.push(
          `/session/detail/marker/${siblings.next}${qStr ? `?${qStr}` : ""}`,
        )
    : undefined;

  return (
    <DetailFrame
      breadcrumbLabel={breadcrumbLabel}
      siblings={siblings}
      onBack={onBack}
      onPrev={onPrev}
      onNext={onNext}
    >
      <MarkerDetail marker={marker} speakers={speakers} />
    </DetailFrame>
  );
}

function sourceSiblings(selection: SourceDetailSelection | null): Siblings {
  if (!selection) return { prev: null, next: null, index: -1, total: 0 };

  const { claim, sourceIndex } = selection;
  return {
    prev: sourceIndex > 0 ? sourceDetailId(claim.id, sourceIndex - 1) : null,
    next: sourceIndex < claim.sources.length - 1 ? sourceDetailId(claim.id, sourceIndex + 1) : null,
    index: sourceIndex,
    total: claim.sources.length,
  };
}
