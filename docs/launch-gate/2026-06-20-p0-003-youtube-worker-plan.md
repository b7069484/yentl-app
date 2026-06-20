# P0-003 YouTube Prod Caption Fix Plan

Operator: codex-yentl  
Worktree: `/Users/israelbitton/yentl-codex-launch-gate`  
Branch: `codex/launch-gate`

## Current Truth

- Local live fetch for TED video `fTznEIZRkLg` returns 241 transcript segments.
- Current production `POST https://yentl.it/api/youtube-ingest` for the same public video still returns:
  `{"error":{"code":"PRIVATE","message":"Video is private or login-required"}}`.
- No deploy or production config mutation has happened in this Operator pass.

## Code Changes

- `fetchCaptions()` no longer fails fast on `PRIVATE` from Innertube or
  `youtube-transcript`; those can be false datacenter bot-wall classifications.
- Final local yt-dlp still decides the final error when no remote worker is configured.
- Added optional remote transcript worker support:
  - `YENTL_YOUTUBE_TRANSCRIPT_WORKER_URL` preferred.
  - Legacy alias `YT_DLP_WORKER_URL` also accepted.
  - Optional bearer token: `YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN`.
  - Worker is called with `video_id=<id>` and may return either
    `transcript_segments` or `segments`.
  - Worker payloads are validated before use.

## Required Production Decision

The code gives production an escape hatch, but it does not create the outside-Vercel
caption worker. To prove P0-003 on prod, Owner/Operator still need one of:

- A small VPS/worker endpoint running yt-dlp from a less-blocked IP.
- A third-party transcript API wrapper with the same response contract.
- An explicitly approved proxy/cookie/PO-token approach.
- An Owner decision to pivot YouTube source intake to client-side/browser-tab capture.

## Verification Bar

After deploy/config, Readiness should curl production:

```bash
curl -sS https://yentl.it/api/youtube-ingest \
  -H 'content-type: application/json' \
  -H 'x-yentl-source-consent: source-analysis-v1' \
  --data '{"url":"https://www.youtube.com/watch?v=fTznEIZRkLg"}'
```

Expected: HTTP 200 with `transcript_segments.length > 0` and no `error`.
