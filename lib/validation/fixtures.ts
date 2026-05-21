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
    sessionHref: "/session?sample=solo_005&view=watch",
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
    sessionHref: "/session?sample=cable_008&view=watch",
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
    sessionHref: "/session?sample=israel_010&view=watch",
    reportHref: "/corpus-report/index.html#israel_010",
    youtubeUrl: "https://www.youtube.com/watch?v=Ou-Bl8HSGsM",
    claims: 14,
    markers: 4,
    errors: 0,
    verification: "provisional",
    status: "review",
  },
];

export const validationFixtures: ValidationFixture[] = [
  {
    id: "youtube-caption-success",
    sourceType: "YouTube",
    title: "Hans Rosling population box talk",
    purpose:
      "Exercises the YouTube caption success flow, Watch redirect, transcript load, and playable-source navigation.",
    primaryTarget: "Paste into YouTube ingest",
    expectedResult:
      "In local development this is backed by a deterministic fixture excerpt when live YouTube caption access fails.",
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
    id: "audio-file-wav",
    sourceType: "Audio file",
    title: "Synthetic spoken WAV",
    purpose:
      "Exercises upload, duration probing, Deepgram batch transcription, diarized transcript ingestion, and Watch redirect.",
    primaryTarget: "Drop into Audio file ingest",
    expectedResult: "Yentl transcribes the known speech and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.wav",
    localPath: "public/validation/yentl-synthetic-panel.wav",
    status: "ready",
  },
  {
    id: "text-transcript",
    sourceType: "Text file",
    title: "Synthetic two-speaker transcript",
    purpose:
      "Exercises paste/drop transcript ingest, speaker-label parsing, claim extraction dispatch, and transcript rendering.",
    primaryTarget: "Paste or drop into Text doc ingest",
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
    primaryTarget: "Drop into Text doc ingest",
    expectedResult: "Yentl accepts the file and populates the transcript input.",
    url: "http://localhost:3000/validation/yentl-synthetic-transcript.md",
    localPath: "public/validation/yentl-synthetic-transcript.md",
    status: "ready",
  },
  {
    id: "timed-vtt",
    sourceType: "Timed text",
    title: "Synthetic WebVTT captions",
    purpose:
      "Exercises caption-parser expectations and future timed-text import work.",
    primaryTarget: "Parser and future caption import",
    expectedResult: "Cue timings and text are deterministic.",
    url: "http://localhost:3000/validation/yentl-synthetic-captions.vtt",
    localPath: "public/validation/yentl-synthetic-captions.vtt",
    status: "ready",
  },
  {
    id: "timed-srt",
    sourceType: "Timed text",
    title: "Synthetic SRT captions",
    purpose:
      "Exercises the existing SRT parser shape used by YouTube caption fallback.",
    primaryTarget: "parseSrt and caption fixture tests",
    expectedResult: "Five deterministic timed transcript segments.",
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
];

export const validationRunbook = [
  "Open /project/validation and confirm every fixture is visible.",
  "Use the YouTube fixture URL to verify the local success path reaches Watch.",
  "Use the synthetic WAV file to verify audio upload, batch transcription, and Watch redirect.",
  "Use the text transcript fixture to verify paste/drop transcript ingest.",
  "Use the browser-capture page to verify same-page extension capture and analysis.",
  "Use the Wikimedia Commons real video page to verify same-page extension capture on a third-party playable-media page.",
  "Use the Wikinews real article page to verify page-text extraction and analysis without requiring playable media.",
  "Use the three corpus functional samples to verify the rendered Yentl Watch experience against replayed transcripts, claims, and markers.",
  "Use the Mozilla WAV URL to verify direct media URL ingest.",
];
