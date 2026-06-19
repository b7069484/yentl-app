import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/corpus-sample/route";
import type { ClaimCard, RhetoricMarker, TranscriptSegment } from "@/lib/types";

function makeRequest(id: string): Request {
  return new Request(`http://localhost/api/corpus-sample?id=${id}`);
}

describe("GET /api/corpus-sample", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a functional Watch sample with transcript, claims, and markers", async () => {
    const res = await GET(makeRequest("cable_008") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("cable_008");
    expect(json.source.kind).toBe("youtube");
    expect(json.source.video_id).toBe("0UYx55YNRv0");
    expect(json.segments.length).toBeGreaterThan(0);
    expect(json.claims).toHaveLength(1);
    expect(json.claims[0].status).toBe("confirmed");
    expect(json.claims[0].sources[0].domain).toBe("livenowfox.com");
    expect(json.markers).toHaveLength(5);
    expect(json.synthesis.text).toContain("Validation replay");
    expect(json.synthesis.headlines).toHaveLength(3);
    expect(json.synthesis.per_speaker_verdicts.length).toBeGreaterThan(0);
    expect(json.synthesis.per_speaker_verdicts[0]).toEqual(
      expect.objectContaining({
        label: "Speaker 1",
        factual_grade: expect.any(String),
        faith_grade: expect.any(String),
      }),
    );
    const segments = json.segments as TranscriptSegment[];
    const findings = [...json.claims, ...json.markers] as Array<ClaimCard | RhetoricMarker>;
    expect(
      findings.some((item) => {
        const time = "utterance_start" in item ? item.utterance_start : item.start_time;
        return segments.some(
          (segment) => segment.start <= time && time <= segment.end + 1,
        );
      }),
    ).toBe(true);
    expect(json.replay.errors).toEqual([]);
  });

  it("does not turn unverified replay extraction into an unverifiable verdict", async () => {
    const res = await GET(makeRequest("solo_005") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claims[0].claim_text).toContain("3,000,000,000");
    expect(json.claims[0].primary_label).toBe("TRUE");
    expect(json.claims[0].status).toBe("confirmed");
    expect(json.claims[0].sources[0].domain).toBe("worldbank.org");
    expect(json.claims[1].status).toBe("checking");
  });

  it("returns the provisional verification sample with mapped labels", async () => {
    const res = await GET(makeRequest("israel_010") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.claims.length).toBe(14);
    expect(json.claims[0].status).toBe("provisional");
    expect(json.claims[0].primary_label).toBe("UNVERIFIABLE");
    expect(json.markers.length).toBe(4);
  });

  it("returns a Source Review text sample with persisted quote anchors", async () => {
    const res = await GET(makeRequest("source_quote_anchors") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("source_quote_anchors");
    expect(json.category).toBe("source_review");
    expect(json.source.kind).toBe("text_doc");
    expect(json.source.initial_text).toContain("Yentl source review proof");
    expect(json.segments).toHaveLength(3);
    expect(json.claims).toHaveLength(3);
    expect(json.markers).toHaveLength(0);
    expect(json.url).toBe("/session?demo=validation&sample=source_quote_anchors&view=source");

    const auditClaim = json.claims.find(
      (claim: ClaimCard) => claim.id === "source-quote-claim-audit",
    ) as ClaimCard | undefined;
    expect(auditClaim?.document_anchor).toMatchObject({
      kind: "paragraph",
      block_index: 1,
      paragraph_index: 1,
      quote_text: "The audit timeline showed the report was added to the public archive before the meeting started.",
    });
    expect(auditClaim?.document_anchor?.char_start).toBeGreaterThan(0);
    expect(auditClaim?.document_anchor?.char_end).toBeGreaterThan(auditClaim?.document_anchor?.char_start ?? 0);
    expect(json.synthesis.headlines).toContain("Persisted quote offsets available");
    expect(json.devil_advocate).toMatchObject({
      stance: expect.stringContaining("hidden-report claim"),
      weakest_assumption: expect.stringContaining("whole public-access timeline"),
      confidence: "medium",
    });
    expect(json.devil_advocate.strongest_counterarguments).toHaveLength(3);
    expect(json.devil_advocate.questions).toHaveLength(2);
  });

  it("returns a media playback sync sample with timed claims and markers", async () => {
    const res = await GET(makeRequest("media_playback_sync") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("media_playback_sync");
    expect(json.category).toBe("media_playback");
    expect(json.url).toBe("/session?demo=validation&sample=media_playback_sync&view=watch");
    expect(json.source).toMatchObject({
      kind: "audio_file",
      blob_url: "/validation/yentl-synthetic-panel.wav",
      filename: "yentl-synthetic-panel.wav",
      mime: "audio/wav",
    });
    expect(json.segments).toHaveLength(5);
    expect(json.segments.map((segment: TranscriptSegment) => segment.start)).toEqual([0, 4, 10, 17, 25]);
    expect(json.claims).toHaveLength(2);
    expect(json.markers).toHaveLength(1);
    expect(json.claims[1]).toMatchObject({
      id: "media-sync-claim-platform-collapse",
      utterance_start: 17,
      primary_label: "MISLEADING",
      status: "provisional",
    });
    expect(json.markers[0]).toMatchObject({
      id: "media-sync-marker-slippery-slope",
      start_time: 17,
      severity: "clear",
    });
    expect(json.synthesis.headlines).toContain("Claims and markers seek to exact audio moments");
  });

  it("returns an extension snapshot sample for full-workspace handoff proof", async () => {
    const res = await GET(makeRequest("extension_snapshot") as never);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.id).toBe("extension_snapshot");
    expect(json.category).toBe("extension_workspace");
    expect(json.url).toBe("/session?demo=validation&sample=extension_snapshot&view=overview");
    expect(json.source).toMatchObject({
      kind: "browser_tab",
      title: "Civic Ledger hearing clip",
      url: "https://news.example/live/civic-ledger-hearing",
    });
    expect(json.segments).toHaveLength(3);
    expect(json.segments.every((segment: TranscriptSegment) => segment.source_audio_kind === "browser_tab")).toBe(true);
    expect(json.claims).toHaveLength(2);
    expect(json.claims[0]).toMatchObject({
      id: "extension-snapshot-claim-contract",
      primary_label: "PARTIAL",
      status: "confirmed",
    });
    expect(json.markers).toHaveLength(1);
    expect(json.markers[0]).toMatchObject({
      id: "extension-snapshot-marker-bailout",
      severity: "clear",
    });
    expect(json.synthesis.headlines).toContain("Browser-tab source identity preserved");
    expect(json.devil_advocate.stance).toContain("contract ceiling");
  });

  it("rejects unknown sample ids", async () => {
    const res = await GET(makeRequest("unknown") as never);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("UNKNOWN_SAMPLE");
  });

  it("stays disabled when validation demos are not enabled for the environment", async () => {
    vi.stubEnv("YENTL_DISABLE_VALIDATION_DEMO", "1");
    const res = await GET(makeRequest("solo_005") as never);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("VALIDATION_DEMO_DISABLED");
  });

  it("lets the validation demo kill switch override an explicit enable flag", async () => {
    vi.stubEnv("YENTL_ENABLE_VALIDATION_DEMO", "1");
    vi.stubEnv("YENTL_DISABLE_VALIDATION_DEMO", "1");
    const res = await GET(makeRequest("solo_005") as never);
    const json = await res.json();

    expect(res.status).toBe(404);
    expect(json.error.code).toBe("VALIDATION_DEMO_DISABLED");
  });
});
