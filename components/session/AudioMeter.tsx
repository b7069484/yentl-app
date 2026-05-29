"use client";
import { useEffect, useRef } from "react";

const BAR_COUNT = 5;
const THRESHOLDS = [0.05, 0.10, 0.18, 0.30, 0.45];   // RMS levels at which each bar lights

/**
 * Pure helper — exported for unit testing. Converts a Uint8Array of
 * AudioContext.getByteTimeDomainData() samples (centered around 128) into a
 * normalized RMS amplitude in the range [0, 1].
 */
export function rmsFromTimeDomain(buf: Uint8Array): number {
  if (buf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < buf.length; i++) {
    const v = (buf[i] - 128) / 128;
    sum += v * v;
  }
  return Math.sqrt(sum / buf.length);
}

export function AudioMeter({
  stream,
  onRmsSample,
}: {
  stream: MediaStream | null;
  onRmsSample?: (rms: number) => void;
}) {
  const barsRef = useRef<Array<HTMLSpanElement | null>>([]);
  const rafRef = useRef<number | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const a11yRef = useRef<HTMLOutputElement | null>(null);

  useEffect(() => {
    if (!stream) {
      // Reset bars to idle
      barsRef.current.forEach((el) => {
        if (el) el.style.background = "rgb(148 163 184 / 0.4)"; // slate-400/40
      });
      if (a11yRef.current) a11yRef.current.textContent = "Microphone silent";
      return;
    }

    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    ctxRef.current = ctx;
    const src = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    src.connect(analyser);
    const buf = new Uint8Array(analyser.frequencyBinCount);

    // Throttle accessibility announcements to ~1 Hz so screen readers aren't flooded
    let lastAnnounceMs = 0;
    let lastAnnounceState: "active" | "silent" | null = null;
    const ACTIVE_THRESHOLD = THRESHOLDS[0];

    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      const level = rmsFromTimeDomain(buf);
      barsRef.current.forEach((el, i) => {
        if (!el) return;
        const active = level >= THRESHOLDS[i];
        el.style.background = active ? "rgb(16 185 129)" : "rgb(148 163 184 / 0.4)";
      });
      // Emit RMS sample to the orchestrator for prosody persistence (Phase 1a)
      onRmsSample?.(level);
      // Throttled accessible announcement — at most once per second, state-change only
      const now = performance.now();
      if (now - lastAnnounceMs >= 1000) {
        const state: "active" | "silent" = level >= ACTIVE_THRESHOLD ? "active" : "silent";
        if (state !== lastAnnounceState && a11yRef.current) {
          a11yRef.current.textContent = state === "active" ? "Microphone active" : "Microphone silent";
          lastAnnounceState = state;
        }
        lastAnnounceMs = now;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    tick();
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      void ctx.close();
      ctxRef.current = null;
    };
  }, [stream, onRmsSample]);

  // Committee amendment (Accessibility — WCAG 1.1.1 / 1.3.3): the 5 visual bars
  // are decorative (aria-hidden). A visually-hidden, polite live region carries
  // the actual signal for screen reader / Deaf users, throttled to 1 Hz and only
  // announcing state transitions (not every frame).
  return (
    <div className="flex h-3.5 items-end gap-0.5">
      <output
        ref={a11yRef}
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        Microphone silent
      </output>
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          ref={(el) => { barsRef.current[i] = el; }}
          className="w-1 rounded-sm transition-[background] duration-75"
          style={{
            height: `${30 + i * 17.5}%`,
            background: "rgb(148 163 184 / 0.4)",
          }}
        />
      ))}
    </div>
  );
}
