import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { ClaimCard as ClaimCardT } from "@/lib/types";
import { ClaimCard } from "@/components/session/ClaimCard";
import { ClaimRow } from "@/components/session/claim-row";

function claim(overrides: Partial<ClaimCardT> = {}): ClaimCardT {
  return {
    id: "claim-1",
    claim_text: "The city doubled its transit budget in one year.",
    utterance_start: 12,
    utterance_end: 18,
    speaker_id: 0,
    topic: "Budget",
    topic_secondary: null,
    primary_label: "MISLEADING",
    score: 58,
    annotations: [],
    explanation: "The year-over-year change was smaller after grants.",
    status: "confirmed",
    sources: [
      {
        url: "https://example.com/budget",
        domain: "example.com",
        title: "Budget table",
        reputation_tier: "high",
        stance: "contradicts",
      },
    ],
    ...overrides,
  };
}

describe("claim ownership UI", () => {
  it("renders compact stance and ownership context on ClaimCard", () => {
    render(
      <ClaimCard
        card={claim({
          stance: "reported",
          ownership: {
            owner_speaker_id: null,
            attribution_status: "uncertain",
            attribution_reasons: ["quoted_or_reported_speech"],
            stance: "reported",
            confidence: 0.35,
            source_turn_ids: ["turn-1"],
            source_segment_ids: ["seg-1"],
          },
        })}
      />,
    );

    expect(screen.getByText("Stance: Reported")).toBeInTheDocument();
    expect(screen.getByText("Ownership: uncertain")).toBeInTheDocument();
  });

  it("renders imported document source anchors on ClaimCard", () => {
    render(
      <ClaimCard
        card={claim({
          document_anchor: {
            kind: "paragraph",
            block_index: 1,
            paragraph_index: 1,
            line_start: 4,
            line_end: 4,
          },
        })}
      />,
    );

    expect(screen.getByText("Source: Paragraph 2")).toBeInTheDocument();
  });

  it("renders the same stance and owner context on ClaimRow", () => {
    render(
      <ClaimRow
        claim={claim({
          stance: "hedged",
          document_anchor: {
            kind: "speaker_turn",
            block_index: 2,
            line_start: 5,
            line_end: 5,
            speaker_label: "Mira",
          },
          ownership: {
            owner_speaker_id: 1,
            attribution_status: "probable",
            attribution_reasons: ["dominant_speaker_low_margin"],
            stance: "hedged",
            confidence: 0.68,
            source_turn_ids: ["turn-2"],
            source_segment_ids: ["seg-2"],
          },
        })}
        speakerLabel="Speaker 2"
        href="/session?claim=claim-1"
      />,
    );

    expect(screen.getByText("Stance: Hedged")).toBeInTheDocument();
    expect(screen.getByText("Owner: Speaker 2 (probable)")).toBeInTheDocument();
    expect(screen.getByText("Source: Turn 3 (Mira)")).toBeInTheDocument();
  });

  it("does not promote unsafe overlap to a named claim owner", () => {
    render(
      <ClaimCard
        card={claim({
          ownership: {
            owner_speaker_id: 0,
            attribution_status: "unsafe_overlap",
            attribution_reasons: ["competitive_interruption"],
            stance: "asserted",
            confidence: 0.41,
            source_turn_ids: ["turn-1"],
            source_segment_ids: ["seg-1"],
          },
        })}
      />,
    );

    expect(screen.getByText("Ownership: unsafe overlap")).toBeInTheDocument();
    expect(screen.queryByText("Owner: Speaker 1 (unsafe overlap)")).not.toBeInTheDocument();
  });

  it("keeps unresolved claim ownership neutral on ClaimRow", () => {
    render(
      <ClaimRow
        claim={claim({
          ownership: {
            owner_speaker_id: null,
            attribution_status: "uncertain",
            attribution_reasons: ["quoted_or_reported_speech"],
            stance: "reported",
            confidence: 0.35,
            source_turn_ids: ["turn-1"],
            source_segment_ids: ["seg-1"],
          },
        })}
        speakerLabel="Speaker 1"
        href="/session?claim=claim-1"
      />,
    );

    expect(screen.getByText("Owner unresolved: uncertain")).toBeInTheDocument();
    expect(screen.getByText("Ownership: uncertain")).toBeInTheDocument();
    expect(screen.queryByText("Speaker 1")).not.toBeInTheDocument();
  });

  it("does not invent ownership labels for legacy claims", () => {
    render(<ClaimCard card={claim()} />);

    expect(screen.queryByText(/^Stance:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Ownership:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Owner:/)).not.toBeInTheDocument();
  });
});
