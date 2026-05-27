"use client";

import {
  FileText,
  FolderOpen,
  Globe2,
  Link,
  ListChecks,
  Mic,
  MonitorPlay,
  Play,
  Radio,
  Upload,
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import BorderGlow from "@/components/BorderGlow";
import { useSession } from "@/lib/client/session-store";
import type { SessionSource } from "@/lib/types";

export type SourceCardId =
  | "browser-tab"
  | "youtube"
  | "web-url"
  | "upload"
  | "text"
  | "claim"
  | "mic"
  | "media";

type SourceColumnId = "live" | "url" | "file";

export type CardDef = {
  id: SourceCardId;
  title: string;
  desc: string;
  Icon: ComponentType<{ className?: string }>;
  source?: SessionSource;
  disabled?: boolean;
  status?: string;
};

type CardGroup = {
  id: SourceColumnId;
  title: string;
  desc: string;
  Icon: ComponentType<{ className?: string }>;
  cards: CardDef[];
};

type PlatformExperience = {
  headline: string;
  subtitle: string;
  noticeTitle?: string;
  notice?: string;
  groups: CardGroup[];
};

export type SourcePlatform =
  | "desktop-chrome"
  | "desktop-other"
  | "mobile-ios"
  | "mobile-android"
  | "mobile-web";

export function getSourcePlatform(userAgent = ""): SourcePlatform {
  const ua = userAgent.toLowerCase();
  const isIos = /\b(iphone|ipad|ipod)\b/.test(ua);
  const isAndroid = ua.includes("android");
  const isMobile = isIos || isAndroid || /\bmobile\b/.test(ua);

  if (isIos) return "mobile-ios";
  if (isAndroid) return "mobile-android";
  if (isMobile) return "mobile-web";

  const isChromium =
    /(chrome|chromium|crios)\//.test(ua) &&
    !/(edg|opr|opera|firefox|fxios)\//.test(ua);
  const isSafariOnly = ua.includes("safari/") && !ua.includes("chrome/");

  return isChromium && !isSafariOnly ? "desktop-chrome" : "desktop-other";
}

const sourceCards = {
  browserTab: {
    id: "browser-tab",
    title: "Current tab",
    desc: "Analyze what is already open in Chrome.",
    Icon: MonitorPlay,
    source: { kind: "browser_tab" },
  },
  mic: {
    id: "mic",
    title: "Microphone",
    desc: "Listen to a live room, call, class, or meeting.",
    Icon: Mic,
    source: { kind: "mic" },
  },
  youtube: {
    id: "youtube",
    title: "YouTube",
    desc: "Paste a link, watch here, and run live analysis.",
    Icon: Play,
    source: { kind: "youtube", video_id: "", url: "" },
  },
  webUrl: {
    id: "web-url",
    title: "Web page",
    desc: "Article, embedded video, Vimeo-style page, or mixed media page.",
    Icon: Globe2,
    disabled: true,
    status: "Planned",
  },
  media: {
    id: "media",
    title: "Direct media",
    desc: "MP3, MP4, stream, podcast feed, or hosted media file.",
    Icon: Link,
    source: { kind: "media_url", url: "" },
  },
  upload: {
    id: "upload",
    title: "Audio/video",
    desc: "Upload a recording, download, camera-roll export, or saved media file.",
    Icon: Upload,
    source: { kind: "audio_file", blob_url: "", duration_sec: 0, filename: "", mime: "" },
  },
  text: {
    id: "text",
    title: "Text/document",
    desc: "Paste text or import TXT, Markdown, or DOCX.",
    Icon: FileText,
    source: { kind: "text_doc", filename: "", mime: "", byte_count: 0 },
  },
  claim: {
    id: "claim",
    title: "One claim",
    desc: "Check one statement with optional context.",
    Icon: ListChecks,
    source: {
      kind: "text_doc",
      filename: "Claim quick check",
      mime: "text/plain",
      byte_count: 0,
      intent: "claim_only",
    },
  },
} satisfies Record<string, CardDef>;

function cloneCard(card: CardDef, overrides: Partial<CardDef> = {}): CardDef {
  return {
    ...card,
    ...overrides,
  };
}

function liveCardsForPlatform(platform: SourcePlatform): CardDef[] {
  const micCard =
    platform === "mobile-ios"
      ? cloneCard(sourceCards.mic, { title: "Microphone" })
      : platform === "mobile-android"
        ? cloneCard(sourceCards.mic, { title: "Microphone" })
        : sourceCards.mic;

  if (platform === "desktop-chrome") {
    return [sourceCards.browserTab, micCard];
  }

  return [micCard];
}

function urlCardsForPlatform(platform: SourcePlatform): CardDef[] {
  const youtubeCard =
    platform === "mobile-ios" || platform === "mobile-android" || platform === "mobile-web"
      ? cloneCard(sourceCards.youtube, { title: "Shared link" })
      : sourceCards.youtube;

  return [youtubeCard, sourceCards.webUrl, sourceCards.media];
}

function fileCardsForPlatform(platform: SourcePlatform): CardDef[] {
  const uploadCard =
    platform === "mobile-ios"
      ? cloneCard(sourceCards.upload, { title: "Import file" })
      : platform === "mobile-android"
        ? cloneCard(sourceCards.upload, { title: "Import file" })
        : sourceCards.upload;

  return [uploadCard, sourceCards.text, sourceCards.claim];
}

export function sourceExperienceForPlatform(platform: SourcePlatform): PlatformExperience {
  const notice =
    platform === "desktop-other"
      ? {
          noticeTitle: "Open-tab capture needs desktop Chrome.",
          notice:
            "The Live path still works with microphone audio here. To analyze an already-open page beside Yentl, use desktop Chrome with the Yentl extension.",
        }
      : platform === "mobile-ios" || platform === "mobile-android" || platform === "mobile-web"
        ? {
            noticeTitle: "On mobile, start with a shared link, file, text, or microphone.",
            notice:
              "Mobile browsers cannot expose another tab's audio the same way desktop Chrome can. Yentl can still analyze shared URLs, files, pasted text, and live microphone audio.",
          }
        : {};

  return {
    headline: "Choose your source path",
    subtitle: "Start with Live, URL, or File. Then choose the specific branch Yentl should use.",
    ...notice,
    groups: [
      {
        id: "live",
        title: "Live",
        desc: "Something is happening or playing now.",
        Icon: Radio,
        cards: liveCardsForPlatform(platform),
      },
      {
        id: "url",
        title: "URL",
        desc: "You have a link to a page, video, or media file.",
        Icon: Globe2,
        cards: urlCardsForPlatform(platform),
      },
      {
        id: "file",
        title: "File",
        desc: "You have media, text, transcript, or a claim to bring in.",
        Icon: FolderOpen,
        cards: fileCardsForPlatform(platform),
      },
    ],
  };
}

export function sourceCardsForPlatform(platform: SourcePlatform): CardDef[] {
  return sourceExperienceForPlatform(platform)
    .groups.flatMap((group) => group.cards)
    .filter((card) => !card.disabled);
}

function currentPlatform(): SourcePlatform {
  if (typeof navigator === "undefined") return "desktop-other";
  return getSourcePlatform(navigator.userAgent);
}

export function SourcePicker() {
  const [platform, setPlatform] = useState<SourcePlatform>("desktop-other");
  const experience = useMemo(() => sourceExperienceForPlatform(platform), [platform]);
  const setSource = useSession((s) => s.setSource);
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setPlatform(currentPlatform());
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  function handleSelect(card: CardDef) {
    if (card.disabled || !card.source) return;
    setSource(card.source);
    setPrerecordStage("selected");
  }

  return (
    <div
      className="mx-auto flex w-full max-w-[1180px] flex-col px-5 pb-12 pt-10 sm:px-8 sm:pt-14"
      data-platform-kind={platform}
    >
      <div className="mx-auto mb-7 inline-flex items-baseline justify-center">
        <span className="font-serif text-[52px] font-medium leading-none tracking-tight text-ink sm:text-[64px]">
          yentl
        </span>
        <span aria-hidden className="yentl-dot ml-3 inline-block h-3 w-3 self-baseline" />
      </div>

      <h1 className="mx-auto max-w-[720px] text-center font-serif text-[30px] font-medium leading-tight tracking-tight text-ink sm:text-[42px]">
        {experience.headline}
      </h1>

      <p className="mx-auto mb-7 mt-3 max-w-[720px] text-center text-[15px] leading-relaxed text-ink-3 sm:text-[16px]">
        {experience.subtitle}
      </p>

      {experience.noticeTitle && experience.notice && (
        <div className="mx-auto mb-6 w-full max-w-[820px] rounded-lg border border-line bg-cream px-4 py-3">
          <div className="text-[13px] font-semibold text-ink">
            {experience.noticeTitle}
          </div>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-3">
            {experience.notice}
          </p>
        </div>
      )}

      <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-3">
        {experience.groups.map((group) => (
          <SourcePathColumn
            key={group.id}
            group={group}
            onSelect={handleSelect}
          />
        ))}
      </div>
    </div>
  );
}

function SourcePathColumn({
  group,
  onSelect,
}: {
  group: CardGroup;
  onSelect: (card: CardDef) => void;
}) {
  const { Icon } = group;
  return (
    <section
      className="min-w-0 rounded-lg border border-line bg-paper p-4 shadow-sm"
      aria-label={`${group.title} source path`}
    >
      <div className="mb-4 flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line bg-cream text-teal">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2 className="font-serif text-[30px] font-medium leading-none text-ink">
            {group.title}
          </h2>
          <p className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
            {group.desc}
          </p>
        </div>
      </div>

      <div className="grid gap-2.5">
        {group.cards.map((card) => (
          <SourceChoiceCard
            key={`${group.id}-${card.id}-${card.title}`}
            card={card}
            onSelect={() => onSelect(card)}
          />
        ))}
      </div>
    </section>
  );
}

function SourceChoiceCard({
  card,
  onSelect,
}: {
  card: CardDef;
  onSelect: () => void;
}) {
  const { title, desc, Icon, disabled, status } = card;

  return (
    <BorderGlow
      className="yentl-source-glow"
      edgeSensitivity={30}
      glowColor={disabled ? "230 12 62" : "220 96 62"}
      backgroundColor="transparent"
      borderRadius={8}
      glowRadius={disabled ? 10 : 18}
      glowIntensity={disabled ? 0.2 : 0.5}
      coneSpread={24}
      animated={!disabled}
      colors={disabled ? ["#B5B8C5", "#E8E1CE", "#5B6075"] : ["#2563EB", "#38BDF8", "#22C55E"]}
      fillOpacity={disabled ? 0.04 : 0.1}
    >
      <button
        type="button"
        onClick={onSelect}
        data-source-card-id={card.id}
        disabled={disabled}
        aria-disabled={disabled}
        className={[
          "yentl-action-button min-w-0 rounded-lg border bg-paper p-4 text-left shadow-sm transition-all",
          "h-full w-full focus:outline-none focus:ring-2 focus:ring-ink/20",
          disabled
            ? "cursor-not-allowed border-line-soft opacity-70"
            : "hover:-translate-y-0.5 hover:border-teal hover:bg-cream-2 active:translate-y-0 active:scale-[0.99]",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cream-2">
            <Icon className="h-4 w-4 text-ink-2" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="text-[15px] font-semibold leading-snug text-ink">
                {title}
              </div>
              {disabled && (
                <span className="shrink-0 text-[10.5px] font-bold uppercase tracking-[0.08em] text-amber-2">
                  {status ?? "Planned"}
                </span>
              )}
            </div>
            <div className="mt-1 text-[12.5px] leading-relaxed text-ink-3">
              {desc}
            </div>
          </div>
        </div>
      </button>
    </BorderGlow>
  );
}
