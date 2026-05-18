import { ulid } from "ulid";
import { CONSENT_VERSION } from "@/lib/copy/consent";

// localStorage record of the user's last consent decision. Stored client-side
// only — when v2 introduces accounts, sync this record to the user row.

const STORAGE_KEY = "yentl_consent";

export type ConsentChoices = {
  mic_stt: boolean;
  ai_analysis: boolean;
  web_search: boolean;
  analytics: boolean;
  age_13_plus: boolean;
};

export type ConsentRecord = {
  consent_id: string;
  version: string;
  timestamp_iso: string;
  locale: string;
  choices: ConsentChoices;
};

// Returns null when localStorage is unavailable, no record exists, the
// stored record is malformed, or its version doesn't match CONSENT_VERSION
// (which forces a re-prompt after a policy doc bump).
export function readConsent(): ConsentRecord | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ConsentRecord;
    if (parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Persist a fresh consent record. Returns the written record so the caller
// can stamp it onto session state.
export function writeConsent(choices: ConsentChoices): ConsentRecord {
  const record: ConsentRecord = {
    consent_id: ulid(),
    version: CONSENT_VERSION,
    timestamp_iso: new Date().toISOString(),
    locale: typeof navigator !== "undefined" ? navigator.language : "en",
    choices,
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  }
  return record;
}

// True when stored consent covers the three required processors + age.
// Analytics is optional and doesn't gate anything.
export function hasValidConsent(record: ConsentRecord | null): boolean {
  if (!record) return false;
  const { choices } = record;
  return (
    choices.mic_stt &&
    choices.ai_analysis &&
    choices.web_search &&
    choices.age_13_plus
  );
}

export function clearConsent(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
