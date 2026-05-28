"use client";

import { useState, type ComponentType, type ReactNode } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileAudio,
  FileText,
  LayoutDashboard,
  Library,
  Link as LinkIcon,
  Mic,
  MonitorPlay,
  Network,
  Palette,
  Play,
  Radio,
  Save,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { AzFlowDashboard } from "./az-flow-dashboard";
import { VisualEvidenceDashboard } from "./visual-evidence-dashboard";

type Flow = {
  id: string;
  title: string;
  summary: string;
  Icon: ComponentType<{ className?: string }>;
  steps: FlowStep[];
};

type FlowStep = {
  label: string;
  action: string;
  outcome: string;
  screen: ScreenKind;
};

type ScreenCritique = {
  weak: string[];
  good: string[];
};

type ScreenKind =
  | "start"
  | "youtube-input"
  | "youtube-loading"
  | "youtube-success"
  | "youtube-no-captions"
  | "browser-waiting"
  | "browser-live"
  | "audio-upload"
  | "audio-processing"
  | "text-doc"
  | "mic-live"
  | "media-url"
  | "overview"
  | "watch"
  | "transcript"
  | "claims-list"
  | "markers-list"
  | "claim-detail"
  | "marker-detail"
  | "claim-learn"
  | "marker-learn"
  | "save-dialog"
  | "export-dialog"
  | "end-dialog"
  | "sessions-library"
  | "landing"
  | "auth"
  | "trust-page"
  | "extension-popup"
  | "extension-options"
  | "mobile-import"
  | "mobile-live"
  | "mobile-library";

type Viewport = "desktop" | "mobile";
type DashboardTab = "atlas" | "az-flow" | "visual-evidence";

const flows: Flow[] = [
  {
    id: "youtube",
    title: "YouTube Captions",
    summary: "The fast path when a video exposes captions. This is the screen sequence we need to redesign first.",
    Icon: Play,
    steps: [
      {
        label: "Start",
        action: "Choose YouTube from the source picker.",
        outcome: "Yentl opens a URL ingest form.",
        screen: "start",
      },
      {
        label: "Paste Link",
        action: "Paste a YouTube watch, shorts, embed, or youtu.be URL.",
        outcome: "The Fetch captions button becomes available.",
        screen: "youtube-input",
      },
      {
        label: "Fetch",
        action: "Click Fetch captions.",
        outcome: "Yentl asks the server for captions and then bulk-ingests transcript lines.",
        screen: "youtube-loading",
      },
      {
        label: "Success",
        action: "When captions exist, Yentl redirects to Watch.",
        outcome: "Video, transcript, claims, markers, and synthesis share one session.",
        screen: "youtube-success",
      },
      {
        label: "Branch",
        action: "If YouTube has no captions or blocks access, show a useful fallback.",
        outcome: "Send the user to Audio file or Browser tab capture instead of a dead end.",
        screen: "youtube-no-captions",
      },
    ],
  },
  {
    id: "browser-tab",
    title: "Browser Tab Capture",
    summary: "The any-video-on-any-page path. Chrome extension captures audio from the user-played tab.",
    Icon: MonitorPlay,
    steps: [
      {
        label: "Start",
        action: "Choose Browser tab from the picker.",
        outcome: "Yentl starts a waiting session.",
        screen: "start",
      },
      {
        label: "Wait",
        action: "Click the Yentl extension while a video or stream plays in another tab.",
        outcome: "The extension captures tab audio and streams transcripts back here.",
        screen: "browser-waiting",
      },
      {
        label: "Live",
        action: "Let the video play.",
        outcome: "Transcript, claims, rhetoric markers, and synthesis update live.",
        screen: "browser-live",
      },
    ],
  },
  {
    id: "audio",
    title: "Audio File",
    summary: "Fallback for captionless YouTube, podcasts, recordings, and long-form uploads.",
    Icon: FileAudio,
    steps: [
      {
        label: "Start",
        action: "Choose Audio file.",
        outcome: "Yentl opens a drop zone.",
        screen: "start",
      },
      {
        label: "Upload",
        action: "Drop MP3, M4A, WAV, MP4, or another supported media file.",
        outcome: "Large files can be uploaded before transcription.",
        screen: "audio-upload",
      },
      {
        label: "Process",
        action: "Yentl transcribes the file with timestamps.",
        outcome: "The same Watch and Transcript surfaces become available.",
        screen: "audio-processing",
      },
    ],
  },
  {
    id: "text",
    title: "Text / Document",
    summary: "Paste or drop a transcript when the source audio is already transcribed.",
    Icon: FileText,
    steps: [
      {
        label: "Start",
        action: "Choose Text doc.",
        outcome: "Yentl opens a paste/drop surface.",
        screen: "start",
      },
      {
        label: "Ingest",
        action: "Paste text or drop a document.",
        outcome: "Claims and rhetoric markers are extracted from the transcript.",
        screen: "text-doc",
      },
    ],
  },
  {
    id: "mic",
    title: "Microphone",
    summary: "Live conversation mode for rooms, meetings, interviews, and debates.",
    Icon: Mic,
    steps: [
      {
        label: "Start",
        action: "Choose Microphone.",
        outcome: "Yentl asks for browser mic permission.",
        screen: "start",
      },
      {
        label: "Listen",
        action: "Start the session.",
        outcome: "Live transcript and speaker-aware fact-checking begin.",
        screen: "mic-live",
      },
    ],
  },
  {
    id: "media-url",
    title: "Media URL",
    summary: "Direct MP3, MP4, stream, or podcast feed URL ingestion.",
    Icon: LinkIcon,
    steps: [
      {
        label: "Start",
        action: "Choose Media URL.",
        outcome: "Yentl opens a URL ingest form.",
        screen: "start",
      },
      {
        label: "Fetch",
        action: "Paste a direct media URL.",
        outcome: "Yentl extracts audio and routes it through the batch flow.",
        screen: "media-url",
      },
    ],
  },
  {
    id: "workspace",
    title: "Session Workspace",
    summary: "The approved product core: Overview-first command center, Watch for synced video, Transcript as a drill path, then filtered claims and markers.",
    Icon: LayoutDashboard,
    steps: [
      {
        label: "Overview",
        action: "Open a running or loaded session.",
        outcome: "Yentl shows the L1 summary, key metrics, topics, and recent activity before any transcript digging.",
        screen: "overview",
      },
      {
        label: "Watch",
        action: "Switch to Watch for playable sources.",
        outcome: "Video stays 16:9 and central, with transcript, claims, markers, and sync controls designed around it.",
        screen: "watch",
      },
      {
        label: "Transcript",
        action: "Switch to Transcript when the words themselves matter.",
        outcome: "Speaker-aware transcript becomes a clean reading and correction surface.",
        screen: "transcript",
      },
      {
        label: "Claims",
        action: "Click a claim metric, headline chip, or Claims tab.",
        outcome: "The filtered claim list opens with sorting, refinement, and clear next-step detail routes.",
        screen: "claims-list",
      },
      {
        label: "Markers",
        action: "Click a rhetoric/fallacy/bias metric or Markers tab.",
        outcome: "The marker list opens with severity, pattern, speaker, and timestamp context.",
        screen: "markers-list",
      },
    ],
  },
  {
    id: "drilldown",
    title: "Drill-down / Learning",
    summary: "L3 and L4: item details, evidence dossiers, transcript context, and educational explainers for markers and claims.",
    Icon: BookOpen,
    steps: [
      {
        label: "Claim Detail",
        action: "Open a claim from Watch, Overview activity, or Claims.",
        outcome: "A focused detail panel explains verdict, confidence, evidence, source previews, and related context.",
        screen: "claim-detail",
      },
      {
        label: "Marker Detail",
        action: "Open a rhetoric marker from Watch, Overview activity, or Markers.",
        outcome: "The marker detail explains what happened, why it matters, and where it appears in the transcript.",
        screen: "marker-detail",
      },
      {
        label: "Claim Learn More",
        action: "Click Learn more from a claim detail.",
        outcome: "The user sees source dossier, related claims, topic links, and export/share affordances.",
        screen: "claim-learn",
      },
      {
        label: "Marker Learn More",
        action: "Click Learn more from a marker detail.",
        outcome: "Yentl explains the pattern with definition, how-to-spot cues, further reading, occurrences, and related patterns.",
        screen: "marker-learn",
      },
    ],
  },
  {
    id: "management",
    title: "Session Management",
    summary: "The practical surfaces that make long sessions feel durable: save, export, end, and restore from the library.",
    Icon: Save,
    steps: [
      {
        label: "Save Session",
        action: "Click Save in the session header.",
        outcome: "A focused save dialog names the session and explains what will be preserved.",
        screen: "save-dialog",
      },
      {
        label: "Export",
        action: "Click Export.",
        outcome: "The user chooses JSON, Markdown, transcript, evidence dossier, or a future report format.",
        screen: "export-dialog",
      },
      {
        label: "End Session",
        action: "Click End during a live session.",
        outcome: "Recording stops only after a deliberate confirmation that preserves the current analysis.",
        screen: "end-dialog",
      },
      {
        label: "Sessions Library",
        action: "Open Library from the header.",
        outcome: "Saved sessions can be searched, restored, renamed, exported, or deleted with confidence.",
        screen: "sessions-library",
      },
    ],
  },
  {
    id: "public-account",
    title: "Public / Trust / Account",
    summary: "The non-session product surfaces: entry point, authentication, and trust/legal content users will inspect before relying on Yentl.",
    Icon: ShieldCheck,
    steps: [
      {
        label: "Landing",
        action: "Open yentl before starting a session.",
        outcome: "The first viewport makes the product, source choices, and trust posture unmistakable.",
        screen: "landing",
      },
      {
        label: "Sign In / Sign Up",
        action: "Choose an account action.",
        outcome: "Auth feels connected to saving sessions and syncing across devices, not bolted on.",
        screen: "auth",
      },
      {
        label: "Trust Pages",
        action: "Open methodology, privacy, terms, accessibility, or subprocessors.",
        outcome: "Policy pages are readable, scannable, and connected back to product behavior.",
        screen: "trust-page",
      },
    ],
  },
  {
    id: "extension",
    title: "Chrome Extension",
    summary: "The any-video-on-any-page capture path: popup, options, waiting handoff, and live session feedback.",
    Icon: MonitorPlay,
    steps: [
      {
        label: "Extension Popup",
        action: "Click the Yentl extension on a tab with a video or livestream.",
        outcome: "The popup shows target tab, permissions, audio status, start/stop, and the connected Yentl session.",
        screen: "extension-popup",
      },
      {
        label: "Extension Options",
        action: "Open extension settings.",
        outcome: "The user controls app origin, language, capture behavior, privacy copy, and diagnostics.",
        screen: "extension-options",
      },
      {
        label: "App Waiting",
        action: "Return to Yentl while tab capture connects.",
        outcome: "The session page confirms selected tab, audio health, and next action.",
        screen: "browser-waiting",
      },
      {
        label: "App Live",
        action: "Play the video or stream.",
        outcome: "Yentl hears the tab and updates transcript, claims, markers, and synthesis live.",
        screen: "browser-live",
      },
    ],
  },
  {
    id: "mobile-app",
    title: "Mobile App Prep",
    summary: "Planned iOS and Android shapes: share-sheet import, live mic capture, saved-session review, and parity with the web contracts.",
    Icon: Smartphone,
    steps: [
      {
        label: "Mobile Import",
        action: "Share an audio/video file or direct media URL into Yentl.",
        outcome: "Mobile starts from the native share sheet or in-app import path, then joins the same analysis pipeline.",
        screen: "mobile-import",
      },
      {
        label: "Mobile Live",
        action: "Start a live mic session from the app.",
        outcome: "The phone UI prioritizes consent, audio quality, pause/end, and glanceable results.",
        screen: "mobile-live",
      },
      {
        label: "Mobile Library",
        action: "Open saved sessions on phone or tablet.",
        outcome: "The user can resume, review, search, and export without a desktop-sized control surface.",
        screen: "mobile-library",
      },
    ],
  },
];

const totalScreenCount = flows.reduce((count, flow) => count + flow.steps.length, 0);

const screenCritiques: Record<ScreenKind, ScreenCritique> = {
  start: {
    weak: [
      "Six equal choices make the first decision feel like a settings panel instead of a guided product.",
      "The page does not explain which source is best for live video, uploaded files, pasted text, or quick recovery from a failed YouTube import.",
    ],
    good: [
      "Lead with the most likely task and group the rest by job: live listening, paste a link, upload media, or paste text.",
      "Show one recommended path, one-line use cases, and instant recovery routes when a source is blocked.",
    ],
  },
  "youtube-input": {
    weak: [
      "The screen is mostly empty space around a raw URL field, so it does not feel like the start of a powerful video analysis flow.",
      "It hides the dependency on public captions until after the user hits the button.",
    ],
    good: [
      "Parse the URL live, show the video preview, and check caption availability before asking for commitment.",
      "Make fallback options visible before failure: browser tab capture, audio upload, or direct media URL.",
    ],
  },
  "youtube-loading": {
    weak: [
      "The loading state is generic and does not tell the user what is happening or how long it may take.",
      "There is no clear cancel, retry, or partial-progress story.",
    ],
    good: [
      "Show named stages: identifying video, checking captions, importing transcript, extracting claims, and preparing evidence.",
      "Keep cancel/retry controls available and reveal partial transcript as soon as it exists.",
    ],
  },
  "youtube-success": {
    weak: [
      "Video, transcript, and claims compete visually instead of forming one synchronized analysis experience.",
      "Claims are not clearly anchored to exact video moments, evidence, or confidence.",
    ],
    good: [
      "Use the video as the anchor, with a synced transcript rail and claim cards pinned to timestamps.",
      "Surface the next best action: review claims, jump to a disputed moment, export, or keep watching live.",
    ],
  },
  "youtube-no-captions": {
    weak: [
      "The error feels like a dead end and makes the user solve the recovery path outside the product.",
      "It does not explain why captions failed or which alternative is most reliable.",
    ],
    good: [
      "Turn the failure into a one-click branch: capture the browser tab, upload audio, or paste a direct media URL.",
      "Explain the limitation plainly and preserve the pasted video link for the next path.",
    ],
  },
  "browser-waiting": {
    weak: [
      "The waiting state assumes the user understands the extension handoff and what tab audio capture means.",
      "There is no visible connection status, selected-tab feedback, or audio health check.",
    ],
    good: [
      "Show extension status, selected tab, audio meter, permissions, and a short checklist of the next action.",
      "Make this the hero path for any video on any page, not a hidden fallback.",
    ],
  },
  "browser-live": {
    weak: [
      "Live listening looks like generic cards, so it does not communicate urgency, confidence, or what has just been heard.",
      "The user cannot quickly tell what Yentl heard, what it is checking, and what needs attention.",
    ],
    good: [
      "Design a live command center: audio health, rolling transcript, claims queue, evidence state, and timestamp jumps.",
      "Separate raw listening from verified conclusions so the user can trust the timing and status of each result.",
    ],
  },
  "audio-upload": {
    weak: [
      "The drop zone does not communicate supported formats, file limits, privacy, or expected processing time.",
      "It feels like a utility upload box instead of a recovery path for videos without captions.",
    ],
    good: [
      "List accepted formats, duration limits, privacy posture, and what happens after upload.",
      "Show this as a direct continuation from failed YouTube or browser capture flows.",
    ],
  },
  "audio-processing": {
    weak: [
      "Progress is mechanical and not connected to useful intermediate results.",
      "The user has no sense of ETA, partial transcript availability, or whether claim extraction is blocked.",
    ],
    good: [
      "Expose stage-level ETA and stream partial transcript as soon as transcription completes.",
      "Clearly distinguish upload, transcription, speaker detection, claim extraction, and evidence gathering.",
    ],
  },
  "text-doc": {
    weak: [
      "Paste/input and analysis are cramped into plain boxes with no document intelligence.",
      "It does not help with timestamps, speaker names, messy transcripts, PDFs, or structured files.",
    ],
    good: [
      "Detect structure before ingest: speakers, timestamps, headings, copied captions, PDFs, DOCX, and plain text.",
      "Preview cleanup decisions and let the user confirm before generating claims.",
    ],
  },
  "mic-live": {
    weak: [
      "Microphone mode looks too similar to every other session even though consent, privacy, and audio quality matter more here.",
      "Pause, end, save, and live confidence states are not prominent enough.",
    ],
    good: [
      "Start with permission, consent reminder, device selection, and a real audio meter.",
      "During live mode, keep pause, mark, end, and export controls fixed and unmistakable.",
    ],
  },
  "media-url": {
    weak: [
      "The flow assumes users know the difference between a webpage URL and a direct media URL.",
      "There is no detection, validation, preview, or fallback for unsupported links.",
    ],
    good: [
      "Validate the URL live, show detected type, duration, and source before analysis starts.",
      "When a webpage is pasted, route to browser tab capture or explain how to find the direct media file.",
    ],
  },
  overview: {
    weak: [
      "A generic dashboard becomes dead space if the synthesis, metrics, and activity do not create a clear hierarchy.",
      "If the transcript is treated as the main event, the user loses the top-line interpretation they asked Yentl for.",
    ],
    good: [
      "Make Overview the L1 command center: synthesis first, four meaningful metrics, topic concentration, and recent activity.",
      "Every tile and headline should open a specific L2 drill path so the overview is actionable, not decorative.",
    ],
  },
  watch: {
    weak: [
      "A video page fails immediately if the player is not true 16:9, large enough to anchor the layout, and visually primary.",
      "Side information should not float around the page without a relationship to the playback moment.",
    ],
    good: [
      "Build the desktop around a large 16:9 player, with claims/transcript/markers as a disciplined side column and a compact review row below.",
      "On mobile, make the video sticky enough to preserve context while transcript and claim queues stack below it.",
    ],
  },
  transcript: {
    weak: [
      "A transcript-only surface can become a wall of text with no correction, speaker, or evidence affordances.",
      "If timestamps, speakers, and linked findings are visually weak, users cannot audit how conclusions were reached.",
    ],
    good: [
      "Treat Transcript as a precise reading surface: speaker blocks, timestamps, search, correction controls, and linked verdict markers.",
      "Give mobile a clean single-column reader with a compact findings drawer instead of cramped sidebars.",
    ],
  },
  "claims-list": {
    weak: [
      "A flat claim list is hard to triage if it does not expose verdict mix, filters, source count, and confidence at a glance.",
      "Cards that look equal make true, false, partial, and unverifiable findings feel equally urgent.",
    ],
    good: [
      "Use URL-driven filters, sort controls, compact rows, verdict color bars, source counts, and clear detail routes.",
      "Make the list dense enough for scanning on desktop and tap-friendly enough for mobile.",
    ],
  },
  "markers-list": {
    weak: [
      "Rhetoric markers can look like trivia if severity, archetype, speaker, and quote context are not clear.",
      "Without educational routing, a marker list becomes labels without learning value.",
    ],
    good: [
      "Group markers by pattern and severity, show speaker/time/quote, and make Learn more one obvious step away.",
      "Use mobile filters as a bottom drawer or horizontal chip row, not a squeezed desktop toolbar.",
    ],
  },
  "claim-detail": {
    weak: [
      "A claim detail is dangerous if it gives a verdict without enough evidence, confidence, and source context to audit it.",
      "Detail screens that replace the whole app without breadcrumb or prev/next controls break review flow.",
    ],
    good: [
      "Show verdict, quote, confidence, evidence, source previews, reasoning bullets, transcript context, and re-check/share actions.",
      "Use a right-side panel on desktop and a full push view on mobile, both with reliable back and next/previous movement.",
    ],
  },
  "marker-detail": {
    weak: [
      "Marker details can feel accusatory or vague if they do not explain the detected pattern and exact transcript basis.",
      "The user needs to understand whether this is a fallacy, bias, rhetoric pattern, or merely a flag for review.",
    ],
    good: [
      "Pair the marked quote with pattern definition, severity, speaker context, timestamp, and transcript jump.",
      "Route directly to Learn more so the product teaches the concept instead of just labeling it.",
    ],
  },
  "claim-learn": {
    weak: [
      "Learn-more pages fail if they repeat the verdict instead of expanding the evidence and related claims.",
      "Long dossiers need structure or they will feel like a dump of links and excerpts.",
    ],
    good: [
      "Organize source dossier, related claims, topic context, and export/share actions into distinct sections.",
      "Keep the original claim visible so the user never loses what they came to understand.",
    ],
  },
  "marker-learn": {
    weak: [
      "Educational marker pages become academic clutter if they are not tied back to the current session.",
      "Definitions alone do not teach users how to spot the pattern next time.",
    ],
    good: [
      "Show definition, how-to-spot bullets, occurrences in this session, related patterns, and trusted reading links.",
      "On mobile, use a focused section stack with occurrences near the top.",
    ],
  },
  "save-dialog": {
    weak: [
      "Saving feels low-trust if the dialog does not say what is preserved and where the session will be found.",
      "A tiny modal can hide the actual value: long sessions should feel durable.",
    ],
    good: [
      "Name the session, preview saved contents, show local/account sync state, and confirm the library destination.",
      "Make mobile save a sheet with the same clarity, not an alert-style afterthought.",
    ],
  },
  "export-dialog": {
    weak: [
      "Export is not one action; different users need transcript, evidence, JSON, markdown, or report formats.",
      "If formats are unexplained, users will choose blindly or avoid exporting.",
    ],
    good: [
      "Present format cards with contents, best-use labels, privacy note, and disabled future formats clearly marked.",
      "Remember recent choices and keep export reachable after ending a session.",
    ],
  },
  "end-dialog": {
    weak: [
      "Ending a live session is a destructive-feeling moment if pause, save, and export are not clearly separated.",
      "Users need reassurance that the analysis remains on screen after recording stops.",
    ],
    good: [
      "Confirm what stops, what remains, and whether to save/export immediately after ending.",
      "On mobile, make pause/end controls unmistakable and hard to tap accidentally.",
    ],
  },
  "sessions-library": {
    weak: [
      "A library becomes a graveyard if saved sessions cannot be searched, compared, restored, renamed, and cleaned up.",
      "Rows without source, duration, counts, and recency force the user to remember everything.",
    ],
    good: [
      "Use a searchable table/list with source badges, counts, duration, saved time, restore, rename, export, and delete.",
      "Give mobile a strong search header and roomy session rows with the essential stats.",
    ],
  },
  landing: {
    weak: [
      "A marketing-style landing page would miss the product: users need to understand live fact-checking and source options instantly.",
      "Decorative hero space cannot replace a real first action.",
    ],
    good: [
      "Make yentl and the literal offer visible in the first viewport, with source paths and trust posture immediately available.",
      "Use authentic product screenshots or a working preview rather than abstract illustration.",
    ],
  },
  auth: {
    weak: [
      "Auth feels like friction if it does not explain why an account matters for sessions and mobile sync.",
      "A generic sign-in box disconnects from the product’s privacy expectations.",
    ],
    good: [
      "Frame sign-in around saved sessions, device sync, exports, and privacy controls.",
      "Keep the form compact and trustworthy, with clear recovery and guest-continuation paths where allowed.",
    ],
  },
  "trust-page": {
    weak: [
      "Legal and methodology pages are often walls of text that fail the exact trust job they exist for.",
      "Users need the connection between policies and concrete product behavior.",
    ],
    good: [
      "Use a readable document layout with a sticky table of contents, concise summaries, and links back to relevant app behavior.",
      "Separate methodology, privacy, terms, accessibility, and subprocessors while keeping one coherent trust system.",
    ],
  },
  "extension-popup": {
    weak: [
      "A browser extension popup cannot rely on mystery badge states; users need confirmation before recording tab audio.",
      "Missing target-tab and audio-state feedback makes the any-video flow feel risky.",
    ],
    good: [
      "Show the selected tab, start/stop, permission status, audio meter, connected Yentl origin, and consent copy.",
      "Make failure states recoverable: no audio, blocked page, app not open, or missing origin.",
    ],
  },
  "extension-options": {
    weak: [
      "Extension settings can become developer leftovers if origin, privacy, language, and diagnostics are not user-facing.",
      "A hidden configuration page makes production support harder.",
    ],
    good: [
      "Expose app origin, capture behavior, transcript language, privacy reminders, diagnostics, and reset controls.",
      "Use plain labels and status checks so support can diagnose without asking users to inspect internals.",
    ],
  },
  "mobile-import": {
    weak: [
      "Mobile cannot simply promise arbitrary background video capture; platform limits must shape the UX honestly.",
      "If import starts from desktop assumptions, share-sheet and file flows will feel awkward.",
    ],
    good: [
      "Design for share sheet, file picker, direct media URL, and in-app source handoff with clear platform limits.",
      "Keep progress, offline/retry, and saved-session continuation visible from the first mobile screen.",
    ],
  },
  "mobile-live": {
    weak: [
      "A mobile live session fails if controls are tiny, consent is buried, or audio health is hard to read outdoors/in motion.",
      "Desktop tabs do not translate to a one-hand phone workflow.",
    ],
    good: [
      "Prioritize mic permission, consent, live meter, pause/end, a short synthesis card, and bottom navigation between transcript and findings.",
      "Use large tap targets and persistent status so the user can trust what is being recorded.",
    ],
  },
  "mobile-library": {
    weak: [
      "Saved sessions on mobile cannot be a shrunken table.",
      "Without strong search and recency cues, the user cannot find a conversation quickly.",
    ],
    good: [
      "Use a search-first list with source badges, counts, duration, and quick resume/export actions.",
      "Prepare for iOS and Android sync by making account state and local availability visible.",
    ],
  },
};

export function UxFlowDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("az-flow");

  return (
    <div className="mx-auto w-full max-w-[1280px] px-4 py-6 sm:px-6 md:px-8">
      <section className="border-b border-line-soft pb-5">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-2/30 bg-amber-soft px-3 py-1 text-[11px] font-medium text-amber-2">
          Current implementation critique
        </div>
        <div className="mt-3 grid gap-4 lg:grid-cols-[minmax(0,0.72fr)_minmax(320px,0.28fr)] lg:items-end">
          <div>
            <h1 className="font-serif text-[30px] font-medium leading-tight tracking-tight text-ink sm:text-[40px]">
              UX flow map
            </h1>
            <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-3">
              This workspace starts with screenshot review so every captured page,
              branch, and route can be opened and commented on directly. The screen
              atlas and visual-evidence system remain available for critique and
              production planning.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-paper p-4 text-[12.5px] leading-relaxed text-ink-3">
            <strong className="text-ink-2">Review rule:</strong> open a screenshot,
            click the exact spot, and leave the comment there. Repeated design
            problems should show up as reusable fixes, not scattered notes.
          </div>
        </div>
      </section>

      <DashboardTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "atlas" && (
        <>
          <AtlasIndex />

          <div className="mt-6 grid gap-5">
            {flows.map((flow) => (
              <FlowSection key={flow.id} flow={flow} />
            ))}
          </div>
        </>
      )}

      {activeTab === "az-flow" && <AzFlowDashboard />}
      {activeTab === "visual-evidence" && <VisualEvidenceDashboard />}
    </div>
  );
}

function DashboardTabs({
  activeTab,
  onChange,
}: {
  activeTab: DashboardTab;
  onChange: (tab: DashboardTab) => void;
}) {
  const tabs: Array<{
    id: DashboardTab;
    label: string;
    description: string;
    Icon: ComponentType<{ className?: string }>;
  }> = [
    {
      id: "atlas",
      label: "Screen Atlas",
      description: "Wireframes and critique",
      Icon: LayoutDashboard,
    },
    {
      id: "az-flow",
      label: "A-to-Z Flow",
      description: "Commentable screenshots",
      Icon: Network,
    },
    {
      id: "visual-evidence",
      label: "Visual Evidence System",
      description: "Sources, thumbnails, marker assets",
      Icon: Palette,
    },
  ];

  return (
    <nav aria-label="Project flow workspace tabs" className="mt-5 grid gap-2 md:grid-cols-3">
      {tabs.map((tab) => {
        const Icon = tab.Icon;
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              "flex items-center gap-3 rounded-lg border px-3 py-3 text-left transition",
              active
                ? "border-teal/40 bg-teal-soft text-ink shadow-sm"
                : "border-line bg-paper text-ink-3 hover:border-teal/30 hover:bg-cream",
            ].join(" ")}
            aria-pressed={active}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-teal">
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold text-ink-2">
                {tab.label}
              </span>
              <span className="text-[11px] text-ink-4">{tab.description}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function AtlasIndex() {
  return (
    <section className="mt-5 rounded-lg border border-line bg-paper p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Screen atlas index
          </div>
          <h2 className="mt-1 font-serif text-[24px] font-medium leading-tight text-ink">
            {flows.length} product flows · {totalScreenCount} desktop/mobile screens
          </h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-ink-3">
            Review order starts with the source paths, then the core session workspace,
            drill-downs, management surfaces, public trust/account pages, extension
            capture, and mobile app preparation.
          </p>
        </div>
        <div className="grid shrink-0 grid-cols-3 gap-2 text-center sm:grid-cols-3">
          {[
            ["Core", "5 screens"],
            ["Capture", "21 screens"],
            ["Mobile", "3 screens"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-md border border-line-soft bg-cream px-3 py-2">
              <div className="font-serif text-[18px] leading-none text-ink">{value}</div>
              <div className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                {label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {flows.map((flow) => {
          const Icon = flow.Icon;
          return (
            <a
              key={flow.id}
              href={`#flow-${flow.id}`}
              className="group flex min-w-0 items-center gap-3 rounded-md border border-line-soft bg-cream px-3 py-2 transition hover:border-teal/40 hover:bg-teal-soft/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-paper text-teal">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
              <span className="block text-[12px] font-semibold leading-snug text-ink-2">
                  {flow.title}
                </span>
                <span className="text-[10px] text-ink-4">
                  {flow.steps.length} screens
                </span>
              </span>
            </a>
          );
        })}
      </div>
      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {[
          ["Desktop rule", "Design at 1440 x 900 first: primary work surface fills the page, side rails support it, and bottom rows carry state/actions."],
          ["Mobile rule", "Phone screens are their own flows: one-hand controls, visible recording status, bottom navigation, and no shrunken desktop tables."],
          ["Approval rule", "Each frame must show the user action, the expected result, why the old pattern fails, and the target design behavior."],
        ].map(([label, text]) => (
          <div key={label} className="rounded-md border border-line-soft bg-cream px-3 py-3 text-[12px] leading-relaxed text-ink-3">
            <span className="font-semibold text-ink-2">{label}:</span> {text}
          </div>
        ))}
      </div>
    </section>
  );
}

function FlowSection({ flow }: { flow: Flow }) {
  const Icon = flow.Icon;

  return (
    <section id={`flow-${flow.id}`} className="scroll-mt-24 rounded-lg border border-line bg-paper p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-soft text-teal">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="font-serif text-[22px] font-medium leading-tight text-ink">
              {flow.title}
            </h2>
            <p className="mt-1 max-w-3xl text-[13px] leading-relaxed text-ink-3">
              {flow.summary}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full border border-line bg-cream px-2.5 py-1 text-[11px] font-medium text-ink-3">
          {flow.steps.length} screens
        </span>
      </div>

      <ol className="grid gap-4">
        {flow.steps.map((step, index) => (
          <li key={`${flow.id}-${step.label}-${index}`} className="min-w-0">
            <StepCard step={step} index={index} isLast={index === flow.steps.length - 1} />
          </li>
        ))}
      </ol>
    </section>
  );
}

function StepCard({ step, index, isLast }: { step: FlowStep; index: number; isLast: boolean }) {
  const critique = screenCritiques[step.screen];

  return (
    <div className="h-full overflow-hidden rounded-lg border border-line bg-cream">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft bg-paper px-3 py-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-ink-4">
            Screen {index + 1}
          </div>
          <div className="text-[13px] font-semibold text-ink">{step.label}</div>
        </div>
        {!isLast && <ArrowRight className="h-4 w-4 shrink-0 text-ink-4" aria-hidden />}
      </div>
      <div>
        <div className="border-b border-line-soft bg-cream p-3 sm:p-4">
          <PreviewPanel label="Desktop" caption="1440 x 900 simulation">
            <ScreenshotFrame kind={step.screen} viewport="desktop" />
          </PreviewPanel>
        </div>
        <div className="grid gap-4 bg-paper p-3 text-[12px] leading-relaxed lg:grid-cols-[minmax(340px,420px)_minmax(0,1fr)] sm:p-4">
          <PreviewPanel label="Mobile">
            <ScreenshotFrame kind={step.screen} viewport="mobile" />
          </PreviewPanel>
          <div className="grid content-start gap-3 xl:grid-cols-3">
            <div className="grid gap-2 rounded-md border border-line-soft bg-cream px-3 py-3">
              <p className="text-ink-2">
                <span className="font-semibold">User action:</span> {step.action}
              </p>
              <p className="text-ink-3">
                <span className="font-semibold text-ink-2">Expected result:</span> {step.outcome}
              </p>
            </div>
            <CritiqueBlock title="Why this is weak" items={critique.weak} tone="weak" />
            <CritiqueBlock title="Good design target" items={critique.good} tone="good" />
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewPanel({
  label,
  caption,
  children,
}: {
  label: string;
  caption?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
          {label}
        </span>
        {caption && (
          <span className="text-[10px] font-medium text-ink-4">
            {caption}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function CritiqueBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "weak" | "good";
}) {
  const accent = tone === "weak" ? "border-amber/70 bg-amber-soft/45" : "border-green/30 bg-green-soft/55";

  return (
    <section className={`rounded-md border px-3 py-3 ${accent}`}>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-2">
        {title}
      </h3>
      <ul className="mt-2 grid gap-1.5 text-[11.5px] leading-relaxed text-ink-3">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-[0.55em] h-1 w-1 shrink-0 rounded-full bg-current" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ScreenshotFrame({ kind, viewport }: { kind: ScreenKind; viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div
      role="img"
      aria-label={`Screenshot: ${viewport} ${kind.replaceAll("-", " ")}`}
      className={isMobile ? "mx-auto w-full max-w-[390px]" : "w-full"}
    >
      <div
        className={`flex min-w-0 overflow-hidden rounded-md border border-line bg-paper shadow-sm [overflow-wrap:anywhere] [&_*]:min-w-0 ${
          isMobile
            ? "h-[740px] flex-col"
            : "min-h-[520px] flex-col lg:aspect-[16/10] lg:min-h-[600px] xl:min-h-[640px]"
        }`}
      >
        <div className="flex items-center gap-1 border-b border-line-soft bg-cream px-2 py-1.5">
          <span className="h-2 w-2 rounded-full bg-red" />
          <span className="h-2 w-2 rounded-full bg-amber" />
          <span className="h-2 w-2 rounded-full bg-green" />
          <span className="ml-2 h-2 flex-1 rounded-full bg-line-soft" />
        </div>
        <div className="min-h-0 min-w-0 flex-1">
          <ScreenMock kind={kind} viewport={viewport} />
        </div>
      </div>
    </div>
  );
}

function ScreenMock({ kind, viewport }: { kind: ScreenKind; viewport: Viewport }) {
  switch (kind) {
    case "start":
      return <StartScreen viewport={viewport} />;
    case "youtube-input":
      return <YoutubeInputScreen viewport={viewport} />;
    case "youtube-loading":
      return <YoutubeLoadingScreen viewport={viewport} />;
    case "youtube-success":
      return <YoutubeSuccessScreen viewport={viewport} />;
    case "youtube-no-captions":
      return <YoutubeNoCaptionsScreen viewport={viewport} />;
    case "browser-waiting":
      return <BrowserWaitingScreen viewport={viewport} />;
    case "browser-live":
      return <LiveAnalysisScreen source="Browser tab" viewport={viewport} />;
    case "audio-upload":
      return <UploadScreen viewport={viewport} />;
    case "audio-processing":
      return <ProcessingScreen viewport={viewport} />;
    case "text-doc":
      return <TextDocScreen viewport={viewport} />;
    case "mic-live":
      return <LiveAnalysisScreen source="Microphone" viewport={viewport} />;
    case "media-url":
      return <MediaUrlScreen viewport={viewport} />;
    case "overview":
      return <OverviewScreen viewport={viewport} />;
    case "watch":
      return <WatchWorkspaceScreen viewport={viewport} />;
    case "transcript":
      return <TranscriptWorkspaceScreen viewport={viewport} />;
    case "claims-list":
      return <FilteredListScreen type="claims" viewport={viewport} />;
    case "markers-list":
      return <FilteredListScreen type="markers" viewport={viewport} />;
    case "claim-detail":
      return <DetailScreen type="claim" viewport={viewport} />;
    case "marker-detail":
      return <DetailScreen type="marker" viewport={viewport} />;
    case "claim-learn":
      return <LearnScreen type="claim" viewport={viewport} />;
    case "marker-learn":
      return <LearnScreen type="marker" viewport={viewport} />;
    case "save-dialog":
      return <DialogScreen type="save" viewport={viewport} />;
    case "export-dialog":
      return <DialogScreen type="export" viewport={viewport} />;
    case "end-dialog":
      return <DialogScreen type="end" viewport={viewport} />;
    case "sessions-library":
      return <SessionsLibraryScreen viewport={viewport} />;
    case "landing":
      return <LandingScreen viewport={viewport} />;
    case "auth":
      return <AuthScreen viewport={viewport} />;
    case "trust-page":
      return <TrustPageScreen viewport={viewport} />;
    case "extension-popup":
      return <ExtensionPopupScreen viewport={viewport} />;
    case "extension-options":
      return <ExtensionOptionsScreen viewport={viewport} />;
    case "mobile-import":
      return <MobileImportScreen viewport={viewport} />;
    case "mobile-live":
      return <MobileLiveScreen viewport={viewport} />;
    case "mobile-library":
      return <MobileLibraryScreen viewport={viewport} />;
  }
}

function MiniHeader({ state = "Idle", viewport = "desktop" }: { state?: string; viewport?: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
      <div className="flex items-center gap-2">
        <span className={`font-serif text-ink ${isMobile ? "text-[16px]" : "text-[18px]"}`}>
          yentl
        </span>
        <span className="h-1.5 w-1.5 rounded-full bg-amber" />
        <span className="rounded-full border border-line bg-cream px-2 py-0.5 text-[10px] text-ink-3">
          {state}
        </span>
      </div>
      {!isMobile && (
        <span className="rounded-md border border-line px-2 py-1 text-[10px] text-ink-3">
          Export
        </span>
      )}
    </div>
  );
}

function StartScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={isMobile ? "px-3 py-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "" : "w-full max-w-[840px]"}>
          <div className={`mx-auto mb-4 rounded-2xl bg-teal-soft ${isMobile ? "h-10 w-10" : "h-20 w-20"}`} />
          <div className={isMobile ? "mx-auto mb-2 h-4 max-w-[220px] rounded-full bg-ink/15" : "mx-auto mb-3 h-7 max-w-[360px] rounded-full bg-ink/15"} />
          <div className={isMobile ? "mx-auto mb-5 h-2.5 max-w-[260px] rounded-full bg-line" : "mx-auto mb-8 h-3 max-w-[520px] rounded-full bg-line"} />
          <div className={`grid gap-3 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {["Microphone", "Browser tab", "Text doc", "Audio file", "YouTube", "Media URL"].map((label) => (
              <div key={label} className={isMobile ? "rounded-md border border-line bg-paper p-2" : "rounded-md border border-line bg-paper p-5"}>
                <div className={isMobile ? "mb-2 h-6 w-6 rounded-md bg-cream-2" : "mb-4 h-10 w-10 rounded-md bg-cream-2"} />
                <div className={isMobile ? "text-[10px] font-medium text-ink-2" : "text-[15px] font-medium text-ink-2"}>{label}</div>
                <div className={isMobile ? "mt-1 h-1.5 rounded-full bg-line-soft" : "mt-3 h-2 rounded-full bg-line-soft"} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function YoutubeInputScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={isMobile ? "grid gap-3 p-3" : "grid flex-1 items-center gap-6 p-8 lg:grid-cols-[minmax(0,1fr)_360px]"}>
        <div className={isMobile ? "min-w-0 rounded-md border border-line bg-paper p-3" : "rounded-md border border-line bg-paper p-6"}>
          <div className="mb-2 inline-flex rounded-full bg-teal-soft px-2 py-0.5 text-[9px] font-semibold text-teal">
            YouTube captions
          </div>
          <div className={isMobile ? "mb-2 h-4 w-44 rounded-full bg-ink/15" : "mb-3 h-7 w-72 rounded-full bg-ink/15"} />
          <div className={isMobile ? "mb-3 h-2.5 w-56 max-w-full rounded-full bg-line" : "mb-8 h-3 w-[520px] max-w-full rounded-full bg-line"} />
          <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
            <div className={isMobile ? "min-w-0 flex-1 rounded-md border border-line bg-cream px-2 py-2 text-[10px] text-ink-3" : "min-w-0 flex-1 rounded-md border border-line bg-cream px-3 py-3 text-[14px] text-ink-3"}>
              https://www.youtube.com/watch?v=...
            </div>
            <div className={isMobile ? "rounded-md bg-ink px-3 py-2 text-[10px] font-medium text-white" : "rounded-md bg-ink px-5 py-3 text-[14px] font-medium text-white"}>
              Fetch captions
            </div>
          </div>
          <div className={isMobile ? "mt-2 rounded-md border border-green/25 bg-green-soft px-2 py-1.5 text-[10px] text-ink-2" : "mt-4 rounded-md border border-green/25 bg-green-soft px-3 py-2 text-[13px] text-ink-2"}>
            <CheckCircle2 className="mr-1 inline h-3 w-3 text-green" />
            Video recognized
          </div>
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-paper">
          <div className="aspect-video bg-ink" />
          <div className={isMobile ? "space-y-1.5 p-2" : "space-y-2 p-4"}>
            <div className={isMobile ? "h-2 rounded-full bg-line" : "h-3 rounded-full bg-line"} />
            <div className={isMobile ? "h-2 w-2/3 rounded-full bg-line-soft" : "h-3 w-2/3 rounded-full bg-line-soft"} />
          </div>
        </div>
      </div>
    </div>
  );
}

function YoutubeLoadingScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={isMobile ? "p-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "" : "w-full max-w-[900px] rounded-lg border border-line bg-paper p-8"}>
          <div className={isMobile ? "mb-3 h-4 w-44 rounded-full bg-ink/15" : "mb-6 h-7 w-72 rounded-full bg-ink/15"} />
          <div className={`grid gap-2 ${isMobile ? "" : "grid-cols-4"}`}>
            {[
              ["Find video", "done"],
              ["Check captions", "active"],
              ["Build transcript", "waiting"],
              ["Open Watch", "waiting"],
            ].map(([label, state]) => (
              <div key={label} className={isMobile ? "rounded-md border border-line bg-paper p-2 text-[10px] text-ink-3" : "rounded-md border border-line bg-cream p-4 text-[13px] text-ink-3"}>
                <div
                  className={[
                    isMobile ? "mb-2 h-1.5 rounded-full" : "mb-4 h-2 rounded-full",
                    state === "done" && "bg-green",
                    state === "active" && "bg-teal",
                    state === "waiting" && "bg-line-strong",
                  ].filter(Boolean).join(" ")}
                />
                {label}
              </div>
            ))}
          </div>
          <div className={isMobile ? "mt-3 rounded-md border border-line bg-cream px-3 py-2 text-[10px] text-ink-3" : "mt-6 rounded-md border border-line bg-cream px-4 py-3 text-[13px] text-ink-3"}>
            Preparing video analysis...
          </div>
        </div>
      </div>
    </div>
  );
}

function YoutubeSuccessScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  if (!isMobile) {
    return (
      <div className="flex h-full flex-col">
        <MiniHeader state="Loaded" viewport={viewport} />
        <div className="border-b border-line-soft bg-paper px-6 py-4">
          <div className="mb-1 inline-flex rounded-full bg-teal-soft px-2 py-0.5 text-[9px] font-semibold text-teal">
            YouTube
          </div>
          <div className="h-7 w-80 rounded-full bg-ink/15" />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
          <div className="grid min-h-0 flex-1 gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <div className="aspect-video w-full rounded-md bg-ink p-5 text-white shadow-sm">
                <div className="flex h-full flex-col justify-between">
                  <div className="h-3 w-36 rounded-full bg-white/20" />
                  <div className="space-y-2">
                    <div className="h-3 rounded-full bg-white/30" />
                    <div className="h-2 w-2/3 rounded-full bg-white/20" />
                  </div>
                </div>
              </div>
            </div>
            <aside className="flex min-h-0 flex-col rounded-md border border-line bg-paper p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                  Evidence queue
                </div>
                <div className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-ink-3">
                  2 active
                </div>
              </div>
              <div className="grid gap-3">
                <MiniClaim label="PARTIAL" text="Transcript claims are grouped beside the video." />
                <MiniClaim label="FALSE" text="Click a claim for evidence and source previews." />
                <div className="rounded-md border border-line bg-cream p-3">
                  <div className="mb-2 h-3 w-28 rounded-full bg-ink/15" />
                  <TranscriptLines />
                </div>
              </div>
            </aside>
          </div>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="grid grid-cols-3 gap-3">
              {["00:18 synced", "12 transcript lines", "2 findings"].map((label) => (
                <div key={label} className="rounded-md border border-line bg-paper px-3 py-3 text-[12px] text-ink-3">
                  {label}
                </div>
              ))}
            </div>
            <div className="rounded-md border border-line bg-paper px-3 py-3 text-[12px] text-ink-3">
              Transcript-linked review
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Loaded" viewport={viewport} />
      <div className={isMobile ? "border-b border-line-soft bg-paper px-3 py-2" : "border-b border-line-soft bg-paper px-6 py-4"}>
        <div className="mb-1 inline-flex rounded-full bg-teal-soft px-2 py-0.5 text-[9px] font-semibold text-teal">
          YouTube
        </div>
        <div className={isMobile ? "h-3.5 w-40 rounded-full bg-ink/15" : "h-7 w-80 rounded-full bg-ink/15"} />
      </div>
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-3" : "grid-cols-[minmax(0,0.62fr)_minmax(320px,0.38fr)] p-6"}`}>
        <div className="space-y-2">
          <div className="rounded-md bg-ink p-3 text-white">
            <div className={`h-3 w-24 rounded-full bg-white/20 ${isMobile ? "mb-6" : "mb-56"}`} />
            <div className={isMobile ? "mt-5 h-2 rounded-full bg-white/30" : "mt-8 h-3 rounded-full bg-white/30"} />
            <div className="mt-2 h-2 w-2/3 rounded-full bg-white/20" />
          </div>
          <div className={isMobile ? "rounded-md border border-line bg-paper px-2 py-1.5 text-[10px] text-ink-3" : "rounded-md border border-line bg-paper px-3 py-2 text-[12px] text-ink-3"}>
            00:18 synced · Transcript-linked review
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            Evidence queue
          </div>
          <MiniClaim label="PARTIAL" text="Transcript claims are grouped beside the video." />
          <MiniClaim label="FALSE" text="Click a claim for evidence and source previews." />
        </div>
      </div>
    </div>
  );
}

function YoutubeNoCaptionsScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={isMobile ? "p-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "" : "w-full max-w-[760px]"}>
        <div className={isMobile ? "rounded-md border border-amber bg-amber-soft p-3 text-[10.5px] leading-relaxed text-amber-2" : "rounded-md border border-amber bg-amber-soft p-5 text-[15px] leading-relaxed text-amber-2"}>
          <AlertCircle className="mr-1 inline h-3 w-3" />
          No captions available. Continue without leaving the flow.
        </div>
        <div className={`mt-3 grid gap-2 ${isMobile ? "" : "grid-cols-3"}`}>
          {["Browser tab", "Audio file", "Media URL"].map((label, index) => (
            <div
              key={label}
              className={[
                "rounded-md border px-2 py-2 text-center text-[10px] font-medium",
                index === 0 ? "border-ink bg-ink text-white" : "border-line bg-paper text-ink-2",
              ].join(" ")}
            >
              {label}
            </div>
          ))}
        </div>
        </div>
      </div>
    </div>
  );
}

function BrowserWaitingScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  if (!isMobile) {
    return (
      <div className="flex h-full flex-col">
        <MiniHeader state="Listening" viewport={viewport} />
        <div className="grid min-h-0 flex-1 gap-5 p-6 lg:grid-cols-[minmax(0,0.62fr)_minmax(340px,0.38fr)]">
          <section className="flex min-h-0 flex-col justify-between rounded-md border border-line bg-paper p-6">
            <div>
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-md bg-teal-soft text-teal">
                <MonitorPlay className="h-7 w-7" />
              </div>
              <div className="mb-3 h-7 w-80 rounded-full bg-ink/15" />
              <div className="h-3 w-[620px] max-w-full rounded-full bg-line" />
            </div>
            <div className="mt-8 overflow-hidden rounded-md border border-line bg-cream">
              <div className="aspect-video bg-ink/90" />
              <div className="grid gap-2 p-3">
                <div className="h-2 rounded-full bg-line" />
                <div className="h-2 w-2/3 rounded-full bg-line-soft" />
              </div>
            </div>
          </section>
          <aside className="grid content-start gap-3">
            <div className="rounded-md border border-green/30 bg-green-soft p-4">
              <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                Extension
              </div>
              <div className="h-3 w-40 rounded-full bg-green/40" />
            </div>
            <div className="rounded-md border border-line bg-paper p-4">
              <div className="mb-3 h-4 w-36 rounded-full bg-ink/15" />
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-line" />
                <div className="h-2 rounded-full bg-line" />
                <div className="h-2 w-3/4 rounded-full bg-line" />
              </div>
            </div>
            <div className="rounded-md border border-line bg-paper p-4">
              <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                Audio health
              </div>
              <div className="flex h-16 items-end gap-1">
                {[30, 52, 42, 68, 55, 78, 48, 62].map((height) => (
                  <span
                    key={height}
                    className="w-3 rounded-t bg-teal"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Listening" viewport={viewport} />
      <div className={isMobile ? "p-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "rounded-md border border-line bg-paper p-4" : "w-full max-w-[720px] rounded-md border border-line bg-paper p-8"}>
          <div className={isMobile ? "mb-3 flex h-8 w-8 items-center justify-center rounded-md bg-teal-soft text-teal" : "mb-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal-soft text-teal"}>
            <MonitorPlay className={isMobile ? "h-4 w-4" : "h-6 w-6"} />
          </div>
          <div className={isMobile ? "mb-2 h-4 w-40 rounded-full bg-ink/15" : "mb-3 h-7 w-72 rounded-full bg-ink/15"} />
          <div className={isMobile ? "h-2 w-64 max-w-full rounded-full bg-line" : "h-3 w-[520px] max-w-full rounded-full bg-line"} />
          <div className={isMobile ? "mt-4 h-8 w-40 rounded-md bg-teal" : "mt-8 h-12 w-56 rounded-md bg-teal"} />
        </div>
      </div>
    </div>
  );
}

function UploadScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={isMobile ? "p-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "rounded-lg border border-dashed border-line-strong bg-cream p-5 text-center" : "w-full max-w-[720px] rounded-lg border border-dashed border-line-strong bg-cream p-16 text-center"}>
          <FileAudio className={isMobile ? "mx-auto mb-3 h-8 w-8 text-teal" : "mx-auto mb-5 h-14 w-14 text-teal"} />
          <div className={isMobile ? "mx-auto mb-2 h-3 w-36 rounded-full bg-ink/15" : "mx-auto mb-3 h-6 w-64 rounded-full bg-ink/15"} />
          <div className={isMobile ? "mx-auto h-2 w-full max-w-52 rounded-full bg-line" : "mx-auto h-3 w-96 rounded-full bg-line"} />
        </div>
      </div>
    </div>
  );
}

function ProcessingScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Processing" viewport={viewport} />
      <div className={isMobile ? "space-y-3 p-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "space-y-3" : "grid w-full max-w-[900px] gap-4"}>
          <ProgressRow label="Uploading media" value="100%" />
          <ProgressRow label="Transcribing audio" value="64%" />
          <ProgressRow label="Extracting claims" value="Queued" />
        </div>
      </div>
    </div>
  );
}

function TextDocScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-4" : "grid-cols-[1fr_0.7fr] p-8"}`}>
        <div className={isMobile ? "rounded-md border border-line bg-paper p-3" : "rounded-md border border-line bg-paper p-6"}>
          <div className={isMobile ? "mb-2 h-3 w-28 rounded-full bg-ink/15" : "mb-5 h-6 w-52 rounded-full bg-ink/15"} />
          <div className={isMobile ? "space-y-1.5" : "space-y-3"}>
            <div className={isMobile ? "h-2 rounded-full bg-line" : "h-4 rounded-full bg-line"} />
            <div className={isMobile ? "h-2 rounded-full bg-line" : "h-4 rounded-full bg-line"} />
            <div className={isMobile ? "h-2 w-2/3 rounded-full bg-line" : "h-4 w-2/3 rounded-full bg-line"} />
          </div>
        </div>
        <div className={isMobile ? "rounded-md border border-line bg-cream p-3" : "rounded-md border border-line bg-cream p-5"}>
          <MiniClaim label="MISLEADING" text="Claims extracted from pasted transcript." />
        </div>
      </div>
    </div>
  );
}

function MediaUrlScreen({ viewport }: { viewport: Viewport }) {
  return (
    <FormScreen
      title="Paste a media URL"
      subtitle="Direct MP3, MP4, or podcast feed."
      input="https://example.com/audio.mp3"
      button="Analyze"
      viewport={viewport}
    />
  );
}

function LiveAnalysisScreen({ source, viewport }: { source: string; viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Listening" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-3" : "grid-cols-[0.55fr_0.45fr] p-6"}`}>
        <div className={isMobile ? "rounded-md border border-line bg-paper p-3" : "overflow-hidden rounded-md border border-line bg-paper p-5"}>
          <div className="mb-2 flex items-center gap-2 text-[10px] font-medium text-ink-3">
            <Radio className="h-3 w-3 text-green" />
            {source}
          </div>
          <TranscriptLines />
        </div>
        <div className="space-y-2">
          <MiniClaim label="CHECKING" text="Live claims appear as speech resolves." />
          <MiniClaim label="RHETORIC" text="Markers capture framing, fallacies, and bias." />
        </div>
      </div>
    </div>
  );
}

function FormScreen({
  title,
  subtitle,
  input,
  button,
  status,
  viewport,
}: {
  title: string;
  subtitle: string;
  input: string;
  button: string;
  status?: string;
  viewport: Viewport;
}) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader viewport={viewport} />
      <div className={isMobile ? "p-4" : "flex flex-1 items-center justify-center p-10"}>
        <div className={isMobile ? "" : "w-full max-w-[760px] rounded-lg border border-line bg-paper p-8"}>
        <div className={isMobile ? "mb-2 h-4 w-44 rounded-full bg-ink/15" : "mb-3 h-7 w-72 rounded-full bg-ink/15"} aria-label={title} />
        <div className={isMobile ? "mb-4 h-2.5 w-64 max-w-full rounded-full bg-line" : "mb-8 h-3 w-[520px] max-w-full rounded-full bg-line"} aria-label={subtitle} />
        <div className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
          <div className={isMobile ? "min-w-0 flex-1 rounded-md border border-line bg-paper px-2 py-2 text-[10px] text-ink-3" : "min-w-0 flex-1 rounded-md border border-line bg-cream px-3 py-3 text-[14px] text-ink-3"}>
            {input}
          </div>
          <div className={isMobile ? "rounded-md bg-ink px-3 py-2 text-[10px] font-medium text-white" : "rounded-md bg-ink px-5 py-3 text-[14px] font-medium text-white"}>
            {button}
          </div>
        </div>
        {status && (
          <div className="mt-3 rounded-md border border-line bg-cream px-3 py-2 text-[10px] text-ink-3">
            {status}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

function OverviewScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Live" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "overflow-hidden p-3" : "grid-rows-[auto_1fr] p-6"}`}>
        <section className={`rounded-md border border-line bg-paper shadow-sm ${isMobile ? "p-3" : "p-5"}`}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              Yentl&apos;s take
            </div>
            <div className="rounded-full border border-green/30 bg-green-soft px-2 py-0.5 text-[10px] font-medium text-green">
              refreshed now
            </div>
          </div>
          <p className={`font-serif leading-snug text-ink ${isMobile ? "text-[17px]" : "max-w-4xl text-[25px]"}`}>
            Speaker 2 is making the strongest numerical claims, but the source trail is thin.
            Two policy references need dates checked before they should be repeated.
          </p>
          <div className={`mt-3 grid gap-2 ${isMobile ? "grid-cols-1" : "grid-cols-3"}`}>
            {[
              ["Speaker risk", "Speaker 2 has 3 open checks"],
              ["Verdict ratio", "4 false or partial findings"],
              ["Topic cluster", "Healthcare dominates 45%"],
            ].map(([label, text]) => (
              <div key={label} className="rounded-md border border-line-soft bg-cream px-3 py-2">
                <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-teal">{label}</div>
                <div className="mt-1 text-[10.5px] leading-snug text-ink-3">{text}</div>
              </div>
            ))}
          </div>
        </section>
        <div className={`grid min-h-0 gap-4 ${isMobile ? "grid-rows-[auto_auto_1fr]" : "grid-cols-[minmax(0,0.66fr)_minmax(320px,0.34fr)]"}`}>
          <div className="grid content-start gap-3">
            <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}>
              <MetricBlock label="Claims" value="14" note="4 urgent" tone="red" />
              <MetricBlock label="Markers" value="9" note="2 high" tone="amber" />
              <MetricBlock label="Speakers" value="3" note="active now" tone="teal" />
              <MetricBlock label="Session" value="18m" note="112 lines" tone="slate" />
            </div>
            <div className="rounded-md border border-line bg-paper p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                  Topic concentration
                </span>
                <span className="text-[10px] text-ink-4">Tap a segment to filter</span>
              </div>
              <div className="flex h-6 overflow-hidden rounded-full bg-line-soft">
                <span className="flex w-[45%] items-center justify-center bg-teal text-[9px] font-semibold text-white">
                  policy
                </span>
                <span className="flex w-[30%] items-center justify-center bg-amber text-[9px] font-semibold text-ink">
                  cost
                </span>
                <span className="flex w-[25%] items-center justify-center bg-slate text-[9px] font-semibold text-white">
                  history
                </span>
              </div>
            </div>
          </div>
          <aside className="min-h-0 rounded-md border border-line bg-paper p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                Recent activity
              </span>
              <span className="text-[10px] text-ink-4">latest first</span>
            </div>
            <div className="grid gap-2">
              <ActivityRow label="FALSE" text="00:48 - unsupported budget number" />
              <ActivityRow label="BIAS" text="01:04 - loaded-language framing" />
              <ActivityRow label="PARTIAL" text="01:16 - policy change needs date" />
              {!isMobile && <ActivityRow label="SOURCE" text="01:31 - primary source attached" />}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function WatchWorkspaceScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Watching" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "overflow-hidden p-3" : "grid-cols-[minmax(0,1fr)_380px] grid-rows-[auto_1fr_auto] p-6"}`}>
        {!isMobile && (
          <div className="col-span-2 flex items-center justify-between rounded-md border border-line bg-paper px-3 py-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
                Now reviewing
              </div>
              <div className="text-[12px] font-medium leading-snug text-ink-2">
                YouTube interview - public-health claims segment
              </div>
            </div>
            <div className="flex gap-2 text-[10px] text-ink-3">
              <span className="rounded-full bg-cream px-2 py-1">00:48 synced</span>
              <span className="rounded-full bg-cream px-2 py-1">2 urgent</span>
            </div>
          </div>
        )}
        <section className={isMobile ? "space-y-2" : "min-w-0"}>
          <div className="aspect-video w-full rounded-md bg-ink p-4 text-white shadow-sm">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px]">Yentl synced</span>
                <span className="text-[10px] text-white/60">16:9 source video</span>
              </div>
              <div className="space-y-2">
                <div className="rounded bg-black/40 px-3 py-2 text-[11px] leading-snug">
                  Speaker 2: This number doubled after the policy changed.
                </div>
                <div className="h-1.5 rounded-full bg-white/25">
                  <div className="h-full w-[42%] rounded-full bg-amber" />
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {["00:48", "Transcript lock", "2 findings"].map((label) => (
              <div key={label} className="rounded-md border border-line bg-paper px-2 py-2 text-center text-[10px] text-ink-3">
                {label}
              </div>
            ))}
          </div>
        </section>
        <aside className="min-h-0 rounded-md border border-line bg-paper p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              Synced review queue
            </span>
            <span className="rounded-full bg-cream px-2 py-0.5 text-[9px] text-ink-3">
              live
            </span>
          </div>
          <div className="grid gap-2">
            <MiniClaim label="FALSE" text="Budget number conflicts with source table." />
            <MiniClaim label="RHETORIC" text="Loaded framing detected in the same clip." />
            <TranscriptLines />
          </div>
        </aside>
        {!isMobile && (
          <div className="col-span-2 grid grid-cols-4 gap-3">
            {["Jump to line", "Open claim", "Open marker", "Export clip"].map((label) => (
              <div key={label} className="rounded-md border border-line bg-paper p-3 text-[11px] text-ink-3">
                {label}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TranscriptWorkspaceScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Review" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-3" : "grid-cols-[minmax(0,1fr)_320px] p-6"}`}>
        <section className="min-h-0 rounded-md border border-line bg-paper p-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-8 flex-1 items-center rounded-md border border-line bg-cream px-3 text-[10px] text-ink-4">
              Search transcript, speaker, timestamp
            </div>
            <div className="h-8 w-20 rounded-md bg-ink text-center text-[10px] font-medium leading-8 text-white">
              Filter
            </div>
          </div>
          <div className="grid gap-2">
            {[
              ["Speaker 1", "We should verify this number before we repeat it.", "00:18", "SOURCE"],
              ["Speaker 2", "The policy changed in 2024 and costs doubled.", "00:31", "CHECK"],
              ["Speaker 1", "Show me the primary source for that figure.", "00:48", "FALSE"],
              ["Speaker 3", "The framing is making this sound settled.", "01:04", "BIAS"],
            ].map(([speaker, text, time, chip], index) => (
              <div key={`${speaker}-${index}`} className="rounded-md border border-line-soft bg-cream p-2">
                <div className="mb-1 flex items-center justify-between text-[9px] text-ink-4">
                  <span>{speaker}</span>
                  <span>{time}</span>
                </div>
                <div className="flex items-start gap-2">
                  <p className="min-w-0 flex-1 text-[10px] leading-snug text-ink-3">{text}</p>
                  <span className="rounded-full bg-paper px-2 py-0.5 text-[8px] font-semibold text-teal">
                    {chip}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        <aside className="grid content-start gap-2">
          <MiniClaim label="LINKED" text="Verdict chips anchor to exact transcript spans." />
          <MiniClaim label="TOOLS" text="Rename speaker, split segment, jump to source." />
          {!isMobile && <MiniClaim label="SEARCH" text="Find words, speakers, or timestamps quickly." />}
        </aside>
      </div>
    </div>
  );
}

function FilteredListScreen({ type, viewport }: { type: "claims" | "markers"; viewport: Viewport }) {
  const isMobile = viewport === "mobile";
  const rows = type === "claims"
    ? [
        ["FALSE", "Budget number conflicts with source table", "3 sources"],
        ["PARTIAL", "Policy changed, but date is incomplete", "2 sources"],
        ["UNVERIFIABLE", "Private-meeting claim needs evidence", "1 source"],
        ["TRUE", "Quoted date matches official release", "4 sources"],
      ]
    : [
        ["LOADED", "Loaded-language framing", "high"],
        ["DILEMMA", "False dilemma around policy choices", "medium"],
        ["FEAR", "Appeal to fear", "medium"],
        ["FRAME", "One-sided historical framing", "low"],
      ];

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state={type === "claims" ? "Claims" : "Markers"} viewport={viewport} />
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${isMobile ? "p-3" : "p-6"}`}>
        <div className={`flex gap-2 ${isMobile ? "flex-col" : "items-center justify-between"}`}>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
              {type === "claims" ? "Filtered claims" : "Filtered markers"}
            </div>
            <div className={isMobile ? "mt-1 font-serif text-[18px] text-ink" : "mt-1 font-serif text-[26px] text-ink"}>
              {type === "claims" ? "Claims needing review" : "Rhetoric and bias markers"}
            </div>
          </div>
          <div className="flex gap-2 overflow-hidden">
            {["Speaker 2", "Healthcare", "Sort: urgent"].map((label) => (
              <span key={label} className="rounded-full border border-line bg-paper px-2 py-1 text-[10px] text-ink-3">
                {label}
              </span>
            ))}
          </div>
        </div>
        <div className="grid min-h-0 gap-2">
          {rows.map(([label, title, meta], index) => (
            <div key={title} className="grid grid-cols-[4px_minmax(0,1fr)_auto] items-center gap-3 rounded-md border border-line bg-paper p-3">
              <span className={`h-14 rounded-full ${index === 0 ? "bg-red" : index === 1 ? "bg-amber" : "bg-teal"}`} />
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-semibold text-teal">{label}</span>
                  <span className="text-[9px] text-ink-4">{meta}</span>
                </div>
                <div className="mt-1 text-[12px] font-medium leading-snug text-ink-2">{title}</div>
                <div className="mt-1 text-[9px] text-ink-4">Speaker 2 · 00:{48 + index * 13}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DetailScreen({ type, viewport }: { type: "claim" | "marker"; viewport: Viewport }) {
  const isMobile = viewport === "mobile";
  const isClaim = type === "claim";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Detail" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-3" : "grid-cols-[minmax(0,1fr)_460px] p-6"}`}>
        {!isMobile && (
          <section className="rounded-md border border-line bg-paper p-4 opacity-75">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">Transcript context</span>
              <span className="rounded-full bg-cream px-2 py-0.5 text-[10px] text-ink-4">00:48 selected</span>
            </div>
            <TranscriptLines />
          </section>
        )}
        <aside className={`min-h-0 w-full rounded-md border border-line bg-paper shadow-sm ${isMobile ? "p-3" : "p-4"}`}>
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            {isClaim ? "Claim detail" : "Marker detail"}
          </div>
          <div className={`mb-3 rounded-md border ${isClaim ? "border-red/30 bg-red-soft" : "border-amber/40 bg-amber-soft"} p-3`}>
            <div className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${isClaim ? "text-red" : "text-amber-2"}`}>
              {isClaim ? "False · 78% confidence" : "Loaded language · high severity"}
            </div>
            <p className={`font-serif leading-snug text-ink ${isMobile ? "text-[16px]" : "text-[17px]"}`}>
              {isClaim
                ? "The cost figure doubled after 2024."
                : "The phrase frames the opponent as reckless before evidence is shown."}
            </p>
          </div>
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-[9px] text-ink-4">
              <span>{isClaim ? "Evidence confidence" : "Pattern strength"}</span>
              <span>{isClaim ? "78%" : "High"}</span>
            </div>
            <div className="h-2 rounded-full bg-line-soft">
              <div className={`h-full w-3/4 rounded-full ${isClaim ? "bg-red" : "bg-amber"}`} />
            </div>
          </div>
          <div className="grid gap-2">
            <MiniClaim label={isClaim ? "WHY THIS VERDICT" : "WHY THIS MARKER"} text={isClaim ? "The source table shows a different baseline and the quote omits scope." : "The phrasing assigns intent before presenting evidence."} />
            <MiniClaim label="ACTIONS" text="Share, save, re-check, learn more, and see in transcript." />
            <MiniSourceCard />
          </div>
        </aside>
      </div>
    </div>
  );
}

function LearnScreen({ type, viewport }: { type: "claim" | "marker"; viewport: Viewport }) {
  const isMobile = viewport === "mobile";
  const isClaim = type === "claim";
  const sections = type === "claim"
    ? [
        ["Source dossier", "Primary, secondary, and missing sources"],
        ["Related claims", "Same topic across this session"],
        ["Topic context", "What changed and when"],
        ["Export packet", "Send the evidence with the quote"],
      ]
    : [
        ["Definition", "What this pattern means"],
        ["How to spot", "Three signs to watch for"],
        ["Occurrences here", "Every matching transcript moment"],
        ["Further reading", "Wikipedia, SEP, and book slot"],
      ];

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Learn" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "overflow-hidden p-3" : "grid-cols-[320px_minmax(0,1fr)] p-6"}`}>
        <aside className="rounded-md border border-line bg-paper p-4">
          <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">
            {isClaim ? "Claim context" : "Pattern guide"}
          </div>
          <div className="mb-2 font-serif text-[20px] leading-tight text-ink">
            {isClaim ? "Cost figure verification" : "Loaded language"}
          </div>
          <p className="text-[10.5px] leading-relaxed text-ink-3">
            {isClaim
              ? "A focused evidence dossier that keeps the original quote visible."
              : "A teachable explanation tied back to the current transcript."}
          </p>
          <div className="mt-3 rounded-md bg-cream px-3 py-2 text-[10px] text-ink-3">
            {isClaim ? "Original claim stays pinned" : "3 occurrences in this session"}
          </div>
        </aside>
        <section className="grid content-start gap-3">
          {sections.map(([section, text]) => (
            <div key={section} className="rounded-md border border-line bg-paper p-3">
              <div className="mb-2 text-[11px] font-semibold text-ink-2">{section}</div>
              <div className="text-[10px] leading-snug text-ink-3">{text}</div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function DialogScreen({ type, viewport }: { type: "save" | "export" | "end"; viewport: Viewport }) {
  const isMobile = viewport === "mobile";
  const title = type === "save" ? "Save this session" : type === "export" ? "Export analysis" : "End live recording";
  const Icon = type === "save" ? Save : type === "export" ? Download : AlertCircle;
  const choices = type === "export"
    ? ["Markdown", "Transcript", "Evidence JSON"]
    : type === "save"
      ? ["Transcript", "Claims", "Markers"]
      : ["Stop recording", "Keep analysis", "Offer export"];

  return (
    <div className="relative flex h-full flex-col">
      <MiniHeader state="Live" viewport={viewport} />
      <div className="grid min-h-0 flex-1 gap-3 p-4 opacity-45">
        <OverviewScreen viewport={viewport} />
      </div>
      <div className={`absolute inset-x-3 bottom-3 mx-auto rounded-lg border border-line bg-paper p-4 shadow-lg ${isMobile ? "" : "top-1/2 max-w-[520px] -translate-y-1/2 bottom-auto"}`}>
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-soft text-teal">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-[18px] text-ink">{title}</div>
            <div className="text-[10px] text-ink-4">Clear, reversible where possible, and explicit.</div>
          </div>
        </div>
        <div className="grid gap-2">
          {choices.map((choice) => (
            <div key={choice} className="rounded-md border border-line bg-cream px-3 py-2 text-[10px] text-ink-3">
              {choice}
            </div>
          ))}
        </div>
        <div className="mt-3 h-9 rounded-md bg-ink text-center text-[11px] font-medium leading-9 text-white">
          {type === "end" ? "End and keep session" : "Continue"}
        </div>
      </div>
    </div>
  );
}

function SessionsLibraryScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="font-serif text-[18px] text-ink">yentl</span>
          <Library className="h-4 w-4 text-ink-4" />
        </div>
        <span className="rounded-md border border-line px-2 py-1 text-[10px] text-ink-3">New</span>
      </div>
      <div className={`flex min-h-0 flex-1 flex-col gap-3 ${isMobile ? "p-3" : "p-6"}`}>
        <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_180px]">
          <div className="h-9 rounded-md border border-line bg-paper" />
          {!isMobile && <div className="h-9 rounded-md border border-line bg-paper" />}
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-paper">
          {["Debate review", "Podcast fact-check", "YouTube interview", "Meeting transcript"].map((name) => (
            <div key={name} className="flex items-center justify-between gap-3 border-b border-line-soft px-3 py-3 last:border-b-0">
              <div className="min-w-0">
                <div className="text-[12px] font-medium text-ink-2">{name}</div>
                <div className="mt-1 flex gap-2 text-[9px] text-ink-4">
                  <span>Audio</span>
                  <span>14 claims</span>
                  {!isMobile && <span>18m</span>}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-ink-4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LandingScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col bg-cream">
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-2">
        <span className="font-serif text-[18px] text-ink">yentl</span>
        <span className="rounded-md bg-ink px-2 py-1 text-[10px] text-white">Start</span>
      </div>
      <main className={`grid min-h-0 flex-1 gap-5 ${isMobile ? "p-4" : "grid-cols-[0.9fr_1.1fr] p-8"}`}>
        <section className="flex flex-col justify-center">
          <div className={isMobile ? "mb-3 h-8 w-44 rounded-full bg-ink/15" : "mb-4 h-12 w-80 rounded-full bg-ink/15"} />
          <div className="mb-4 space-y-2">
            <div className="h-3 rounded-full bg-line" />
            <div className="h-3 w-4/5 rounded-full bg-line-soft" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {["Live", "YouTube", "Files", "Browser"].map((label) => (
              <div key={label} className="rounded-md border border-line bg-paper p-3 text-[10px] text-ink-3">
                {label}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-line bg-paper p-4">
          <WatchWorkspaceScreen viewport={isMobile ? "mobile" : "desktop"} />
        </section>
      </main>
    </div>
  );
}

function AuthScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full items-center justify-center bg-cream p-4">
      <div className={`grid gap-4 ${isMobile ? "w-full" : "w-full max-w-[820px] grid-cols-[1fr_0.85fr]"}`}>
        <section className="rounded-md border border-line bg-paper p-5">
          <div className="mb-3 font-serif text-[22px] text-ink">yentl</div>
          <div className="space-y-2">
            <div className="h-3 rounded-full bg-line" />
            <div className="h-3 w-3/4 rounded-full bg-line-soft" />
          </div>
          <div className="mt-5 grid gap-2">
            {["Saved sessions", "Mobile sync", "Exports"].map((label) => (
              <div key={label} className="rounded-md bg-cream px-3 py-2 text-[10px] text-ink-3">
                {label}
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-md border border-line bg-paper p-5">
          <div className="mb-4 h-5 w-40 rounded-full bg-ink/15" />
          <div className="grid gap-3">
            <div className="h-10 rounded-md border border-line bg-cream" />
            <div className="h-10 rounded-md border border-line bg-cream" />
            <div className="h-10 rounded-md bg-ink" />
          </div>
        </section>
      </div>
    </div>
  );
}

function TrustPageScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Trust" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-3" : "grid-cols-[240px_minmax(0,1fr)] p-6"}`}>
        {!isMobile && (
          <aside className="rounded-md border border-line bg-paper p-3">
            {["Methodology", "Privacy", "Terms", "Accessibility", "Subprocessors"].map((item) => (
              <div key={item} className="rounded-md px-2 py-2 text-[10px] text-ink-3">
                {item}
              </div>
            ))}
          </aside>
        )}
        <article className={`rounded-md border border-line bg-paper ${isMobile ? "p-3" : "p-4"}`}>
          <div className="mb-4 h-7 w-full max-w-64 rounded-full bg-ink/15" />
          <div className="grid gap-3">
            {["Plain summary", "How Yentl handles audio", "AI-generated verdict limits", "Data retention"].map((section) => (
              <div key={section} className="rounded-md border border-line-soft bg-cream p-3">
                <div className="mb-2 text-[11px] font-semibold text-ink-2">{section}</div>
                <div className="h-2 rounded-full bg-line" />
                <div className="mt-1 h-2 w-2/3 rounded-full bg-line-soft" />
              </div>
            ))}
          </div>
        </article>
      </div>
    </div>
  );
}

function ExtensionPopupScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full items-start justify-center bg-cream p-4">
      <div className={`${isMobile ? "w-full" : "mt-10 w-[360px]"} rounded-lg border border-line bg-paper p-4 shadow-lg`}>
        <div className="mb-3 flex items-center justify-between">
          <div className="font-serif text-[18px] text-ink">yentl</div>
          <span className="rounded-full bg-green-soft px-2 py-0.5 text-[10px] text-green">ready</span>
        </div>
        <div className="rounded-md border border-line bg-cream p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">Target tab</div>
          <div className="h-3 w-56 max-w-full rounded-full bg-ink/15" />
        </div>
        <div className="my-3 flex h-14 items-end gap-1 rounded-md border border-line bg-paper p-2">
          {[30, 55, 42, 70, 50, 82, 58].map((height) => (
            <span key={height} className="flex-1 rounded-t bg-teal" style={{ height: `${height}%` }} />
          ))}
        </div>
        <div className="grid gap-2">
          <div className="h-10 rounded-md bg-ink" />
          <div className="rounded-md border border-amber bg-amber-soft px-3 py-2 text-[10px] text-amber-2">
            Recording third-party audio may require consent.
          </div>
        </div>
      </div>
    </div>
  );
}

function ExtensionOptionsScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <div className="flex h-full flex-col">
      <MiniHeader state="Extension options" viewport={viewport} />
      <div className={`grid min-h-0 flex-1 gap-4 ${isMobile ? "p-3" : "grid-cols-[260px_minmax(0,1fr)] p-6"}`}>
        {!isMobile && (
          <aside className="rounded-md border border-line bg-paper p-3 text-[10px] text-ink-3">
            Capture · Origin · Language · Privacy · Diagnostics
          </aside>
        )}
        <section className="grid content-start gap-3">
          {["Yentl app origin", "Capture behavior", "Transcript language", "Diagnostics"].map((label) => (
            <div key={label} className="rounded-md border border-line bg-paper p-3">
              <div className="mb-2 text-[11px] font-semibold text-ink-2">{label}</div>
              <div className="h-9 rounded-md border border-line bg-cream" />
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}

function MobileImportScreen({ viewport }: { viewport: Viewport }) {
  const isMobile = viewport === "mobile";

  return (
    <MobileAppFrame viewport={viewport} title="Import">
      <div className="grid gap-3">
        {["Share sheet file", "Paste media URL", "Open in-app browser", "Record microphone"].map((label, index) => (
          <div key={label} className={`rounded-md border px-3 py-3 text-[11px] ${index === 0 ? "border-teal bg-teal-soft text-teal" : "border-line bg-paper text-ink-3"}`}>
            {label}
          </div>
        ))}
        <div className="rounded-md border border-line bg-paper p-3">
          <div className={isMobile ? "h-3 w-36 rounded-full bg-ink/15" : "h-4 w-52 rounded-full bg-ink/15"} />
          <div className="mt-2 h-2 rounded-full bg-line" />
        </div>
      </div>
    </MobileAppFrame>
  );
}

function MobileLiveScreen({ viewport }: { viewport: Viewport }) {
  return (
    <MobileAppFrame viewport={viewport} title="Live">
      <div className="grid gap-3">
        <div className="rounded-md border border-green/30 bg-green-soft p-3">
          <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-ink-4">Audio health</div>
          <div className="flex h-16 items-end gap-1">
            {[45, 70, 52, 85, 64, 74].map((height) => (
              <span key={height} className="flex-1 rounded-t bg-green" style={{ height: `${height}%` }} />
            ))}
          </div>
        </div>
        <MiniClaim label="LIVE CLAIM" text="New finding appears without hiding pause/end controls." />
        <TranscriptLines />
      </div>
    </MobileAppFrame>
  );
}

function MobileLibraryScreen({ viewport }: { viewport: Viewport }) {
  return (
    <MobileAppFrame viewport={viewport} title="Library">
      <div className="grid gap-2">
        <div className="h-9 rounded-md border border-line bg-paper" />
        {["Interview", "Debate", "Lecture"].map((label) => (
          <div key={label} className="rounded-md border border-line bg-paper p-3">
            <div className="mb-1 text-[12px] font-medium text-ink-2">{label}</div>
            <div className="flex gap-2 text-[9px] text-ink-4">
              <span>12 claims</span>
              <span>4 markers</span>
              <span>saved</span>
            </div>
          </div>
        ))}
      </div>
    </MobileAppFrame>
  );
}

function MobileAppFrame({
  viewport,
  title,
  children,
}: {
  viewport: Viewport;
  title: string;
  children: ReactNode;
}) {
  const isMobile = viewport === "mobile";

  return (
    <div className={`mx-auto flex h-full flex-col bg-cream ${isMobile ? "" : "max-w-[420px] border-x border-line"}`}>
      <div className="flex items-center justify-between border-b border-line-soft px-3 py-3">
        <span className="font-serif text-[18px] text-ink">yentl</span>
        <span className="text-[11px] font-medium text-ink-3">{title}</span>
      </div>
      <main className="min-h-0 flex-1 overflow-hidden p-3">{children}</main>
      <nav className="grid grid-cols-3 border-t border-line-soft bg-paper text-center text-[9px] text-ink-4">
        <span className="py-2">Import</span>
        <span className="py-2">Live</span>
        <span className="py-2">Library</span>
      </nav>
    </div>
  );
}

function MetricBlock({
  label,
  value,
  note,
  tone = "teal",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "red" | "amber" | "teal" | "slate";
}) {
  const toneClass = {
    red: "bg-red",
    amber: "bg-amber",
    teal: "bg-teal",
    slate: "bg-slate",
  }[tone];

  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-4">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-2">
        <div className="font-serif text-[22px] leading-none text-ink">{value}</div>
        <div className="text-[9px] text-ink-4">{note}</div>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-line-soft">
        <div className={`h-full w-2/3 rounded-full ${toneClass}`} />
      </div>
    </div>
  );
}

function ActivityRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-line-soft bg-cream px-2 py-2">
      <span className="text-[9px] font-semibold text-teal">{label}</span>
      <span className="text-[10px] leading-snug text-ink-3">{text}</span>
      <ArrowRight className="h-3 w-3 text-ink-4" />
    </div>
  );
}

function MiniSourceCard() {
  return (
    <div className="rounded-md border border-line bg-cream p-3">
      <div className="mb-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-ink-4">
        Source preview
      </div>
      <div className="h-3 w-48 max-w-full rounded-full bg-ink/15" />
      <div className="mt-2 h-2 rounded-full bg-line" />
      <div className="mt-1 h-2 w-2/3 rounded-full bg-line-soft" />
    </div>
  );
}

function TranscriptLines() {
  return (
    <div className="space-y-2">
      {["Speaker 1: We should verify this number.", "Speaker 2: The policy changed in 2024.", "Speaker 1: Show me the source."].map((line) => (
        <div key={line} className="rounded-md bg-cream px-2 py-1.5 text-[10px] leading-relaxed text-ink-3">
          {line}
        </div>
      ))}
    </div>
  );
}

function MiniClaim({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-2">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-teal">
        {label}
      </div>
      <div className="text-[10px] leading-relaxed text-ink-3">{text}</div>
    </div>
  );
}

function ProgressRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-paper p-3">
      <div className="mb-2 flex items-center justify-between gap-2 text-[10px] text-ink-3">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 rounded-full bg-line-soft">
        <div className="h-full w-2/3 rounded-full bg-teal" />
      </div>
    </div>
  );
}
