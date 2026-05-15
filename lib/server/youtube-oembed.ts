/**
 * Fetches oEmbed metadata for a YouTube video.
 * Returns null on any error (private video, embedding disabled, network failure, etc.)
 * so callers can gracefully degrade without requiring oEmbed to be available.
 */
export async function fetchOEmbed(url: string): Promise<{
  title: string;
  author_name: string;
  thumbnail_url: string;
  html: string;
} | null> {
  try {
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
