"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ulid } from "ulid";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

// ─── Schema + storage ──────────────────────────────────────────────────────

export const CONSENT_VERSION = "1" as const;
export const CONSENT_KEY = "yentl.consent" as const;

export type ConsentChoices = {
  mic_stt: boolean;
  ai_analysis: boolean;
  web_search: boolean;
  age_13plus: boolean;
  analytics: boolean;
};

export type ConsentRecord = {
  consent_id: string;
  choices: ConsentChoices;
  version: typeof CONSENT_VERSION;
  timestamp_iso: string;
  locale: string;
};

const REQUIRED_KEYS: Array<keyof ConsentChoices> = [
  "mic_stt",
  "ai_analysis",
  "web_search",
  "age_13plus",
];

function readStoredConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>;
    if (parsed?.version !== CONSENT_VERSION) return null;
    if (!parsed.choices) return null;
    for (const k of REQUIRED_KEYS) {
      if (parsed.choices[k] !== true) return null;
    }
    return parsed as ConsentRecord;
  } catch {
    return null;
  }
}

export function hasValidConsent(): boolean {
  return readStoredConsent() !== null;
}

// ─── Component ────────────────────────────────────────────────────────────

const initialChoices: ConsentChoices = {
  mic_stt: false,
  ai_analysis: false,
  web_search: false,
  age_13plus: false,
  analytics: false,
};

export type ConsentGateProps = {
  /** Called after the user successfully grants consent. */
  onGrant?: (record: ConsentRecord) => void;
  /** Called when the user declines. */
  onDecline?: () => void;
};

export function ConsentGate({ onGrant, onDecline }: ConsentGateProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(true);
  const [choices, setChoices] = useState<ConsentChoices>(initialChoices);

  // Run after mount so SSR + first paint don't flash the modal for users
  // who already have valid consent.
  useEffect(() => {
    setMounted(true);
    if (hasValidConsent()) {
      setOpen(false);
    }
  }, []);

  const allRequiredChecked = useMemo(
    () => REQUIRED_KEYS.every((k) => choices[k]),
    [choices],
  );

  const toggle = useCallback((key: keyof ConsentChoices) => {
    setChoices((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const grant = useCallback(() => {
    if (!allRequiredChecked) return;
    const record: ConsentRecord = {
      consent_id: ulid(),
      choices,
      version: CONSENT_VERSION,
      timestamp_iso: new Date().toISOString(),
      locale:
        typeof navigator !== "undefined" && navigator.language
          ? navigator.language
          : "en-US",
    };
    try {
      window.localStorage.setItem(CONSENT_KEY, JSON.stringify(record));
    } catch {
      /* localStorage unavailable — proceed in-memory only */
    }
    setOpen(false);
    onGrant?.(record);
  }, [allRequiredChecked, choices, onGrant]);

  const decline = useCallback(() => {
    setOpen(false);
    onDecline?.();
  }, [onDecline]);

  if (!mounted) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && decline()}>
      <DialogContent
        showCloseButton={false}
        className="max-w-[440px] gap-4 bg-cream px-5 pb-5 pt-6"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="gap-1.5 text-left">
          <DialogTitle
            className="font-serif text-[22px] font-medium leading-[1.2] tracking-[-.01em] text-ink"
            style={{ fontVariationSettings: "'opsz' 36, 'SOFT' 50" }}
          >
            Before we start.
          </DialogTitle>
          <DialogDescription className="font-serif text-[13.5px] italic leading-[1.45] text-ink-3">
            Yentl needs your explicit consent for each thing it does. Tick all
            four required boxes to continue.
          </DialogDescription>
        </DialogHeader>

        {/* Article 9 disclosure */}
        <div
          className="rounded-[12px] border px-3.5 py-3 text-[12px] leading-[1.5] text-ink-2"
          style={{
            background: "#FEF3C7",
            borderColor: "rgba(245,158,11,.32)",
          }}
        >
          <p>
            <strong className="font-semibold">Sensitive-data notice.</strong>{" "}
            This conversation may reveal sensitive information about you or
            others, including political views, health, religion, sexual
            orientation, or ethnicity. By continuing you give explicit consent
            under GDPR Article 9(2)(a) to this processing.
          </p>
        </div>

        {/* Choices */}
        <fieldset className="flex flex-col gap-2 border-0 p-0">
          <legend className="sr-only">Consent choices</legend>

          {[
            {
              key: "mic_stt" as const,
              required: true,
              label:
                "Microphone capture + transcription via Deepgram (US-based by default; EU users routed to api.eu.deepgram.com).",
            },
            {
              key: "ai_analysis" as const,
              required: true,
              label:
                "AI analysis by Anthropic (Claude) — claim fact-checking and bias/fallacy detection.",
            },
            {
              key: "web_search" as const,
              required: true,
              label:
                "Web search by Anthropic for source citations.",
            },
            {
              key: "age_13plus" as const,
              required: true,
              label: "I am 13 or older.",
            },
            {
              key: "analytics" as const,
              required: false,
              label:
                "Anonymous usage analytics (no audio, no transcripts) — optional.",
            },
          ].map(({ key, required, label }) => (
            <label
              key={key}
              className="group flex cursor-pointer items-start gap-2.5 rounded-[10px] border border-line bg-white px-3 py-2.5 text-[12.5px] leading-[1.4] text-ink-2 transition-colors hover:border-teal/40"
            >
              <input
                type="checkbox"
                name={key}
                checked={choices[key]}
                onChange={() => toggle(key)}
                required={required}
                aria-required={required}
                className="mt-[2px] h-4 w-4 flex-shrink-0 cursor-pointer rounded border border-ink-5 accent-teal focus:ring-2 focus:ring-teal/40 focus:ring-offset-2"
              />
              <span className="flex-1">
                {label}
                {required && (
                  <span className="ml-1 font-mono text-[9.5px] font-bold uppercase tracking-[.06em] text-[#B91C1C]">
                    required
                  </span>
                )}
              </span>
            </label>
          ))}
        </fieldset>

        {/* No-persistence commitment */}
        <p className="px-1 text-[11.5px] leading-[1.5] text-ink-3">
          <strong className="font-semibold text-ink-2">No persistence.</strong>{" "}
          Yentl does not store audio or transcripts on its servers in v1. Audio
          streams directly from your browser to Deepgram. AI analysis happens
          in memory and is discarded when you end the session.
        </p>

        {/* Actions */}
        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={decline}
            className="h-11 px-4 text-[13.5px] font-semibold"
          >
            Decline
          </Button>
          <Button
            type="button"
            onClick={grant}
            disabled={!allRequiredChecked}
            className="h-11 px-5 text-[14px] font-semibold"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
