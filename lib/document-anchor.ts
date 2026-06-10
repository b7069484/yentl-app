import type { DocumentAnchor } from "@/lib/types";

export function documentAnchorLabel(anchor?: DocumentAnchor | null): string | null {
  if (!anchor) return null;
  const ordinal = (anchor.cue_index ?? anchor.paragraph_index ?? anchor.block_index) + 1;

  switch (anchor.kind) {
    case "speaker_turn":
      return `Turn ${anchor.block_index + 1}${anchor.speaker_label ? ` (${anchor.speaker_label})` : ""}`;
    case "caption_cue":
      return `Cue ${ordinal}`;
    case "article_chunk":
      return `Article chunk ${anchor.block_index + 1}`;
    case "paragraph":
      return `Paragraph ${ordinal}`;
    default:
      return null;
  }
}

export function documentAnchorDetail(anchor?: DocumentAnchor | null): string | null {
  if (!anchor) return null;
  const parts: string[] = [];
  const label = documentAnchorLabel(anchor);
  if (label) parts.push(label);
  if (anchor.line_start !== undefined) {
    const end = anchor.line_end ?? anchor.line_start;
    parts.push(end === anchor.line_start ? `line ${anchor.line_start}` : `lines ${anchor.line_start}-${end}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}
