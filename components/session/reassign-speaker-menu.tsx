"use client";

/**
 * ReassignSpeakerMenu
 *
 * A small popover that lets the user re-attribute a transcript segment to a
 * different speaker (or a brand-new one).  Renders as an inline speaker badge
 * that opens a DropdownMenu on click.
 *
 * Usage:
 *   <ReassignSpeakerMenu transcriptIndex={idx} speakerId={seg.speaker_id} />
 */

import { useSession } from "@/lib/client/session-store";
import { paletteFor } from "@/components/session/TranscriptView";
import { DropdownMenu } from "radix-ui";
import type { SpeakerId } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PlusIcon } from "lucide-react";

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
  const reassignUtterance = useSession((s) => s.reassignUtterance);
  const addNewSpeaker = useSession((s) => s.addNewSpeaker);

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

  return (
    <DropdownMenu.Root>
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
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
