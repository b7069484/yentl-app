import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { z } from "zod";

import {
  CONSENT_KEY,
  CONSENT_VERSION,
  ConsentGate,
} from "@/components/session/ConsentGate";

// ── Zod schema mirrors ConsentRecord ─────────────────────────────────────
const ConsentSchema = z.object({
  consent_id: z.string().min(10),
  choices: z.object({
    mic_stt: z.boolean(),
    ai_analysis: z.boolean(),
    web_search: z.boolean(),
    age_13plus: z.boolean(),
    analytics: z.boolean(),
  }),
  version: z.literal(CONSENT_VERSION),
  timestamp_iso: z.string().datetime(),
  locale: z.string().min(2),
});

describe("ConsentGate (yentl-this-week-actions clause 4)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  function checkRequiredBoxes() {
    fireEvent.click(screen.getByRole("checkbox", { name: /Microphone capture/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /AI analysis by Anthropic/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Web search by Anthropic/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /I am 13 or older/i }));
  }

  // (a) Modal renders when no `yentl.consent` exists
  it("(a) renders the modal when no consent record exists", () => {
    render(<ConsentGate />);
    expect(screen.getByText(/Before we start/i)).toBeTruthy();
  });

  // (b) Continue button is disabled until all 4 required boxes are checked
  it("(b) Continue is disabled until all 4 required boxes are checked", () => {
    render(<ConsentGate />);
    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /Microphone capture/i }));
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /AI analysis by Anthropic/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Web search by Anthropic/i }));
    expect((continueBtn as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole("checkbox", { name: /I am 13 or older/i }));
    expect((continueBtn as HTMLButtonElement).disabled).toBe(false);
  });

  // (c) Decline closes modal without calling onGrant
  it("(c) Decline calls onDecline and does NOT write localStorage", () => {
    let declined = false;
    let granted = false;
    render(
      <ConsentGate
        onDecline={() => {
          declined = true;
        }}
        onGrant={() => {
          granted = true;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Decline/i }));
    expect(declined).toBe(true);
    expect(granted).toBe(false);
    expect(window.localStorage.getItem(CONSENT_KEY)).toBeNull();
  });

  // (d) Continue writes localStorage with the correct shape
  it("(d) Continue writes a Zod-valid ConsentRecord to localStorage", () => {
    render(<ConsentGate />);
    checkRequiredBoxes();
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    const raw = window.localStorage.getItem(CONSENT_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    const result = ConsentSchema.safeParse(parsed);
    expect(result.success).toBe(true);
    expect(parsed.choices.mic_stt).toBe(true);
    expect(parsed.choices.ai_analysis).toBe(true);
    expect(parsed.choices.web_search).toBe(true);
    expect(parsed.choices.age_13plus).toBe(true);
    // Optional checkbox was not ticked
    expect(parsed.choices.analytics).toBe(false);
  });

  // (e) Subsequent render with valid localStorage skips the modal
  it("(e) skips the modal on subsequent render with valid localStorage", () => {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        consent_id: "01HZW1234567890ABCDEFGHJ",
        choices: {
          mic_stt: true,
          ai_analysis: true,
          web_search: true,
          age_13plus: true,
          analytics: false,
        },
        version: CONSENT_VERSION,
        timestamp_iso: new Date().toISOString(),
        locale: "en-US",
      }),
    );
    render(<ConsentGate />);
    expect(screen.queryByText(/Before we start/i)).toBeNull();
  });

  // (f) Version mismatch in localStorage re-shows the modal
  it("(f) re-shows the modal when stored version mismatches CONSENT_VERSION", () => {
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        consent_id: "01HZW1234567890ABCDEFGHJ",
        choices: {
          mic_stt: true,
          ai_analysis: true,
          web_search: true,
          age_13plus: true,
          analytics: false,
        },
        version: "0", // STALE
        timestamp_iso: new Date().toISOString(),
        locale: "en-US",
      }),
    );
    render(<ConsentGate />);
    expect(screen.getByText(/Before we start/i)).toBeTruthy();
  });
});
