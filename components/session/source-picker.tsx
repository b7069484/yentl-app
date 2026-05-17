"use client";
import { Mic, FileText, Upload, Play, Link } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import type { SessionSource } from "@/lib/types";

type CardDef = {
  title: string;
  desc: string;
  Icon: React.ComponentType<{ className?: string }>;
  source: SessionSource;
};

const CARDS: CardDef[] = [
  {
    title: "Microphone",
    desc: "Live conversation, multi-speaker",
    Icon: Mic,
    source: { kind: "mic" },
  },
  {
    title: "Text doc",
    desc: "Paste or drop a transcript",
    Icon: FileText,
    source: { kind: "text_doc", filename: "", mime: "", byte_count: 0 },
  },
  {
    title: "Audio file",
    desc: "Up to 4h · diarized speakers",
    Icon: Upload,
    source: { kind: "audio_file", blob_url: "", duration_sec: 0, filename: "", mime: "" },
  },
  {
    title: "YouTube",
    desc: "URL → captions, free",
    Icon: Play,
    source: { kind: "youtube", video_id: "", url: "" },
  },
  {
    title: "Media URL",
    desc: "Direct MP3 / MP4 / podcast feed",
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
    <div className="max-w-[680px] mx-auto px-6 pt-12 pb-12">
      {/* Brand mark */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/yentl-y-mark.png"
        alt="Yentl"
        width={600}
        height={340}
        className="mx-auto mb-6 h-24 w-auto"
      />

      {/* Headline */}
      <h1 className="font-serif text-[28px] font-medium tracking-tight text-ink text-center">
        How would you like to fact-check?
      </h1>

      {/* Subtitle */}
      <p className="text-[14px] text-ink-3 mt-2 mb-8 max-w-prose mx-auto text-center">
        Yentl works with live conversations, recordings, transcripts, and online media.
      </p>

      {/* Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {CARDS.map(({ title, desc, Icon, source }) => (
          <button
            key={title}
            type="button"
            onClick={() => handleSelect(source)}
            className="bg-paper border border-line rounded-xl p-5 hover:border-amber-2 hover:bg-cream-2 shadow-sm transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-lg bg-cream-2 flex items-center justify-center mb-3">
              <Icon className="w-4 h-4 text-ink-2" />
            </div>
            <div className="font-medium text-[14px] text-ink leading-snug">{title}</div>
            <div className="text-[12.5px] text-ink-3 mt-0.5">{desc}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
