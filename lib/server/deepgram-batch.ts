import { DeepgramClient } from "@deepgram/sdk";
import type {
  ListenV1Response,
  ListenV1AcceptedResponse,
} from "@deepgram/sdk";
import type { TranscriptSegment, Speaker } from "@/lib/types";

/** Shared Deepgram transcription options for both URL and file paths. */
const TRANSCRIBE_OPTIONS = {
  model: "nova-3" as const,
  punctuate: true,
  smart_format: true,
  diarize: true,
  utterances: true,
  language: "en",
};

let _client: DeepgramClient | null = null;

function getClient(): DeepgramClient {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error(
      "DEEPGRAM_API_KEY is not set. Add it to .env.local before calling transcribeUrl().",
    );
  }
  if (!_client) {
    _client = new DeepgramClient({ apiKey });
  }
  return _client;
}

export interface TranscribeResult {
  utterances: TranscriptSegment[];
  speakers: Speaker[];
}

/**
 * Transcribes a remote audio URL using Deepgram nova-3 with diarization.
 *
 * Uses client.listen.v1.media.transcribeUrl (v5 SDK path).
 * Maps Deepgram utterances → TranscriptSegment[] and builds a Speaker[] list.
 *
 * The SDK returns MediaTranscribeResponse = ListenV1Response | ListenV1AcceptedResponse.
 * ListenV1AcceptedResponse only has request_id (async path); ListenV1Response has .results.
 */
export async function transcribeUrl(url: string): Promise<TranscribeResult> {
  const client = getClient();

  const response: ListenV1Response | ListenV1AcceptedResponse =
    await client.listen.v1.media.transcribeUrl({
      url,
      ...TRANSCRIBE_OPTIONS,
    });

  return parseDeepgramResponse(response, url);
}

/**
 * Parses a Deepgram synchronous response into TranscriptSegment[] + Speaker[].
 * Shared by both transcribeUrl and transcribeFile.
 */
function parseDeepgramResponse(
  response: ListenV1Response | ListenV1AcceptedResponse,
  source: string,
): TranscribeResult {
  if (!("results" in response) || !response.results) {
    throw new Error(
      `Deepgram did not return synchronous results. Source: ${source}. ` +
        "Ensure the file is publicly accessible and no callback= is set.",
    );
  }

  const rawUtterances = response.results.utterances ?? [];

  const speakerSet = new Set<number>();
  const utterances: TranscriptSegment[] = rawUtterances.map((u) => {
    const speakerId = typeof u.speaker === "number" ? u.speaker : 0;
    speakerSet.add(speakerId);
    return {
      text: u.transcript ?? "",
      start: u.start ?? 0,
      end: u.end ?? 0,
      is_final: true,
      speaker_id: speakerId,
    };
  });

  const speakers: Speaker[] = Array.from(speakerSet)
    .sort((a, b) => a - b)
    .map((id) => ({
      id,
      label: `Speaker ${id + 1}`,
    }));

  return { utterances, speakers };
}

/**
 * Transcribes an in-memory audio buffer using Deepgram nova-3 with diarization.
 *
 * Uses client.listen.v1.media.transcribeFile (v5 SDK path).
 * The buffer is passed directly — no external storage required.
 * Same options and response parsing as transcribeUrl.
 *
 * Trade-off: the serverless function holds the buffer in memory during upload.
 * For local dev this is fine. For production at scale, consider Blob storage.
 */
export async function transcribeFile(
  buffer: Buffer | Uint8Array,
  mime: string,
): Promise<TranscribeResult> {
  const client = getClient();

  const response: ListenV1Response | ListenV1AcceptedResponse =
    await client.listen.v1.media.transcribeFile(
      { data: buffer, contentType: mime },
      TRANSCRIBE_OPTIONS,
    );

  return parseDeepgramResponse(response, `[buffer:${mime}]`);
}
