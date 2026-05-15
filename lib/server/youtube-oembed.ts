/** Hostnames accepted as valid YouTube input URLs. */
const ALLOWED_YOUTUBE_HOSTS = new Set([
  "www.youtube.com",
  "youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

/**
 * Fetches oEmbed metadata for a YouTube video.
 * Returns null on any error (private video, embedding disabled, network failure, etc.)
 * so callers can gracefully degrade without requiring oEmbed to be available.
 *
 * SSRF guard: rejects any input URL whose hostname is not a known YouTube host,
 * so a future caller that skips URL validation cannot be used to proxy arbitrary requests.
 */
export async function fetchOEmbed(url: string): Promise<{
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
} | null> {
  try {
    // SSRF guard — only allow known YouTube hostnames
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (!ALLOWED_YOUTUBE_HOSTS.has(parsed.hostname)) {
      return null;
    }

    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
    const response = await fetch(oembedUrl);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as Record<string, unknown>;

    // Validate the fields we care about are present
    if (
      typeof data.title !== "string" ||
      typeof data.author_name !== "string" ||
      typeof data.thumbnail_url !== "string" ||
      typeof data.html !== "string"
    ) {
      return null;
    }

    return {
      title: data.title,
      author_name: data.author_name,
      thumbnail_url: data.thumbnail_url,
      html: data.html,
    };
  } catch {
    return null;
  }
}
