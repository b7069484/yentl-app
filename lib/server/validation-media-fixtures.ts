import type { Speaker, TranscriptSegment } from "@/lib/types";
import type { z } from "zod";
import type { SynthesizeRequest, SynthesizeResponse } from "@/lib/prompts/synthesize";

export const SYNTHETIC_PANEL_MEDIA_PATH = "/validation/yentl-synthetic-panel.wav";
export const SYNTHETIC_PANEL_MEDIA_FILENAME = "yentl-synthetic-panel.wav";
export const SYNTHETIC_PANEL_MEDIA_MIME = "audio/wav";
export const SYNTHETIC_PANEL_VIDEO_PATH = "/validation/yentl-synthetic-panel.mp4";
export const SYNTHETIC_PANEL_VIDEO_FILENAME = "yentl-synthetic-panel.mp4";
export const SYNTHETIC_PANEL_VIDEO_MIME = "video/mp4";
export const SYNTHETIC_PANEL_MOV_PATH = "/validation/yentl-synthetic-panel.mov";
export const SYNTHETIC_PANEL_MOV_FILENAME = "yentl-synthetic-panel.mov";
export const SYNTHETIC_PANEL_MOV_MIME = "video/quicktime";
export const SYNTHETIC_PANEL_WEBM_PATH = "/validation/yentl-synthetic-panel.webm";
export const SYNTHETIC_PANEL_WEBM_FILENAME = "yentl-synthetic-panel.webm";
export const SYNTHETIC_PANEL_WEBM_MIME = "video/webm";

const SYNTHETIC_PANEL_FIXTURES = [
  {
    path: SYNTHETIC_PANEL_MEDIA_PATH,
    filename: SYNTHETIC_PANEL_MEDIA_FILENAME,
    mime: SYNTHETIC_PANEL_MEDIA_MIME,
    id: "yentl_synthetic_panel_wav",
  },
  {
    path: SYNTHETIC_PANEL_VIDEO_PATH,
    filename: SYNTHETIC_PANEL_VIDEO_FILENAME,
    mime: SYNTHETIC_PANEL_VIDEO_MIME,
    id: "yentl_synthetic_panel_mp4",
  },
  {
    path: SYNTHETIC_PANEL_MOV_PATH,
    filename: SYNTHETIC_PANEL_MOV_FILENAME,
    mime: SYNTHETIC_PANEL_MOV_MIME,
    id: "yentl_synthetic_panel_mov",
  },
  {
    path: SYNTHETIC_PANEL_WEBM_PATH,
    filename: SYNTHETIC_PANEL_WEBM_FILENAME,
    mime: SYNTHETIC_PANEL_WEBM_MIME,
    id: "yentl_synthetic_panel_webm",
  },
] as const;

const LOCAL_VALIDATION_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const SYNTHETIC_PANEL_SPEAKERS: Speaker[] = [
  { id: 0, label: "Moderator" },
  { id: 1, label: "Analyst" },
];

export type ValidationTranscriptionResult = {
  utterances: TranscriptSegment[];
  speakers: Speaker[];
  validation_fixture: true;
  validation_fixture_id: (typeof SYNTHETIC_PANEL_FIXTURES)[number]["id"];
};
type SynthesisInput = z.infer<typeof SynthesizeRequest>;
type SynthesisOutput = z.infer<typeof SynthesizeResponse>;

export function validationMediaFixturesEnabled(): boolean {
  if (process.env.YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function isSyntheticPanelValidationUrl(value: string): boolean {
  if (!validationMediaFixturesEnabled()) return false;
  return Boolean(findSyntheticPanelValidationFixture(value));
}

export function syntheticPanelValidationMedia(value: string) {
  if (!validationMediaFixturesEnabled()) return null;
  return findSyntheticPanelValidationFixture(value);
}

export function syntheticPanelValidationFile(file: File) {
  if (!validationMediaFixturesEnabled()) return null;
  const mime = file.type.trim().toLowerCase();
  return (
    SYNTHETIC_PANEL_FIXTURES.find((fixture) => {
      if (file.name !== fixture.filename) return false;
      if (mime === "") return true;
      if (fixture.mime === SYNTHETIC_PANEL_MEDIA_MIME) {
        return mime === fixture.mime || mime === "audio/x-wav" || mime === "audio/wave";
      }
      return mime === fixture.mime;
    }) ?? null
  );
}

function findSyntheticPanelValidationFixture(value: string) {
  const trimmed = value.trim();
  const fixture = SYNTHETIC_PANEL_FIXTURES.find((entry) => entry.path === trimmed);
  if (fixture) return fixture;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!LOCAL_VALIDATION_HOSTS.has(url.hostname)) return null;
    return SYNTHETIC_PANEL_FIXTURES.find((entry) => entry.path === url.pathname) ?? null;
  } catch {
    return null;
  }
}

export function isSyntheticPanelValidationFile(file: File): boolean {
  return Boolean(syntheticPanelValidationFile(file));
}

export function syntheticPanelTranscriptionFixture(
  validation_fixture_id: ValidationTranscriptionResult["validation_fixture_id"] = "yentl_synthetic_panel_wav",
): ValidationTranscriptionResult {
  return {
    validation_fixture: true,
    validation_fixture_id,
    speakers: SYNTHETIC_PANEL_SPEAKERS.map((speaker) => ({ ...speaker })),
    utterances: syntheticPanelSegments().map((segment) => ({ ...segment })),
  };
}

export function syntheticPanelSynthesisFixture(request: SynthesisInput): SynthesisOutput | null {
  if (!validationMediaFixturesEnabled()) return null;
  const text = request.utterances
    .map((utterance) => utterance.text)
    .join(" ")
    .toLowerCase();
  if (
    !text.includes("welcome to the yentl validation panel") ||
    !text.includes("city library budget increased by 12 percent")
  ) {
    return null;
  }

  const speakers = request.speakers.length > 0 ? request.speakers : SYNTHETIC_PANEL_SPEAKERS;
  return {
    text:
      "The validation panel has a budget claim, a context challenge, and a separate school-platform warning. The strongest meta-read is cautious: one speaker asserts a number and uses an urgent frame, while the other asks for the missing evidence and scope.",
    headlines: [
      "Budget claim needs the missing baseline.",
      "Technology-grant context may change the read.",
      "School-platform warning is rhetorically heated.",
    ],
    per_speaker_verdicts: speakers.map((speaker) => ({
      speaker_id: speaker.id,
      label: speaker.label,
      factual_grade: "insufficient" as const,
      faith_grade: speaker.id === 0 ? "mixed" as const : "good_faith" as const,
      one_liner:
        speaker.id === 0
          ? "Budget and platform claims need source context."
          : "Analyst asks for context and evidence.",
    })),
  };
}

function syntheticPanelSegments(): TranscriptSegment[] {
  return [
    {
      id: "validation-panel-0",
      provider: "validation_fixture",
      text: "Welcome to the Yentl validation panel.",
      start: 0,
      end: 4,
      is_final: true,
      speaker_id: 0,
      attribution_status: "confident",
      attribution_reasons: ["single_speaker_high_confidence"],
      source_audio_kind: "audio_file",
    },
    {
      id: "validation-panel-1",
      provider: "validation_fixture",
      text: "The city library budget increased by 12 percent this year, according to the mayor's office.",
      start: 4,
      end: 10,
      is_final: true,
      speaker_id: 0,
      attribution_status: "confident",
      attribution_reasons: ["single_speaker_high_confidence"],
      source_audio_kind: "audio_file",
    },
    {
      id: "validation-panel-2",
      provider: "validation_fixture",
      text: "That number needs context because the technology grant expired.",
      start: 10,
      end: 17,
      is_final: true,
      speaker_id: 1,
      attribution_status: "confident",
      attribution_reasons: ["single_speaker_high_confidence"],
      source_audio_kind: "audio_file",
    },
    {
      id: "validation-panel-3",
      provider: "validation_fixture",
      text: "If we do not ban every social platform by Friday, schools will collapse and nobody will learn anything.",
      start: 17,
      end: 25,
      is_final: true,
      speaker_id: 0,
      attribution_status: "confident",
      attribution_reasons: ["single_speaker_high_confidence"],
      source_audio_kind: "audio_file",
    },
    {
      id: "validation-panel-4",
      provider: "validation_fixture",
      text: "That is a slippery slope. Which platforms create measurable distraction, and what evidence supports the claim?",
      start: 25,
      end: 33,
      is_final: true,
      speaker_id: 1,
      attribution_status: "confident",
      attribution_reasons: ["single_speaker_high_confidence"],
      source_audio_kind: "audio_file",
    },
  ];
}
