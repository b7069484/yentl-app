"use client";

/**
 * ReassignSpeakerMenu
 *
 * A small popover that lets the user re-attribute a transcript segment to a
 * different speaker (or a brand-new one).  Renders as an inline speaker badge
 * that opens a DropdownMenu on click.
 *
 * Also exposes a "Split & reassign…" sub-menu for splitting a multi-word
 * utterance at a word boundary and re-attributing the post-split portion to a
 * different speaker.
 *
 * UX flow:
 *   Main menu → "Split & reassign…" sub-trigger
 *     → word chips (clicking a word picks the split boundary)
 *       → speaker list replaces word chips in same sub-content
 *
 * Usage:
 *   <ReassignSpeakerMenu transcriptIndex={idx} speakerId={seg.speaker_id} />
 */

import React, { useState, useCallback } from "react";
import { useSession } from "@/lib/client/session-store";
import { paletteFor } from "@/lib/client/speaker-palette";
import { DropdownMenu } from "radix-ui";
import type { SpeakerId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlusIcon, ScissorsIcon, ChevronRightIcon, ArrowLeftIcon } from "lucide-react";
export { computeSplitTime } from "@/lib/client/utterance-split";
import { computeSplitTime } from "@/lib/client/utterance-split";

interface ReassignSpeakerMenuProps {
  transcriptIndex: number;
  speakerId: SpeakerId | null;
  /** Extra class names on the trigger badge */
  className?: string;
}

export function ReassignSpeakerMenu({
  transcriptIndex,
  speakerId,
  className,
}: ReassignSpeakerMenuProps) {
  const speakers = useSession((s) => s.speakers);
  const transcript = useSession((s) => s.transcript);
  const reassignUtterance = useSession((s) => s.reassignUtterance);
  const addNewSpeaker = useSession((s) => s.addNewSpeaker);
  const splitSegmentAt = useSession((s) => s.splitSegmentAt);

  // The segment we're operating on (may be undefined if transcript hasn't loaded yet)
  const segment = transcript[transcriptIndex];
  const segWords = segment
    ? segment.text.trim().split(/\s+/).filter((w) => w.length > 0)
    : [];
  // Splitting requires at least 2 words (at least one boundary)
  const canSplit = segWords.length >= 2;

  // Track which word index was selected for split (null = not yet picked)
  const [splitWordIndex, setSplitWordIndex] = useState<number | null>(null);

  const label =
    speakerId !== null
      ? (speakers.find((sp) => sp.id === speakerId)?.label ?? `Speaker ${speakerId + 1}`)
      : "Unknown";

  const palette = speakerId !== null ? paletteFor(speakerId) : null;

  function handleSelect(id: SpeakerId) {
    reassignUtterance(transcriptIndex, id);
  }

  function handleAddNew() {
    const newId = addNewSpeaker();
    reassignUtterance(transcriptIndex, newId);
  }

  const handleWordPick = useCallback((e: Event, wordIdx: number) => {
    e.preventDefault(); // keep menu open
    setSplitWordIndex(wordIdx);
  }, []);

  const handleSplitSpeakerSelect = useCallback((newSpeakerId: SpeakerId) => {
    if (splitWordIndex === null || !segment) return;
    const splitTime = computeSplitTime(
      segment.text,
      segment.start,
      segment.end,
      splitWordIndex,
    );
    splitSegmentAt(transcriptIndex, splitTime, newSpeakerId);
    setSplitWordIndex(null);
  }, [splitWordIndex, segment, splitSegmentAt, transcriptIndex]);

  const handleSplitAddNew = useCallback(() => {
    const newId = addNewSpeaker();
    handleSplitSpeakerSelect(newId);
  }, [addNewSpeaker, handleSplitSpeakerSelect]);

  function handleSplitSubOpenChange(open: boolean) {
    if (!open) setSplitWordIndex(null);
  }

  function handleRootOpenChange(open: boolean) {
    if (!open) setSplitWordIndex(null);
  }

  return (
    <DropdownMenu.Root onOpenChange={handleRootOpenChange}>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          data-testid={`reassign-trigger-${transcriptIndex}`}
          aria-label={`Reassign speaker (currently ${label})`}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-border/50 bg-background px-1.5 py-0.5",
            "text-[10px] font-medium text-foreground/80 cursor-pointer",
            "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "transition-colors select-none",
            className,
          )}
        >
          {palette && (
            <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", palette.dot)} />
          )}
          {label}
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={4}
          className={cn(
            "z-50 min-w-[160px] rounded-lg border border-line bg-popover p-1",
            "shadow-md text-[12px] text-foreground",
            "animate-in fade-in-0 zoom-in-95",
          )}
        >
          <div className="px-2 py-1 text-[9.5px] tracking-[.12em] uppercase text-ink-4 font-bold select-none">
            Reassign to
          </div>

          {speakers.map((sp) => {
            const pal = paletteFor(sp.id);
            const isActive = sp.id === speakerId;
            return (
              <DropdownMenu.Item
                key={sp.id}
                data-testid={`reassign-option-${sp.id}`}
                onSelect={() => handleSelect(sp.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer outline-none",
                  "hover:bg-muted focus:bg-muted transition-colors",
                  isActive && "font-semibold",
                )}
              >
                <span aria-hidden className={cn("h-2 w-2 rounded-full flex-shrink-0", pal.dot)} />
                <span className="flex-1 min-w-0 truncate">{sp.label}</span>
                {isActive && (
                  <span aria-hidden className="text-[9px] text-ink-4">✓</span>
                )}
              </DropdownMenu.Item>
            );
          })}

          {speakers.length > 0 && (
            <DropdownMenu.Separator className="my-1 h-px bg-line" />
          )}

          <DropdownMenu.Item
            data-testid="reassign-add-new"
            onSelect={handleAddNew}
            className={cn(
              "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer outline-none",
              "hover:bg-muted focus:bg-muted transition-colors text-ink-3",
            )}
          >
            <PlusIcon className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span>Add new speaker</span>
          </DropdownMenu.Item>

          {/* ── Split & reassign sub-menu ───────────────────────────── */}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />

          {canSplit ? (
            <DropdownMenu.Sub onOpenChange={handleSplitSubOpenChange}>
              <DropdownMenu.SubTrigger
                data-testid="split-reassign-trigger"
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer outline-none",
                  "hover:bg-muted focus:bg-muted transition-colors text-ink-3",
                )}
              >
                <ScissorsIcon className="h-3 w-3 flex-shrink-0" aria-hidden />
                <span className="flex-1">Split &amp; reassign…</span>
                <ChevronRightIcon className="h-3 w-3 flex-shrink-0 ml-auto" aria-hidden />
              </DropdownMenu.SubTrigger>
              <DropdownMenu.Portal>
                <DropdownMenu.SubContent
                  sideOffset={2}
                  className={cn(
                    "z-50 min-w-[200px] rounded-lg border border-line bg-popover p-2",
                    "shadow-md text-[12px] text-foreground",
                    "animate-in fade-in-0 zoom-in-95",
                  )}
                >
                  {splitWordIndex === null ? (
                    // Step 1: pick a word boundary
                    <>
                      <div className="px-1 pb-1.5 text-[9.5px] tracking-[.12em] uppercase text-ink-4 font-bold select-none">
                        Split after word…
                      </div>
                      {/* All words except the last can be split points */}
                      <div className="flex flex-wrap gap-1 px-1 pb-1" data-testid="split-word-chips">
                        {segWords.slice(0, -1).map((word, idx) => (
                          <DropdownMenu.Item
                            key={idx}
                            data-testid={`split-word-${idx}`}
                            onSelect={(e) => handleWordPick(e, idx)}
                            className={cn(
                              "rounded border border-border/60 bg-muted/60 px-1.5 py-0.5",
                              "text-[10px] cursor-pointer outline-none",
                              "hover:bg-muted focus:bg-muted transition-colors",
                            )}
                          >
                            {word}
                          </DropdownMenu.Item>
                        ))}
                      </div>
                      <div className="px-1 pt-1 text-[9px] text-ink-4 select-none">
                        Click a word to pick the split boundary
                      </div>
                    </>
                  ) : (
                    // Step 2: pick new speaker for post-split portion
                    <>
                      <div className="flex items-center gap-1 px-1 pb-1.5">
                        <button
                          type="button"
                          data-testid="split-back-button"
                          onClick={() => setSplitWordIndex(null)}
                          className="rounded p-0.5 hover:bg-muted text-ink-4 outline-none"
                          aria-label="Back to word selection"
                        >
                          <ArrowLeftIcon className="h-3 w-3" aria-hidden />
                        </button>
                        <div className="text-[9.5px] tracking-[.12em] uppercase text-ink-4 font-bold select-none">
                          After &ldquo;{segWords[splitWordIndex]}&rdquo; → assign to
                        </div>
                      </div>
                      {speakers.map((sp) => {
                        const pal = paletteFor(sp.id);
                        return (
                          <DropdownMenu.Item
                            key={sp.id}
                            data-testid={`split-speaker-option-${sp.id}`}
                            onSelect={() => handleSplitSpeakerSelect(sp.id)}
                            className={cn(
                              "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer outline-none",
                              "hover:bg-muted focus:bg-muted transition-colors",
                            )}
                          >
                            <span aria-hidden className={cn("h-2 w-2 rounded-full flex-shrink-0", pal.dot)} />
                            <span className="flex-1 min-w-0 truncate">{sp.label}</span>
                          </DropdownMenu.Item>
                        );
                      })}
                      {speakers.length > 0 && (
                        <DropdownMenu.Separator className="my-1 h-px bg-line" />
                      )}
                      <DropdownMenu.Item
                        data-testid="split-add-new-speaker"
                        onSelect={handleSplitAddNew}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 cursor-pointer outline-none",
                          "hover:bg-muted focus:bg-muted transition-colors text-ink-3",
                        )}
                      >
                        <PlusIcon className="h-3 w-3 flex-shrink-0" aria-hidden />
                        <span>New speaker</span>
                      </DropdownMenu.Item>
                    </>
                  )}
                </DropdownMenu.SubContent>
              </DropdownMenu.Portal>
            </DropdownMenu.Sub>
          ) : (
            // Single-word or empty segment: Split is disabled
            <DropdownMenu.Item
              disabled
              data-testid="split-reassign-disabled"
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 outline-none",
                "text-ink-4 opacity-50 cursor-not-allowed",
              )}
            >
              <ScissorsIcon className="h-3 w-3 flex-shrink-0" aria-hidden />
              <span>Split &amp; reassign…</span>
            </DropdownMenu.Item>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
