import { describe, expect, it, vi } from "vitest";

const worker = await import("../services/youtube-transcript-worker/worker.mjs");

const {
  handleTranscriptRequest,
  isValidVideoId,
  mapYtDlpError,
  parseSrt,
} = worker as {
  handleTranscriptRequest: (
    url: string,
    headers?: Record<string, string>,
    env?: Record<string, string>,
    fetcher?: (videoId: string, env: Record<string, string>) => Promise<unknown[]>,
  ) => Promise<{ status: number; body: unknown; headers: Record<string, string> }>;
  isValidVideoId: (id: string) => boolean;
  mapYtDlpError: (error: unknown) => { status: number; code: string; message: string };
  parseSrt: (srt: string) => Array<{ text: string; start: number; end: number; is_final: boolean; speaker_id: number }>;
};

const srt = `1
00:00:00,000 --> 00:00:01,500
Hello <c>world</c>

2
00:00:01,500 --> 00:00:03,000
Hello world

3
00:00:03,000 --> 00:00:04,250
Next line
`;

describe("youtube transcript worker helpers", () => {
  it("validates exact YouTube video ids", () => {
    expect(isValidVideoId("fTznEIZRkLg")).toBe(true);
    expect(isValidVideoId("short")).toBe(false);
    expect(isValidVideoId("not a video")).toBe(false);
  });

  it("parses and dedupes SRT segments into the app transcript shape", () => {
    const segments = parseSrt(srt);

    expect(segments).toEqual([
      {
        text: "Hello world",
        start: 0,
        end: 3,
        is_final: true,
        speaker_id: 0,
      },
      {
        text: "Next line",
        start: 3,
        end: 4.25,
        is_final: true,
        speaker_id: 0,
      },
    ]);
  });

  it("maps common yt-dlp failures to the app error envelope", () => {
    expect(mapYtDlpError({ stderr: "Sign in to confirm you're not a bot" })).toMatchObject({
      status: 403,
      code: "PRIVATE",
    });
    expect(mapYtDlpError({ stderr: "No subtitles for the requested languages" })).toMatchObject({
      status: 404,
      code: "NO_CAPTIONS",
    });
    expect(mapYtDlpError({ stderr: "process timed out" })).toMatchObject({
      status: 504,
      code: "NETWORK_ERROR",
    });
  });
});

describe("youtube transcript worker request contract", () => {
  it("returns health without auth", async () => {
    const res = await handleTranscriptRequest("/healthz", {}, {
      YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN: "secret",
    });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("requires bearer auth when a token is configured", async () => {
    const res = await handleTranscriptRequest("/?video_id=fTznEIZRkLg", {}, {
      YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN: "secret",
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({
      error: {
        code: "PRIVATE",
        message: "Unauthorized transcript worker request",
      },
    });
  });

  it("rejects missing or invalid video ids before invoking yt-dlp", async () => {
    const fetcher = vi.fn();

    const res = await handleTranscriptRequest("/?video_id=bad", {}, {}, fetcher);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: {
        code: "INVALID_URL",
        message: "Missing or invalid video_id",
      },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns transcript_segments from the injected fetcher", async () => {
    const fetcher = vi.fn().mockResolvedValue([
      {
        text: "Hello from worker",
        start: 0,
        end: 1.2,
        is_final: true,
        speaker_id: 0,
      },
    ]);

    const res = await handleTranscriptRequest(
      "/?video_id=fTznEIZRkLg",
      { authorization: "Bearer secret" },
      { YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN: "secret" },
      fetcher,
    );

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      transcript_segments: [
        {
          text: "Hello from worker",
          start: 0,
          end: 1.2,
          is_final: true,
          speaker_id: 0,
        },
      ],
    });
    expect(fetcher).toHaveBeenCalledWith("fTznEIZRkLg", {
      YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN: "secret",
    });
  });
});
