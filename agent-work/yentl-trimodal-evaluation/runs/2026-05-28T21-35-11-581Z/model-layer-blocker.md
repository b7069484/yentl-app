# Model-Layer Blocker - Resolved

The original tri-modal transcript/input-layer run completed while Yentl's model-backed analysis endpoints were unavailable. After the Vercel AI Gateway credit issue was fixed, the same cached run was rerun successfully and produced model-backed claim, marker, provisional verification, and confirmed verification outputs.

Original blocked behavior:

- `/api/extract-claims` returned HTTP 500 for every sampled request.
- `/api/analyze-rhetoric` returned HTTP 500 for every sampled request.
- Direct diagnostic call to `/api/extract-claims` also returned HTTP 500.

Root cause from `.next/dev/logs/next-development.log`:

`GatewayInternalServerError: A positive credit balance is required for all requests, including BYOK, so fallback providers remain available.`

Original impact:

- Claim counts in this run are invalid as reasoning-quality evidence.
- Marker counts in this run are invalid as reasoning-quality evidence.
- Provisional/confirmed fact-checking was not reached because no claims could be extracted.
- Transcript WER, caption availability, URL timing drift, audio WER, and speaker-collapse findings are valid.

Resolution:

- A direct `/api/extract-claims` diagnostic probe returned HTTP 200.
- The full cached tri-modal run was rerun successfully.
- The current report at `report.md` should be treated as the active result.
