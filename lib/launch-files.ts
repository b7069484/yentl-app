import type { SessionSource } from "@/lib/types";

export const TEXT_LAUNCH_EXTENSIONS = [".txt", ".md", ".srt", ".vtt", ".pdf", ".docx"] as const;
export const MEDIA_LAUNCH_EXTENSIONS = [".mp3", ".wav", ".m4a", ".ogg", ".opus", ".webm", ".mp4", ".mov"] as const;

export const YENTL_FILE_HANDLERS = [
  {
    action: "/session",
    accept: {
      "text/plain": [".txt"],
      "text/markdown": [".md"],
      "text/vtt": [".vtt"],
      "application/x-subrip": [".srt"],
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
      "audio/x-m4a": [".m4a"],
      "audio/mp4": [".m4a"],
      "audio/ogg": [".ogg", ".opus"],
      "audio/webm": [".webm"],
      "video/mp4": [".mp4"],
      "video/quicktime": [".mov"],
      "video/webm": [".webm"],
    },
  },
];

type LaunchFileLike = Pick<File, "name" | "type" | "size">;

function extensionFor(name: string): string {
  const match = /\.[^.]+$/.exec(name.toLowerCase());
  return match?.[0] ?? "";
}

export function isTextLaunchFile(file: LaunchFileLike): boolean {
  const ext = extensionFor(file.name);
  return (
    TEXT_LAUNCH_EXTENSIONS.includes(ext as (typeof TEXT_LAUNCH_EXTENSIONS)[number]) ||
    file.type === "text/plain" ||
    file.type === "text/markdown" ||
    file.type === "text/vtt" ||
    file.type === "application/pdf" ||
    file.type === "application/x-subrip" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  );
}

export function isMediaLaunchFile(file: LaunchFileLike): boolean {
  const ext = extensionFor(file.name);
  return (
    MEDIA_LAUNCH_EXTENSIONS.includes(ext as (typeof MEDIA_LAUNCH_EXTENSIONS)[number]) ||
    file.type.startsWith("audio/") ||
    file.type.startsWith("video/")
  );
}

function mimeFromName(name: string): string {
  const ext = extensionFor(name);
  switch (ext) {
    case ".md":
      return "text/markdown";
    case ".srt":
      return "application/x-subrip";
    case ".vtt":
      return "text/vtt";
    case ".pdf":
      return "application/pdf";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".m4a":
      return "audio/x-m4a";
    case ".ogg":
    case ".opus":
      return "audio/ogg";
    case ".webm":
      return "audio/webm";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
}

export function sourceForLaunchFile(file: LaunchFileLike): SessionSource | null {
  const mime = file.type || mimeFromName(file.name);
  const normalizedFile: LaunchFileLike = {
    name: file.name,
    type: mime,
    size: file.size,
  };

  if (isTextLaunchFile(normalizedFile)) {
    return {
      kind: "text_doc",
      filename: file.name,
      mime,
      byte_count: file.size,
      intent: "document",
    };
  }

  if (isMediaLaunchFile(normalizedFile)) {
    return {
      kind: "audio_file",
      blob_url: "",
      duration_sec: 0,
      filename: file.name,
      mime,
    };
  }

  return null;
}
