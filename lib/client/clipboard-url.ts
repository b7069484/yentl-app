export type ClipboardUrlResult =
  | { ok: true; url: string }
  | { ok: false; code: "unsupported" | "empty" | "no_url" | "denied"; message: string };

type ClipboardLike = {
  readText?: () => Promise<string>;
};

export function extractFirstHttpUrl(value: string): string | null {
  const match = value.match(/https?:\/\/[^\s<>"']+/i);
  if (!match?.[0]) return null;

  const candidate = match[0].replace(/[),.;!?]+$/, "");
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

export async function readUrlFromClipboard(
  clipboard: ClipboardLike | undefined = globalThis.navigator?.clipboard,
): Promise<ClipboardUrlResult> {
  if (!clipboard?.readText) {
    return {
      ok: false,
      code: "unsupported",
      message: "Clipboard paste is unavailable in this browser. Paste the URL into the field instead.",
    };
  }

  try {
    const text = (await clipboard.readText()).trim();
    if (!text) {
      return {
        ok: false,
        code: "empty",
        message: "Clipboard is empty. Copy a URL, then try again.",
      };
    }

    const url = extractFirstHttpUrl(text);
    if (!url) {
      return {
        ok: false,
        code: "no_url",
        message: "Clipboard did not contain an http or https URL.",
      };
    }

    return { ok: true, url };
  } catch {
    return {
      ok: false,
      code: "denied",
      message: "Clipboard permission was not granted. Paste the URL into the field instead.",
    };
  }
}
