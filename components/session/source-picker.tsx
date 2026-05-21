"use client";
import { FileText, Link, Mic, MonitorPlay, Play, Upload } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import type { SessionSource } from "@/lib/types";

type CardDef = {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  source: SessionSource;
  featured?: boolean;
  eyebrow?: string;
};

const CARDS: CardDef[] = [
  {
    title: "Analyze a video I can play",
    desc: "Open Yentl beside any video, livestream, class, podcast, or embedded player.",
    Icon: MonitorPlay,
    source: { kind: "browser_tab" },
    featured: true,
    eyebrow: "Best for any page",
  },
  {
    title: "Use microphone",
    desc: "Live conversation or room audio",
    Icon: Mic,
    source: { kind: "mic" },
  },
  {
    title: "Upload audio/video",
    desc: "MP3, M4A, WAV, MP4, and similar files",
    Icon: Upload,
    source: { kind: "audio_file", blob_url: "", duration_sec: 0, filename: "", mime: "" },
  },
  {
    title: "Paste transcript",
    desc: "Text, captions, notes, or document text",
    Icon: FileText,
    source: { kind: "text_doc", filename: "", mime: "", byte_count: 0 },
  },
  {
    title: "Paste YouTube link",
    desc: "Fast path when captions are available",
    Icon: Play,
    source: { kind: "youtube", video_id: "", url: "" },
  },
  {
    title: "Use media URL",
    desc: "Direct MP3, MP4, stream, or podcast feed",
    Icon: Link,
    source: { kind: "media_url", url: "" },
  },
];

export function SourcePicker() {
  const setSource = useSession((s) => s.setSource);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);

  function handleSelect(source: SessionSource) {
    setSource(source);
    setPrerecordStage("selected");
  }

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col px-5 pb-12 pt-10 sm:px-8 sm:pt-14">
      <div className="mx-auto mb-8 inline-flex items-baseline justify-center">
        <span className="font-serif text-[52px] font-medium leading-none tracking-tight text-ink sm:text-[64px]">
          yentl
        </span>
        <span aria-hidden className="yentl-dot ml-3 inline-block h-3 w-3 self-baseline" />
      </div>

      {/* Headline */}
      <h1 className="mx-auto max-w-[720px] text-center font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[38px]">
        <span className="block sm:inline">What do you want</span>{" "}
        <span className="block sm:inline">to analyze?</span>
      </h1>

      {/* Subtitle */}
      <p className="mx-auto mt-3 mb-8 max-w-[640px] text-center text-[15px] leading-relaxed text-ink-3 sm:text-[16px]">
        <span className="block sm:inline">Start with the media or text you already have.</span>{" "}
        <span className="block sm:inline">Yentl keeps the source, transcript, and analysis together.</span>
      </p>

      {/* Cards grid */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CARDS.map(({ title, desc, Icon, source, featured, eyebrow }) => (
          <button
            key={title}
            type="button"
            onClick={() => handleSelect(source)}
            className={`min-w-0 rounded-lg border text-left shadow-sm transition-colors hover:border-amber-2 ${
              featured
                ? "border-amber-2 bg-paper p-5 hover:bg-cream-2 sm:col-span-2 xl:col-span-3"
                : "border-line bg-paper p-5 hover:bg-cream-2"
            }`}
          >
            <div className={featured ? "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" : ""}>
              <div className="min-w-0">
                <div className="w-9 h-9 rounded-lg bg-cream-2 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-ink-2" />
                </div>
                {eyebrow && (
                  <div className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-amber-700">
                    {eyebrow}
                  </div>
                )}
                <div className={`${featured ? "font-serif text-[24px] sm:text-[28px]" : "font-medium text-[14px]"} text-ink leading-snug`}>
                  {title}
                </div>
                <div className={`${featured ? "mt-2 max-w-2xl text-[14px] leading-relaxed" : "mt-0.5 text-[12.5px]"} break-words text-ink-3`}>
                  {desc}
                </div>
              </div>
              {featured && (
                <span className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-teal px-4 text-[13px] font-medium text-white">
                  Open side panel
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
