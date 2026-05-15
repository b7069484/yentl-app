"use client";

import { AudioMeter } from "./AudioMeter";

interface Props {
  micStream: MediaStream | null;
}

export function ListeningEmptyState({ micStream }: Props) {
  return (
    <div className="py-12">
      <div className="max-w-[480px] mx-auto flex flex-col items-center gap-4 text-center">
        {/* Pulsing amber dot */}
        <span
          aria-hidden="true"
          className="block w-3 h-3 rounded-full bg-amber-400 animate-pulse"
        />

        {/* Headline */}
        <h2 className="font-serif text-[22px] font-medium text-ink">
          Listening for first words…
        </h2>

        {/* Subtitle */}
        <p className="text-[13px] text-ink-3">
          Speak naturally. Yenta will transcribe, fact-check, and surface biases live.
        </p>

        {/* Live mic-level meter */}
        <AudioMeter stream={micStream} />

        {/* Skeleton hint rows */}
        <div className="w-full flex flex-col gap-2.5 mt-2">
          {/* Synthesis hint ~80% width */}
          <div
            aria-hidden="true"
            className="bg-cream-2 rounded h-2.5 animate-pulse"
            style={{ width: "80%" }}
          />
          {/* Claims hint ~60% width */}
          <div
            aria-hidden="true"
            className="bg-cream-2 rounded h-2.5 animate-pulse"
            style={{ width: "60%" }}
          />
          {/* Markers hint ~70% width */}
          <div
            aria-hidden="true"
            className="bg-cream-2 rounded h-2.5 animate-pulse"
            style={{ width: "70%" }}
          />
        </div>
      </div>
    </div>
  );
}
