export type ValidationFixture = {
  id: string;
  sourceType: string;
  title: string;
  purpose: string;
  primaryTarget: string;
  expectedResult: string;
  url?: string;
  localPath?: string;
  status: "ready" | "external" | "manual-extension";
};

export type CorpusFunctionalSample = {
  id: string;
  title: string;
  category: string;
  purpose: string;
  sessionHref: string;
  reportHref: string;
  youtubeUrl: string;
  claims: number;
  markers: number;
  errors: number;
  verification: "none" | "provisional";
  status: "pass" | "review";
};

export const corpusAcceptanceSummary = {
  videos: 100,
  transcripts: 100,
  medianWer: "8.94%",
  meanWer: "9.82%",
  p90Wer: "20.62%",
  categories: 10,
  replaySlices: 3,
  reportHref: "/corpus-report/index.html",
};

export const corpusFunctionalSamples: CorpusFunctionalSample[] = [
  {
    id: "solo_005",
    title: "Hans Rosling population box talk",
    category: "solo_monologue",
    purpose:
      "Clean single-speaker quantitative explainer: proves baseline transcript loading and claim extraction.",
    sessionHref: "/session?demo=validation&sample=solo_005&view=watch",
    reportHref: "/corpus-report/index.html#solo_005",
    youtubeUrl: "https://www.youtube.com/watch?v=fTznEIZRkLg",
    claims: 2,
    markers: 0,
    errors: 0,
    verification: "none",
    status: "pass",
  },
  {
    id: "cable_008",
    title: "Cable crosstalk rhetoric stress sample",
    category: "cable_news_debate",
    purpose:
      "Multi-speaker, high-rhetoric excerpt: proves marker density and speaker-stress handling.",
    sessionHref: "/session?demo=validation&sample=cable_008&view=watch",
    reportHref: "/corpus-report/index.html#cable_008",
    youtubeUrl: "https://www.youtube.com/watch?v=0UYx55YNRv0",
    claims: 1,
    markers: 6,
    errors: 0,
    verification: "none",
    status: "pass",
  },
  {
    id: "israel_010",
    title: "Israel/antisemitism editorial-review sample",
    category: "israel_palestine",
    purpose:
      "Sensitive-topic review slice: proves claim volume, markers, and provisional verification wiring.",
    sessionHref: "/session?demo=validation&sample=israel_010&view=watch",
    reportHref: "/corpus-report/index.html#israel_010",
    youtubeUrl: "https://www.youtube.com/watch?v=Ou-Bl8HSGsM",
    claims: 14,
    markers: 4,
    errors: 0,
    verification: "provisional",
    status: "review",
  },
  {
    id: "source_quote_anchors",
    title: "Source Review quote-anchor proof",
    category: "source_review",
    purpose:
      "Imported text sample with persisted character offsets: proves Source Review quote previews, exact sentence highlights, and mobile-safe source navigation.",
    sessionHref: "/session?demo=validation&sample=source_quote_anchors&view=source",
    reportHref: "/project/validation",
    youtubeUrl: "/session?demo=validation&sample=source_quote_anchors&view=source",
    claims: 3,
    markers: 0,
    errors: 0,
    verification: "provisional",
    status: "pass",
  },
  {
    id: "media_playback_sync",
    title: "Synthetic audio playback sync proof",
    category: "media_playback",
    purpose:
      "Local WAV sample with timed transcript, claims, and markers: proves Watch playback sync, finding queue seeking, and mobile-safe audio review.",
    sessionHref: "/session?demo=validation&sample=media_playback_sync&view=watch",
    reportHref: "/project/validation",
    youtubeUrl: "/validation/yentl-synthetic-panel.wav",
    claims: 2,
    markers: 1,
    errors: 0,
    verification: "provisional",
    status: "pass",
  },
];

export const validationFixtures: ValidationFixture[] = [
  {
    id: "youtube-caption-success",
    sourceType: "YouTube",
    title: "Hans Rosling population box talk",
    purpose:
      "Exercises the YouTube caption success flow, deterministic validation loader, transcript arming, and synced live-analysis rail.",
    primaryTarget: "Open /session?source=youtube and click Load validation YouTube",
    expectedResult:
      "In local development this is backed by a deterministic fixture excerpt when live YouTube caption access fails; captions arm in the same YouTube workspace and can be imported into Watch with Analyze caption track.",
    url: "https://www.youtube.com/watch?v=fTznEIZRkLg",
    status: "ready",
  },
  {
    id: "youtube-no-caption",
    sourceType: "YouTube fallback",
    title: "Captionless YouTube branch",
    purpose:
      "Exercises the no-caption recovery path that should point users to Audio file or Browser tab.",
    primaryTarget: "Paste into YouTube ingest",
    expectedResult: "Yentl shows the useful fallback state instead of a dead end.",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    status: "external",
  },
  {
    id: "browser-tab-local-audio",
    sourceType: "In-page browser capture",
    title: "Local same-page media fixture",
    purpose:
      "Exercises the any-video-any-page Chrome extension path where Yentl appears beside the media player on the same page.",
    primaryTarget: "Open page, play audio, click Yentl extension on that page",
    expectedResult:
      "Media player and Yentl analysis are visible together while transcript lines arrive from tab audio.",
    url: "http://localhost:3000/validation/browser-capture.html",
    localPath: "public/validation/browser-capture.html",
    status: "manual-extension",
  },
  {
    id: "browser-tab-real-video-page",
    sourceType: "Real webpage + video",
    title: "Wikimedia Commons spoken WebM",
    purpose:
      "Exercises the Chrome extension on an actual third-party webpage with a native playable video, visible page text, and no localhost mock shell.",
    primaryTarget:
      "Open the Wikimedia page, play the video, click the Yentl extension on that same page",
    expectedResult:
      "Yentl injects into the Wikimedia page, captures the visible page text immediately, and adds audio transcript lines while the video plays.",
    url: "https://commons.wikimedia.org/wiki/File:David_Korten,_The_Green_Interview.webm",
    status: "manual-extension",
  },
  {
    id: "browser-page-real-text",
    sourceType: "Real webpage text",
    title: "Wikinews article without relying on playable media",
    purpose:
      "Exercises the same extension path on a real article page where visible text should be analyzed even if no audio or video is available.",
    primaryTarget: "Open the Wikinews article and click the Yentl extension on that page",
    expectedResult:
      "Yentl injects into the article page, extracts readable article text, populates the transcript stream, and runs fact/marker analysis without waiting for audio.",
    url: "https://en.wikinews.org/wiki/Residents_shelter_in_place_for_hours_after_gas_leak_outside_of_Los_Angeles",
    status: "manual-extension",
  },
  {
    id: "web-url-local-article",
    sourceType: "Web URL",
    title: "Local validation article",
    purpose:
      "Exercises readable article URL import, local validation SSRF bypass gating, source text handoff, claim extraction, and overview rendering.",
    primaryTarget: "Open /session?source=web-url and click Load validation article",
    expectedResult:
      "Yentl imports the local article fixture, builds transcript segments, extracts claims, and opens Overview with source text.",
    url: "http://localhost:3000/validation/yentl-synthetic-article.html",
    localPath: "public/validation/yentl-synthetic-article.html",
    status: "ready",
  },
  {
    id: "audio-file-wav",
    sourceType: "Audio file",
    title: "Synthetic spoken WAV",
    purpose:
      "Exercises upload staging, duration probing, deterministic batch transcription, speaker handoff, transcript ingestion, and Watch redirect.",
    primaryTarget: "Open /session?source=audio-file and click Load validation WAV",
    expectedResult:
      "Yentl stages the WAV as a file, transcribes the known two-speaker panel, and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.wav",
    localPath: "public/validation/yentl-synthetic-panel.wav",
    status: "ready",
  },
  {
    id: "text-transcript",
    sourceType: "Text file",
    title: "Synthetic two-speaker transcript",
    purpose:
      "Exercises transcript staging, speaker-label parsing, claim extraction dispatch, and transcript rendering.",
    primaryTarget: "Open /session?source=text-doc and click Load validation TXT",
    expectedResult: "Transcript segments appear with speaker-aware text.",
    url: "http://localhost:3000/validation/yentl-synthetic-transcript.txt",
    localPath: "public/validation/yentl-synthetic-transcript.txt",
    status: "ready",
  },
  {
    id: "markdown-transcript",
    sourceType: "Markdown file",
    title: "Markdown transcript variant",
    purpose:
      "Exercises markdown/plain-text file handling with the same claim and rhetoric content.",
    primaryTarget: "Open /session?source=text-doc and click Load validation MD",
    expectedResult: "Yentl accepts the file and populates the transcript input.",
    url: "http://localhost:3000/validation/yentl-synthetic-transcript.md",
    localPath: "public/validation/yentl-synthetic-transcript.md",
    status: "ready",
  },
  {
    id: "docx-document",
    sourceType: "Word document",
    title: "Small DOCX validation brief",
    purpose:
      "Exercises binary DOCX fixture loading, Mammoth extraction, outline generation, and speaker-aware text review.",
    primaryTarget: "Open /session?source=text-doc and click Load validation DOCX",
    expectedResult: "Yentl extracts the Word document text and keeps it ready for anchored review.",
    url: "http://localhost:3000/validation/yentl-small-brief.docx",
    localPath: "public/validation/yentl-small-brief.docx",
    status: "ready",
  },
  {
    id: "pdf-text-layer-document",
    sourceType: "PDF document",
    title: "Small selectable-text PDF",
    purpose:
      "Exercises binary PDF fixture loading, server-side text-layer extraction, page-count metadata, and outline generation.",
    primaryTarget: "Open /session?source=text-doc and click Load validation PDF",
    expectedResult: "Yentl extracts selectable PDF text, shows document metadata, and enables transcript processing.",
    url: "http://localhost:3000/validation/yentl-small-text-layer.pdf",
    localPath: "public/validation/yentl-small-text-layer.pdf",
    status: "ready",
  },
  {
    id: "timed-vtt",
    sourceType: "Timed text",
    title: "Synthetic WebVTT captions",
    purpose:
      "Exercises caption-parser expectations, timed-text staging, and transcript ingestion.",
    primaryTarget: "Open /session?source=text-doc and click Load validation VTT",
    expectedResult: "Cue timings and text are deterministic and ingest as timed transcript segments.",
    url: "http://localhost:3000/validation/yentl-synthetic-captions.vtt",
    localPath: "public/validation/yentl-synthetic-captions.vtt",
    status: "ready",
  },
  {
    id: "timed-srt",
    sourceType: "Timed text",
    title: "Synthetic SRT captions",
    purpose:
      "Exercises the SRT parser shape used by caption fallback and direct text ingest.",
    primaryTarget: "Open /session?source=text-doc and click Load validation SRT",
    expectedResult: "Five deterministic timed transcript segments ingest with source metadata.",
    url: "http://localhost:3000/validation/yentl-synthetic-captions.srt",
    localPath: "public/validation/yentl-synthetic-captions.srt",
    status: "ready",
  },
  {
    id: "media-url-wav",
    sourceType: "Media URL",
    title: "Mozilla DeepSpeech smoke-test WAV",
    purpose:
      "Exercises the direct media URL path with a small external WAV that Deepgram can fetch and transcribe.",
    primaryTarget: "Paste into Media URL ingest",
    expectedResult:
      "Yentl accepts audio/wav, transcribes one spoken utterance, and opens Watch.",
    url: "https://raw.githubusercontent.com/mozilla/DeepSpeech/master/data/smoke_test/LDC93S1.wav",
    status: "ready",
  },
  {
    id: "media-url-local-validation-wav",
    sourceType: "Media URL",
    title: "Local validation WAV transcription",
    purpose:
      "Exercises the media URL backend against Yentl's deterministic local WAV transcript without requiring a live Deepgram call.",
    primaryTarget: "Open /session?source=media-url and click Load validation media URL",
    expectedResult:
      "Yentl returns five timed utterances from the validation fixture and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.wav",
    localPath: "public/validation/yentl-synthetic-panel.wav",
    status: "ready",
  },
];

export const validationRunbook = [
  "Open /project/validation and confirm every fixture is visible.",
  "Use /session?source=youtube, Load validation YouTube, and Analyze caption track to verify deterministic YouTube ingest, caption arming, Watch handoff, and transcript analysis dispatch.",
  "Use /session?source=audio-file and Load validation WAV to verify audio upload, batch transcription, speaker handoff, and Watch redirect.",
  "Use /session?source=text-doc and the text validation loaders to verify TXT, Markdown, VTT, and SRT transcript ingest.",
  "Use /session?source=web-url and Load validation article to verify readable article URL ingest, source-review handoff, and claim extraction.",
  "Use the browser-capture page to verify same-page extension capture and analysis.",
  "Use the Wikimedia Commons real video page to verify same-page extension capture on a third-party playable-media page.",
  "Use the Wikinews real article page to verify page-text extraction and analysis without requiring playable media.",
  "Use the three corpus functional samples to verify the rendered Yentl Watch experience against replayed transcripts, claims, and markers.",
  "Use the Source Review quote-anchor sample to verify imported-text claim anchors and exact quote highlighting.",
  "Use the media playback sync sample to verify local audio player readiness, finding queue seeking, and current transcript highlighting.",
  "Use /session?source=media-url and Load validation media URL to verify deterministic /api/media-ingest and Watch redirect.",
  "Use the Mozilla WAV URL to verify direct media URL ingest.",
];
