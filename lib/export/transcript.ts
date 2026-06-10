import { documentAnchorDetail } from "@/lib/document-anchor";
import type { Session, SessionSource, Speaker, SpeakerId, TranscriptSegment } from "@/lib/types";

function labelFor(speakers: Speaker[], id: SpeakerId | null): string {
  if (id === null) return "Unknown speaker";
  return speakers.find((sp) => sp.id === id)?.label ?? `Speaker ${id + 1}`;
}

function sourceLabel(source: SessionSource): string {
  switch (source.kind) {
    case "browser_tab":
      return source.title || source.url || "Browser tab";
    case "audio_file":
      return source.filename;
    case "text_doc":
      return source.filename;
    case "youtube":
      return source.title || source.url || source.video_id || "YouTube";
    case "media_url":
      return source.url;
    case "mic":
      return "Live microphone";
  }
}

function formatTime(seconds: number): string {
  const value = Math.max(0, seconds);
  return `${Number.isInteger(value) ? value : value.toFixed(1).replace(/\.0$/, "")}s`;
}

function renderSegment(segment: TranscriptSegment, speakers: Speaker[]): string {
  const time = `[${formatTime(segment.start)}-${formatTime(segment.end)}]`;
  const speaker = labelFor(speakers, segment.speaker_id);
  const draft = segment.is_final ? "" : " (draft)";
  const anchor = documentAnchorDetail(segment.document_anchor);
  const source = anchor ? ` [source: ${anchor}]` : "";
  return `${time} ${speaker}${draft}: ${segment.text}${source}`;
}

export function toTranscriptText(session: Session): string {
  const lines: string[] = [
    `${session.title || "Yentl session"} transcript`,
    "",
    `Started: ${session.started_at}`,
  ];

  if (session.ended_at) {
    lines.push(`Ended: ${session.ended_at}`);
  }

  lines.push(`Source: ${sourceLabel(session.source)}`);

  if (session.speakers.length > 0) {
    lines.push(`Speakers: ${session.speakers.map((speaker) => speaker.label).join(", ")}`);
  }

  lines.push("", "Transcript", "");

  if (session.transcript.length === 0) {
    lines.push("(none)");
  } else {
    for (const segment of session.transcript) {
      lines.push(renderSegment(segment, session.speakers));
    }
  }

  return lines.join("\n");
}
