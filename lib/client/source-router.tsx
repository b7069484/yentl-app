"use client";
import { useSearchParams } from "next/navigation";
import { SourcePicker } from "@/components/session/source-picker";
import { MicPreRecordPane } from "@/components/session/ingest-panes/mic-prerecord-pane";
import { TextIngestPane } from "@/components/session/ingest-panes/text-ingest-pane";
import { AudioIngestPane } from "@/components/session/ingest-panes/audio-ingest-pane";
import { YoutubeIngestPane } from "@/components/session/ingest-panes/youtube-ingest-pane";
import { MediaUrlIngestPane } from "@/components/session/ingest-panes/media-url-ingest-pane";
import { BrowserTabIngestPane } from "@/components/session/ingest-panes/browser-tab-ingest-pane";
import { ClaimQuickCheckPane } from "@/components/session/ingest-panes/claim-quick-check-pane";
import { WebUrlIngestPane } from "@/components/session/ingest-panes/web-url-ingest-pane";
import { useSession } from "@/lib/client/session-store";

/**
 * Stage-aware dispatcher:
 * - "picker" → show source picker
 * - "selected" → dispatch to per-source pane
 */
export function SourceRouter() {
  const searchParams = useSearchParams();
  const prerecordStage = useSession((s) => s.prerecordStage);
  const source = useSession((s) => s.source);
  const sourceKind = source.kind;
  const directYouTubeUrl =
    searchParams.get("source") === "youtube" ? searchParams.get("url") : null;

  if (prerecordStage === "picker") {
    if (directYouTubeUrl) {
      return <YoutubeIngestPane initialUrlOverride={directYouTubeUrl} />;
    }
    return <SourcePicker />;
  }

  // prerecordStage === "selected"
  switch (sourceKind) {
    case "mic":
      return <MicPreRecordPane />;
    case "browser_tab":
      return <BrowserTabIngestPane />;
    case "text_doc":
      if (source.intent === "claim_only") return <ClaimQuickCheckPane />;
      if (source.intent === "web_url") return <WebUrlIngestPane />;
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
