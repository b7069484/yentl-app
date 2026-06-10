import { describe, it, expect } from "vitest";
import { toJSON } from "@/lib/export/json";
import type { Session } from "@/lib/types";

describe("toJSON", () => {
  it("serializes a session faithfully and adds duration", () => {
    const session: Session = {
      title: "Test",
      started_at: "2026-05-11T10:00:00.000Z",
      ended_at: "2026-05-11T10:05:00.000Z",
      speakers: [],
      source: { kind: "mic" },
      transcript: [{ text: "hi", start: 0, end: 1, is_final: true, speaker_id: null }],
      claims: [],
      markers: [],
      devil_advocate: {
        stance: "A skeptic would ask for a source.",
        strongest_counterarguments: ["A", "B", "C"],
        weakest_assumption: "The transcript is complete.",
        questions: ["Q1", "Q2"],
        confidence: "low",
        at: 1,
      },
    };
    const json = toJSON(session);
    const parsed = JSON.parse(json);
    expect(parsed.title).toBe("Test");
    expect(parsed.duration_seconds).toBe(300);
    expect(parsed.transcript[0].text).toBe("hi");
    expect(parsed.source).toEqual({ kind: "mic" });
    expect(Array.isArray(parsed.speakers)).toBe(true);
    expect(parsed.devil_advocate.stance).toContain("source");
  });

  it("omits ended_at + duration if missing", () => {
    const session: Session = {
      title: "Open",
      started_at: "2026-05-11T10:00:00.000Z",
      speakers: [],
      source: { kind: "mic" },
      transcript: [],
      claims: [],
      markers: [],
    };
    const parsed = JSON.parse(toJSON(session));
    expect(parsed.duration_seconds).toBeUndefined();
    expect(parsed.ended_at).toBeUndefined();
  });

  it("preserves claim stance and ownership metadata", () => {
    const session: Session = {
      title: "Ownership export",
      started_at: "2026-05-11T10:00:00.000Z",
      speakers: [{ id: 0, label: "Host" }],
      source: { kind: "mic" },
      transcript: [],
      claims: [
        {
          id: "claim-ownership",
          claim_text: "The audit was hidden.",
          utterance_start: 0,
          utterance_end: 3,
          speaker_id: 0,
          topic: "accountability",
          topic_secondary: null,
          primary_label: "UNVERIFIABLE",
          score: 40,
          annotations: [],
          explanation: "The proposition needs source-backed verification.",
          status: "confirmed",
          sources: [
            {
              url: "https://audit.example/report",
              domain: "audit.example",
              title: "Audit Report",
              reputation_tier: "high",
              stance: "supports",
              excerpt: "The audit was hidden from the public file.",
            },
            {
              url: "https://blog.example/no-excerpt",
              domain: "blog.example",
              title: "No Excerpt Blog",
              reputation_tier: "low",
              stance: "mixed",
            },
          ],
          stance: "reported",
          ownership: {
            owner_speaker_id: null,
            attribution_status: "uncertain",
            attribution_reasons: ["quoted_or_reported_speech"],
            stance: "reported",
            confidence: 0.22,
            source_turn_ids: ["turn-1"],
            source_segment_ids: ["seg-1"],
          },
          document_anchor: {
            kind: "paragraph",
            block_index: 1,
            paragraph_index: 1,
            line_start: 4,
            line_end: 5,
          },
        },
      ],
      markers: [],
    };

    const parsed = JSON.parse(toJSON(session));
    expect(parsed.claims[0].stance).toBe("reported");
    expect(parsed.claims[0].ownership).toMatchObject({
      owner_speaker_id: null,
      attribution_status: "uncertain",
      attribution_reasons: ["quoted_or_reported_speech"],
      stance: "reported",
      confidence: 0.22,
      source_turn_ids: ["turn-1"],
      source_segment_ids: ["seg-1"],
    });
    expect(parsed.claims[0].document_anchor).toMatchObject({
      kind: "paragraph",
      block_index: 1,
      paragraph_index: 1,
      line_start: 4,
      line_end: 5,
    });
    expect(parsed.source_evidence.claims[0]).toMatchObject({
      claim_id: "claim-ownership",
      summary: {
        supports: 1,
        mixed: 1,
        high: 1,
        low: 1,
        claimLinked: 1,
        claimUnlinked: 1,
      },
    });
    expect(parsed.source_evidence.claims[0].sources[0]).toMatchObject({
      title: "Audit Report",
      evidence_score: 38,
      evidence_breakdown: "high reputation + excerpt + no image",
      claim_link: "audit, hidden",
      claim_link_terms: ["audit", "hidden"],
    });
    expect(parsed.source_evidence.claims[0].sources[1]).toMatchObject({
      title: "No Excerpt Blog",
      evidence_score: 0,
      claim_link: "no source excerpt to compare",
      claim_link_terms: [],
    });
  });

  it("preserves marker attribution metadata", () => {
    const session: Session = {
      title: "Marker attribution export",
      started_at: "2026-05-11T10:00:00.000Z",
      speakers: [],
      source: { kind: "mic" },
      transcript: [],
      claims: [],
      markers: [
        {
          id: "marker-owned",
          type: "rhetoric",
          name: "loaded_language",
          display: "Loaded language",
          excerpt: "Everything collapses.",
          speaker_id: null,
          start_time: 1,
          end_time: 3,
          severity: "clear",
          explanation: "Escalates the consequence framing.",
          attribution_status: "unsafe_overlap",
          attribution_reasons: ["parallel_claim"],
          overlap_class: "parallel_claim",
          source_turn_ids: ["turn-a", "turn-b"],
          source_segment_ids: ["seg-a", "seg-b"],
        },
      ],
    };

    const parsed = JSON.parse(toJSON(session));
    expect(parsed.markers[0]).toMatchObject({
      attribution_status: "unsafe_overlap",
      attribution_reasons: ["parallel_claim"],
      overlap_class: "parallel_claim",
      source_turn_ids: ["turn-a", "turn-b"],
      source_segment_ids: ["seg-a", "seg-b"],
    });
  });
});
