"use client";

import { useState, useRef } from "react";
import type { Speaker } from "@/lib/types";
import { SpeakerChip } from "./chips";

// ─── 5-bar status meter ───────────────────────────────────────────────────────

const BAR_HEIGHTS = [5, 8, 11, 8, 5] as const;
// Indices 1, 2, 3 are the "middle 3" bars (0-indexed)
const MIDDLE_INDICES = new Set([1, 2, 3]);

function StatusMeter({ active }: { active: boolean }) {
  return (
    <div className="ml-auto flex items-end gap-[1.5px] pr-0.5" aria-hidden>
      {BAR_HEIGHTS.map((h, i) => {
        const isMiddle = MIDDLE_INDICES.has(i);
        const colorClass = active && isMiddle ? "bg-green" : "bg-ink-4";
        return (
          <span
            key={i}
            className={`w-[3px] rounded-[1px] ${colorClass}`}
            style={{ height: `${h}px` }}
          />
        );
      })}
    </div>
  );
}

// ─── SpeakerRail ─────────────────────────────────────────────────────────────

export function SpeakerRail({
  speakers,
  activeSpeakerId,
  onRename,
  emptyLabel = "Listening for voices…",
  meterActive,
}: {
  speakers: Speaker[];
  activeSpeakerId: number | null;
  onRename: (id: number, label: string) => void;
  emptyLabel?: string;
  meterActive?: boolean;
}) {
  const [editingId, setEditingId] = useState<number | null>(null);
  // pendingEditIdRef lets handleSave know which chip to open next after blur
  const pendingEditIdRef = useRef<number | null>(null);

  function handleChipClick(speaker: Speaker) {
    if (editingId === speaker.id) return; // already editing this one

    if (editingId !== null) {
      // There is a chip currently in editing state. Clicking chip B triggers
      // chip A's onBlur first (which calls handleSave → clears editingId), then
      // chip B's onEditStart. We record which chip should open next so that
      // handleSave can schedule it — avoiding a double-save race with the blur.
      pendingEditIdRef.current = speaker.id;
      // The blur will fire synchronously (in jsdom) or very shortly after, and
      // handleSave will pick up pendingEditIdRef and open chip B.
      return;
    }

    setEditingId(speaker.id);
  }

  function handleSave(id: number, newLabel: string) {
    onRename(id, newLabel);
    const nextId = pendingEditIdRef.current;
    pendingEditIdRef.current = null;
    // If a pending chip was queued (click-while-editing), open it now
    setEditingId(nextId);
  }

  function handleCancel() {
    pendingEditIdRef.current = null;
    setEditingId(null);
  }

  const isActive = meterActive ?? activeSpeakerId !== null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-b border-line-soft bg-cream px-3 py-2 sm:px-4">
      {speakers.length === 0 ? (
        <span className="text-[11.5px] italic text-ink-4">
          {emptyLabel}
        </span>
      ) : (
        speakers.map((speaker) => {
          const active = speaker.id === activeSpeakerId;
          return (
            <div
              key={speaker.id}
              className={
                active
                  ? "ring-2 ring-[rgba(216,155,44,0.18)] rounded-full"
                  : undefined
              }
            >
              <SpeakerChip
                speakerId={speaker.id}
                label={speaker.label}
                editing={editingId === speaker.id}
                onEditStart={() => handleChipClick(speaker)}
                onSave={(newLabel) => handleSave(speaker.id, newLabel)}
                onCancel={handleCancel}
              />
            </div>
          );
        })
      )}
      <StatusMeter active={isActive} />
    </div>
  );
}
