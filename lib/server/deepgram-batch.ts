import { Readable } from "stream";
import { DeepgramClient } from "@deepgram/sdk";
import type {
  ListenV1Response,
  ListenV1AcceptedResponse,
} from "@deepgram/sdk";
import type { TranscriptSegment, Speaker } from "@/lib/types";

/**
 * Shared Deepgram transcription options for both URL and file paths.
 *
 * Diarization quality notes (v5 SDK, nova-3):
 *   diarize:true   — speaker segmentation; each word gets a speaker index 0…N.
 *   utterances:true — groups words into utterance objects with per-utterance
 *                     speaker, start, end. Required for our TranscriptSegment
 *                     mapping; without it we only get channel-level transcripts.
 *   numerals:true  — converts spoken numbers ("forty-seven") to digits ("47"),
 *                    which reduces mis-transcription of numerical claims (vote
 *                    counts, statistics, dates) that are common in debate audio.
 *   smart_format:true — applies Deepgram's post-processing rules (dates, times,
 *                    phone numbers, currency). Pair with numerals for best
 *                    factual accuracy. Note: smart_format is compatible with
 *                    diarize in nova-3; earlier models had edge cases.
 *
 * Params NOT set (and why):
 *   diarize_version — not a field in the v5 SDK type; omitted.
 *   vad_events      — WebSocket-only feature; irrelevant for prerecorded path.
 *   paragraphs      — conflicts with utterances grouping; keep utterances.
 */
const TRANSCRIBE_OPTIONS = {
  model: "nova-3" as const,
  punctuate: true,
  smart_format: true,
  diarize: true,
  utterances: true,
  numerals: true,
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
 * For files >50MB use transcribeStream instead.
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

/**
 * Transcribes a large audio file via a Node.js Readable stream using Deepgram
 * nova-3 with diarization. Use this for files >50MB to avoid allocating a
 * large Buffer in the serverless function's memory.
 *
 * The Deepgram v5 SDK accepts a Node Readable directly as the uploadable
 * argument — no tempfile required. The stream is converted from the Web
 * ReadableStream (File.stream()) via Readable.fromWeb().
 *
 * Same options and response parsing as transcribeFile.
 */
export async function transcribeStream(
  stream: Readable,
  mime: string,
): Promise<TranscribeResult> {
  const client = getClient();

  const response: ListenV1Response | ListenV1AcceptedResponse =
    await client.listen.v1.media.transcribeFile(
      { data: stream, contentType: mime },
      TRANSCRIBE_OPTIONS,
    );

  return parseDeepgramResponse(response, `[stream:${mime}]`);
}
