// Single source of consent-flow copy. Yentl voice — smart, witty, friendly,
// punchy. Bumping CONSENT_VERSION invalidates stored consent records and
// re-prompts the user; bump it whenever the policy doc materially changes.

export const CONSENT_VERSION = "consent_v1";

export const consentCopy = {
  title: "Before we listen",
  lede:
    "Yentl needs three things to do its job: your mic, an AI brain to think with, and the open web to check against. " +
    "Three required boxes, one optional. No surprises.",
  required: {
    mic: {
      label: "Mic + live transcription via Deepgram (US)",
      why:
        "Your audio streams directly from your browser to Deepgram for speech-to-text. " +
        "It never touches Yentl's servers and isn't stored.",
    },
    ai: {
      label: "AI analysis via Anthropic Claude (US)",
      why:
        "Transcribed text goes to Claude for claim extraction, fact-checking, " +
        "and bias/fallacy analysis. Nothing is saved unless you export.",
    },
    search: {
      label: "Web search for sources",
      why:
        "Claude uses web search to find sources that support or contradict each claim. " +
        "Search queries leave Yentl as part of that lookup.",
    },
  },
  optional: {
    analytics: {
      label: "Anonymous analytics (optional)",
      why: "Helps us see what's working. No audio, no transcripts, no identity.",
    },
  },
  sensitive: {
    title: "Heads up",
    body:
      "Conversations can reveal sensitive information — political views, health, religion, and more. " +
      "By continuing, you're consenting to that being processed by the systems above.",
  },
  age: "I'm 13 or older.",
  recording:
    "And — recording the people around you may need their consent depending on where you are. " +
    "Yentl doesn't know where you are; you do.",
  cta: {
    confirm: "Start session",
    cancel: "Maybe later",
  },
} as const;
