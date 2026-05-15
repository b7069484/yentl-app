"use client";
import { useSession } from "@/lib/client/session-store";
import { SourcePicker } from "@/components/session/source-picker";
import { TextIngestPane } from "@/components/session/ingest-panes/text-ingest-pane";
import { AudioIngestPane } from "@/components/session/ingest-panes/audio-ingest-pane";
import { YoutubeIngestPane } from "@/components/session/ingest-panes/youtube-ingest-pane";
import { MediaUrlIngestPane } from "@/components/session/ingest-panes/media-url-ingest-pane";

/**
 * PreRecord mic pane — shown when source.kind === "mic" and stage === "selected".
 * Kept inline here so SourceRouter owns the full pre-record dispatch surface.
 */
function MicPreRecord() {
  const startSession = useSession((s) => s.startSession);
  return (
    <div className="px-6 pt-12 pb-12 max-w-[680px] mx-auto w-full text-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/yenta-y-mark.png"
        alt="Yenta"
        width={600}
        height={340}
        className="mx-auto mb-6 h-24 w-auto"
      />
      <h1 className="font-serif text-[28px] font-medium tracking-tight text-ink">
        Yenta is ready to listen.
      </h1>
      <p className="text-[14px] text-ink-3 mt-2 max-w-prose mx-auto">
        Tap below to start a session. Yenta transcribes the conversation in real time, fact-checks
        every claim against the open web, and surfaces the biases and fallacies tucked into the
        rhetoric.
      </p>
      <button
        type="button"
        onClick={() => startSession()}
        className="mt-7 inline-flex items-center gap-2 px-5 py-3 bg-teal text-white rounded-xl text-[14px] font-medium hover:bg-teal-2 shadow-md"
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
        </svg>
        Start a session
      </button>
      <div className="mt-4 text-[11.5px] text-ink-4">Multi-speaker · English · Browser mic</div>
    </div>
  );
}

/**
 * Stage-aware dispatcher:
 * - "picker" → show source picker
 * - "selected" → dispatch to per-source pane
 */
export function SourceRouter() {
  const prerecordStage = useSession((s) => s.prerecordStage);
  const sourceKind = useSession((s) => s.source.kind);

  if (prerecordStage === "picker") {
    return <SourcePicker />;
  }

  // prerecordStage === "selected"
  switch (sourceKind) {
    case "mic":
      return <MicPreRecord />;
    case "text_doc":
      return <TextIngestPane />;
    case "audio_file":
      return <AudioIngestPane />;
    case "youtube":
      return <YoutubeIngestPane />;
    case "media_url":
      return <MediaUrlIngestPane />;
    default:
      return <SourcePicker />;
  }
}
