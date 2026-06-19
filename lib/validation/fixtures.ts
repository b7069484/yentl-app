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

export type LaunchCanaryProof = {
  id: string;
  area: string;
  title: string;
  requirement: string;
  proofCommands: string[];
  templatePath?: string;
  manifestPath?: string;
  proofArtifacts: string[];
  evidenceNeeded: string[];
  status: "needs-real-evidence";
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
    markers: 5,
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
  {
    id: "extension_snapshot",
    title: "Extension workspace snapshot proof",
    category: "extension_workspace",
    purpose:
      "Browser-tab sample with transcript, claims, marker, synthesis, and counter-read: proves the extension panel can hand off a durable full-workspace snapshot without implying live sync.",
    sessionHref: "/session?demo=validation&sample=extension_snapshot&view=overview",
    reportHref: "/project/validation",
    youtubeUrl: "https://news.example/live/civic-ledger-hearing",
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
    id: "browser-tab-snapshot-workspace",
    sourceType: "Extension workspace",
    title: "Extension workspace snapshot proof",
    purpose:
      "Exercises the browser-tab full-workspace handoff after the side panel saves a snapshot.",
    primaryTarget: "Open /session?demo=validation&sample=extension_snapshot&view=overview",
    expectedResult:
      "Yentl opens a full workspace with preserved browser-tab source identity, snapshot status, transcript, claims, markers, synthesis, and counter-read.",
    url: "http://localhost:3000/session?demo=validation&sample=extension_snapshot&view=overview",
    status: "ready",
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
    id: "web-url-messy-article",
    sourceType: "Web URL",
    title: "Messy local article",
    purpose:
      "Exercises readable article URL import when the article body includes cookie, ad, sharing, related-story, newsletter, and comment chrome.",
    primaryTarget: "Run npm run ingestion:proof:local and inspect the messy-article-url-ingest check",
    expectedResult:
      "Yentl imports the real article paragraphs while excluding embedded page chrome from the source text used for analysis.",
    url: "http://localhost:3000/validation/yentl-messy-article.html",
    localPath: "public/validation/yentl-messy-article.html",
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
    id: "video-file-mp4",
    sourceType: "Video file",
    title: "Synthetic spoken MP4",
    purpose:
      "Exercises video-file upload staging, duration probing, deterministic batch transcription, speaker handoff, transcript ingestion, and Watch redirect.",
    primaryTarget: "Open /session?source=audio-file and click Load validation MP4",
    expectedResult:
      "Yentl stages the MP4 as a file, transcribes the known two-speaker panel, and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.mp4",
    localPath: "public/validation/yentl-synthetic-panel.mp4",
    status: "ready",
  },
  {
    id: "video-file-mov",
    sourceType: "Video file",
    title: "Synthetic spoken MOV",
    purpose:
      "Exercises QuickTime/MOV upload staging, duration probing, deterministic batch transcription, speaker handoff, transcript ingestion, and Watch redirect.",
    primaryTarget: "Open /session?source=audio-file and click Load validation MOV",
    expectedResult:
      "Yentl stages the MOV as a file, transcribes the known two-speaker panel, and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.mov",
    localPath: "public/validation/yentl-synthetic-panel.mov",
    status: "ready",
  },
  {
    id: "video-file-webm",
    sourceType: "Video file",
    title: "Synthetic spoken WebM",
    purpose:
      "Exercises WebM upload staging, duration probing, deterministic batch transcription, speaker handoff, transcript ingestion, and Watch redirect.",
    primaryTarget: "Open /session?source=audio-file and click Load validation WebM",
    expectedResult:
      "Yentl stages the WebM as a file, transcribes the known two-speaker panel, and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.webm",
    localPath: "public/validation/yentl-synthetic-panel.webm",
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
  {
    id: "media-url-local-validation-mp4",
    sourceType: "Media URL",
    title: "Local validation MP4 transcription",
    purpose:
      "Exercises the direct media URL backend and rendered media URL pane against Yentl's deterministic local MP4 video transcript without requiring a live Deepgram call.",
    primaryTarget: "Open /session?source=media-url and click Load validation video URL",
    expectedResult:
      "Yentl returns five timed utterances from the MP4 validation fixture and opens Watch.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.mp4",
    localPath: "public/validation/yentl-synthetic-panel.mp4",
    status: "ready",
  },
  {
    id: "media-url-local-validation-mov",
    sourceType: "Media URL",
    title: "Local validation MOV transcription",
    purpose:
      "Exercises the direct media URL backend against Yentl's deterministic local MOV video transcript without requiring a live Deepgram call.",
    primaryTarget: "Run npm run ingestion:proof:local and inspect direct-mov-url-ingest",
    expectedResult:
      "Yentl returns five timed utterances from the MOV validation fixture.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.mov",
    localPath: "public/validation/yentl-synthetic-panel.mov",
    status: "ready",
  },
  {
    id: "media-url-local-validation-webm",
    sourceType: "Media URL",
    title: "Local validation WebM transcription",
    purpose:
      "Exercises the direct media URL backend against Yentl's deterministic local WebM video transcript without requiring a live Deepgram call.",
    primaryTarget: "Run npm run ingestion:proof:local and inspect direct-webm-url-ingest",
    expectedResult:
      "Yentl returns five timed utterances from the WebM validation fixture.",
    url: "http://localhost:3000/validation/yentl-synthetic-panel.webm",
    localPath: "public/validation/yentl-synthetic-panel.webm",
    status: "ready",
  },
  {
    id: "claim-quick-check-validation",
    sourceType: "Claim quick check",
    title: "Standalone validation claim",
    purpose:
      "Exercises one-claim checking through the rendered quick-check pane, provisional verification, confirmed verification, and claim-detail handoff.",
    primaryTarget: "Open /session?source=claim and click Load validation claim",
    expectedResult:
      "Yentl fills the known spending claim, returns the document-validation fixture, and opens the claim detail with source-trail cautions.",
    status: "ready",
  },
];

export const validationRunbook = [
  "Open /project/validation and confirm every fixture is visible.",
  "Use /session?source=youtube, Load validation YouTube, and Analyze caption track to verify deterministic YouTube ingest, caption arming, Watch handoff, and transcript analysis dispatch.",
  "Use /session?source=audio-file and Load validation WAV/MP4/MOV/WebM to verify audio and video upload, batch transcription, speaker handoff, and Watch redirect.",
  "Use /session?source=text-doc and the text validation loaders to verify TXT, Markdown, VTT, and SRT transcript ingest.",
  "Use /session?source=web-url and Load validation article to verify readable article URL ingest, source-review handoff, and claim extraction.",
  "Use the browser-capture page to verify same-page extension capture and analysis.",
  "Use the Wikimedia Commons real video page to verify same-page extension capture on a third-party playable-media page.",
  "Use the Wikinews real article page to verify page-text extraction and analysis without requiring playable media.",
  "Use the functional samples to verify the rendered Yentl Watch, Source Review, media playback, and extension snapshot experiences against prepared transcripts, claims, and markers.",
  "Use the Source Review quote-anchor sample to verify imported-text claim anchors and exact quote highlighting.",
  "Use the media playback sync sample to verify local audio player readiness, finding queue seeking, and current transcript highlighting.",
  "Use the extension snapshot sample to verify browser-tab source continuity after panel-to-workspace handoff.",
  "Use /session?source=media-url and Load validation media/video URL, plus npm run ingestion:proof:local, to verify deterministic /api/media-ingest for WAV, MP4, MOV, and WebM.",
  "Use /session?source=claim and Load validation claim to verify one-claim provisional/confirmed verification and detail handoff.",
  "Use the Mozilla WAV URL to verify direct media URL ingest.",
];

export const launchCanaryProofs: LaunchCanaryProof[] = [
  {
    id: "sensitive-attribution-review",
    area: "Analysis",
    title: "Sensitive attribution editorial review",
    requirement:
      "Every sensitive public-claims window must be reviewed for speaker ownership, quote boundaries, and endorsement risk before launch copy can rely on it.",
    proofCommands: ["npm run analysis:proof:sensitive-review"],
    templatePath: "agent-work/validation/sensitive-attribution-reviews.template.json",
    manifestPath: "agent-work/validation/sensitive-attribution-reviews.json",
    proofArtifacts: ["docs/superpowers/validation/sensitive-attribution-review-proof.json"],
    evidenceNeeded: [
      "Named reviewer",
      "Fresh reviewed_at timestamp",
      "Per-window notes with quote/endorsement reasoning",
      "Explicit public_claims_allowed approval",
    ],
    status: "needs-real-evidence",
  },
  {
    id: "mobile-device-canaries",
    area: "Mobile",
    title: "Physical iOS and Android device canaries",
    requirement:
      "Real iOS and Android devices must prove share targets, file pickers, microphone capture, PWA install/open, and saved-session restore.",
    proofCommands: ["npm run mobile:proof:devices"],
    templatePath: "agent-work/validation/mobile-device-canaries.template.json",
    manifestPath: "agent-work/validation/mobile-device-canaries.json",
    proofArtifacts: ["docs/superpowers/validation/mobile-device-canary-proof.json"],
    evidenceNeeded: [
      "Device model and OS version",
      "Browser used",
      "Passing flow status for each required mobile path",
      "Non-empty screenshot, note, log, or video evidence files",
    ],
    status: "needs-real-evidence",
  },
  {
    id: "large-real-media-canaries",
    area: "Ingestion",
    title: "Large real audio/video media canaries",
    requirement:
      "Real phone-recorded audio, MP4, MOV, and WebM files must pass through production-like Blob upload and transcription.",
    proofCommands: ["npm run ingestion:proof:large-real-media"],
    templatePath: "agent-work/validation/large-real-media-canaries.template.json",
    manifestPath: "agent-work/validation/large-real-media-canaries.json",
    proofArtifacts: ["docs/superpowers/validation/large-real-media-canary-proof.json"],
    evidenceNeeded: [
      "Real media file paths",
      "Correct MIME type and duration",
      "Expected phrases heard in each recording",
      "Blob upload plus non-fixture transcription proof",
    ],
    status: "needs-real-evidence",
  },
  {
    id: "authenticated-cloud-sync",
    area: "Cloud sync",
    title: "Authenticated cross-device cloud sync",
    requirement:
      "A Clerk/database-backed environment must prove account save, load, list, rename, TV restore, delete, and two isolated browser-profile restores.",
    proofCommands: [
      "YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:local",
      "YENTL_CLOUD_SYNC_PROOF_AUTH_HEADER='Bearer ...' npm run cloud-sync:proof:deploy",
    ],
    proofArtifacts: [
      "docs/superpowers/validation/cloud-sync-local-proof.json",
      "docs/superpowers/validation/cloud-sync-deploy-proof.json",
    ],
    evidenceNeeded: [
      "Configured Clerk publishable key and database",
      "Fresh signed-in auth header",
      "Authenticated CRUD proof",
      "Two-profile browser restore proof",
    ],
    status: "needs-real-evidence",
  },
  {
    id: "production-current-tree-smoke",
    area: "Release",
    title: "Production current-tree smoke",
    requirement:
      "The current worktree must be committed, pass CI, deploy, and pass production launch smoke without internal-skip shortcuts.",
    proofCommands: [
      "npm run smoke:launch",
      "npm run release:readiness",
    ],
    proofArtifacts: [
      "docs/superpowers/validation/release-readiness-proof.json",
    ],
    evidenceNeeded: [
      "Clean committed tree",
      "Green CI for the shipped commit",
      "Fresh production deploy",
      "Production smoke with Blob token checks enabled",
    ],
    status: "needs-real-evidence",
  },
];
