# Yentl Committee Report - Audio, Audiology, ASR, Diarization, and Browser Capture

    **Committee member:** Tova Shulamit Levin  
    **Remit:** Clinical audiology, speech-in-noise perception, ASR, diarization/crosstalk, hearing accessibility, Chrome extension audio capture.  
    **Why this name:** Tova means good or beneficial; Shulamit carries wholeness. This seat asks whether Yentl's hearing is useful, coherent, and honest under noise.  
    **Date:** 2026-05-21  
    **Workspace:** `/Users/israelbitton/Live FactCheck`


## Evidence Inspected

- `test-corpus/README.md`, `test-corpus/rubric.md`, `test-corpus/report/corpus-report.json`, `test-corpus-2/README.md`, `test-corpus-2/report/corpus-2-plan.json`.
- `docs/browser-tab-capture.md`, `extension/offscreen.js`, `extension/content-script.js`, `extension/background.js`, `components/session/ExtensionBridge.tsx`.
- `lib/client/deepgram-stream.ts`, `lib/server/deepgram-batch.ts`, `components/session/AudioMeter.tsx`, `components/session/TranscriptView.tsx`, `lib/client/session-store.ts`.
- Chrome tab capture official documentation: `chrome.tabCapture` can access a MediaStream containing video/audio of the current tab only after user invocation, and captured tab audio must be routed back through an `AudioContext` to keep playback audible: https://developer.chrome.com/docs/extensions/reference/api/tabCapture.
- Deepgram pricing/features: Nova-3 is recommended by Deepgram for crosstalk/far-field/noisy audio; Pay As You Go Nova-3 monolingual is listed at $0.0048/min streaming and $0.0077/min pre-recorded, with diarization listed as an add-on: https://deepgram.com/pricing.

## Strengths

The ASR stack is sensibly chosen. Batch and live paths use Deepgram Nova-3 with diarization, utterances, punctuation, smart formatting, and numerals. Live streaming refreshes tokens and sends small chunks, which is directionally right for low-latency transcription.

The extension architecture is strong: same-page panel, offscreen capture, early chunk buffering, page-text capture, and audio replay to preserve audible tab sound. This maps well to Chrome's platform requirements.

The corpus base is strong for a pre-launch system: Corpus 1 has 100 transcripts and 20.8 hours; Corpus 2 adds 100 failure-mode cases with high-sensitivity, quotation-risk, and heavy-overlap rows.

Accessibility seeds exist: polite audio meter announcements, transcript log behavior, and speaker reassignment/splitting tools.

## Severe Gaps

The diarization data model is too thin. Yentl discards word-level timing, word confidence, speaker confidence, and speaker distribution when converting Deepgram output into `TranscriptSegment`. Current live speaker assignment is dominant-speaker over words, not a robust attribution model.

The hardest corpus slices are under-measured. Corpus 1's cable category has crosstalk-heavy rows but lacks manual-caption/WER scoring. Corpus 2 is the right failure corpus, but Phase B is not run.

Browser-tab audio capture is promising but not launch-proven. Current harnesses prove panel injection/page-text behavior; they do not yet prove installed-extension audio transcription across YouTube/news/social pages in the user's Chrome.

Hearing accessibility is incomplete. There is no confidence surfacing, low-audibility warning, speaker uncertainty label, clean caption export/import loop, crosstalk warning, or tested screen-reader path through the extension panel.

## Recommendations

Preserve richer ASR evidence: word start/end, word confidence, speaker, speaker confidence, utterance speaker distribution, audio level/noise flags, and whether the segment is safe for claim attribution.

Add a speaker-attribution layer before claim extraction. It should detect solo with clips, panel debate, interview, crowd bleed, quote reading, interruption repair, and backchannels. Yentl must sometimes say `speaker uncertain`.

Build a crosstalk eval harness: hand-annotate short high-overlap windows from cable/political/C2 mechanics rows. Score WER, diarization error, speaker-attribution purity, claim-owner accuracy, interruption detection, and unsafe-attribution recall.

Make extension audio capture measurable: capture-start to first chunk, socket open, first interim, first final, no-speech false positives, muted-tab behavior, background-tab behavior, reconnect success, and 30-minute stability.

Make the transcript the accessibility product: confidence badges, speaker uncertainty states, keyboard speaker correction, `.srt`/`.vtt` export, large-text mode, screen-reader QA, and warnings such as `audio too noisy for reliable speaker attribution`.

## Launch Blockers

Do not publicly launch browser-tab audio analysis until an installed Chrome extension is validated on local fixture, Wikimedia video, YouTube, embedded news video, text-only article, muted tab, silent tab, long-running tab, and reconnect scenarios. Do not claim robust speaker attribution until crosstalk-heavy rows have manual speaker labels and claim-owner accuracy.

## Metrics

Launch gates: median WER <= 10-12% overall, p90 <= 20%, separate WER for crosstalk/accent/noisy/quoted clips; speaker-attribution purity >= 80%; claim-owner accuracy >= 90%; unsafe-attribution recall >= 95%; first interim p50 < 2.5s and p95 < 6s; first final p50 < 5s and p95 < 12s; WCAG 2.2 AA for capture/transcript/correction/export/panel.
