import { afterEach, describe, expect, it, vi } from "vitest";
import {
  loadYouTubeValidationFixture,
  parseVtt,
} from "@/lib/server/youtube-validation-fixtures";

describe("youtube validation fixtures", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parses WebVTT cues into transcript segments", () => {
    const segments = parseVtt(`WEBVTT

00:00:01.000 --> 00:00:03.500
First caption.

00:00:04.000 --> 00:00:06.000
Second caption.
`);

    expect(segments).toEqual([
      {
        text: "First caption.",
        start: 1,
        end: 3.5,
        is_final: true,
        speaker_id: 0,
      },
      {
        text: "Second caption.",
        start: 4,
        end: 6,
        is_final: true,
        speaker_id: 0,
      },
    ]);
  });

  it("loads the curated Hans Rosling fixture in local test/dev", async () => {
    const fixture = await loadYouTubeValidationFixture("fTznEIZRkLg");

    expect(fixture).toMatchObject({
      video_id: "fTznEIZRkLg",
      title: "Hans Rosling: Global population growth, box by box",
      channel: "TED",
      validation_fixture: true,
    });
    expect(fixture?.transcript_segments.length).toBeGreaterThan(0);
    expect(fixture?.transcript_segments[0]).toMatchObject({
      text: expect.stringContaining("I still remember"),
      speaker_id: 0,
      is_final: true,
    });
  });

  it("returns null for unregistered video IDs", async () => {
    await expect(loadYouTubeValidationFixture("dQw4w9WgXcQ")).resolves.toBeNull();
  });

  it("does not load curated validation fixtures in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    await expect(loadYouTubeValidationFixture("fTznEIZRkLg")).resolves.toBeNull();
  });
});
