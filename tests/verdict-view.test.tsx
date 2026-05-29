import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { VerdictView } from "@/components/verdict/VerdictView";
import type { Session, ClaimCard } from "@/lib/types";

function makeClaim(overrides: Partial<ClaimCard> = {}): ClaimCard {
  return {
    id: "claim_1",
    claim_text: "The city doubled the library budget.",
    utterance_start: 0,
    utterance_end: 5,
    speaker_id: 0,
    topic: "government",
    topic_secondary: null,
    primary_label: "FALSE",
    score: 0.82,
    annotations: [],
    explanation: "Budget was increased by 12%, not doubled.",
    status: "confirmed",
    sources: [],
    ...overrides,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    title: "Test verdict session",
    started_at: "2026-05-29T00:00:00.000Z",
    ended_at: "2026-05-29T00:05:00.000Z",
    transcript: [],
    claims: [makeClaim()],
    markers: [],
    speakers: [{ id: 0, label: "Speaker 1" }],
    source: { kind: "mic" },
    ...overrides,
  };
}

describe("VerdictView (Phase 1b Task 2)", () => {
  it("renders the session title", () => {
    const session = makeSession({ title: "Yentl verdict: library budget" });
    render(<VerdictView sessionId="sess_test" session={session} />);
    expect(
      screen.getByRole("heading", { level: 1, name: /library budget/i }),
    ).toBeInTheDocument();
  });

  it("renders every ClaimCard from the session", () => {
    const session = makeSession({
      claims: [
        makeClaim({ id: "c1", claim_text: "Claim A" }),
        makeClaim({ id: "c2", claim_text: "Claim B" }),
        makeClaim({ id: "c3", claim_text: "Claim C" }),
      ],
    });
    render(<VerdictView sessionId="sess_test" session={session} />);

    // ClaimCard wraps claim_text in curly quotes, so use regex matchers.
    expect(screen.getByText(/Claim A/)).toBeInTheDocument();
    expect(screen.getByText(/Claim B/)).toBeInTheDocument();
    expect(screen.getByText(/Claim C/)).toBeInTheDocument();
  });

  it("renders the synthesis summary when present", () => {
    const session = makeSession({
      synthesis: {
        text: "The speakers debated municipal budgets with mixed accuracy.",
        headlines: [],
        per_speaker_verdicts: [],
        at: 1234,
      },
    });
    render(<VerdictView sessionId="sess_test" session={session} />);
    expect(
      screen.getByText(/debated municipal budgets/i),
    ).toBeInTheDocument();
  });

  it("includes the AI Generated disclosure (AI Act Art 50 prep)", () => {
    const session = makeSession();
    render(<VerdictView sessionId="sess_test" session={session} />);
    // AIGeneratedBadge renders text containing "AI" — assert it's present
    expect(screen.getByText(/ai-generated/i)).toBeInTheDocument();
  });

  it("shows an empty-state message when the session has no claims", () => {
    const session = makeSession({ claims: [] });
    render(<VerdictView sessionId="sess_test" session={session} />);
    expect(screen.getByText(/no claims/i)).toBeInTheDocument();
  });
});
