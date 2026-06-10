import type { Speaker, TranscriptSegment } from "@/lib/types";

export const SYNTHETIC_PANEL_MEDIA_PATH = "/validation/yentl-synthetic-panel.wav";
export const SYNTHETIC_PANEL_MEDIA_FILENAME = "yentl-synthetic-panel.wav";
export const SYNTHETIC_PANEL_MEDIA_MIME = "audio/wav";

const LOCAL_VALIDATION_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const SYNTHETIC_PANEL_SPEAKERS: Speaker[] = [
  { id: 0, label: "Moderator" },
  { id: 1, label: "Analyst" },
];

export type ValidationTranscriptionResult = {
  utterances: TranscriptSegment[];
  speakers: Speaker[];
  validation_fixture: true;
  validation_fixture_id: "yentl_synthetic_panel_wav";
};

export function validationMediaFixturesEnabled(): boolean {
  if (process.env.YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

export function isSyntheticPanelValidationUrl(value: string): boolean {
  if (!validationMediaFixturesEnabled()) return false;
  const trimmed = value.trim();
  if (trimmed === SYNTHETIC_PANEL_MEDIA_PATH) return true;

  try {
    const url = new URL(trimmed);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      LOCAL_VALIDATION_HOSTS.has(url.hostname) &&
      url.pathname === SYNTHETIC_PANEL_MEDIA_PATH
    );
  } catch {
    return false;
  }
}

export function isSyntheticPanelValidationFile(file: File): boolean {
  if (!validationMediaFixturesEnabled()) return false;
  const mime = file.type.trim().toLowerCase();
  return (
    file.name === SYNTHETIC_PANEL_MEDIA_FILENAME &&
    (mime === "" || mime === SYNTHETIC_PANEL_MEDIA_MIME || mime === "audio/x-wav" || mime === "audio/wave")
  );
}

export function syntheticPanelTranscriptionFixture(): ValidationTranscriptionResult {
  return {
    validation_fixture: true,
    validation_fixture_id: "yentl_synthetic_panel_wav",
    speakers: SYNTHETIC_PANEL_SPEAKERS.map((speaker) => ({ ...speaker })),
    utterances: syntheticPanelSegments().map((segment) => ({ ...segment })),
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
