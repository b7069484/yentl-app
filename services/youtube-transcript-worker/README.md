# YouTube Transcript Worker

Small standalone Node service for the P0-003 production escape hatch.

The app already supports `YENTL_YOUTUBE_TRANSCRIPT_WORKER_URL`; this service
implements that contract without changing production config. Deploy it only if
Owner selects the external-worker path.

## Run

```bash
PORT=8080 \
YENTL_YOUTUBE_TRANSCRIPT_WORKER_TOKEN=replace-me \
node services/youtube-transcript-worker/worker.mjs
```

The host must have `yt-dlp` on `PATH`, or set `YT_DLP_PATH`.

## Contract

```bash
curl -sS "https://worker.example.com/?video_id=fTznEIZRkLg" \
  -H "Authorization: Bearer replace-me"
```

Success:

```json
{ "transcript_segments": [{ "text": "...", "start": 0, "end": 1.2, "is_final": true, "speaker_id": 0 }] }
```

Failure:

```json
{ "error": { "code": "NO_CAPTIONS", "message": "No English captions available" } }
```

`/healthz` returns `{ "ok": true }`.
