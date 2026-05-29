import { Readable } from "stream";
import { DeepgramClient } from "@deepgram/sdk";
import type {
  ListenV1Response,
  ListenV1AcceptedResponse,
} from "@deepgram/sdk";
import type {
  TranscriptSegment,
  Speaker,
  SpeakerId,
  ASRWord,
  SourceAudioKind,
} from "@/lib/types";

/**
 * Shared Deepgram transcription options for both URL and file paths.
 *
 * IMPORTANT: speaker segmentation is DISABLED in v1 — see the comment block
 * in `lib/client/deepgram-stream.ts` for the full BIPA / voiceprint
 * rationale. Same default applies on the prerecorded path: every recording
 * routed through Yentl, live or batch, runs without per-speaker tagging
 * until the BIPA-consent gate ships.
 *
 *   utterances:true — groups words into utterance objects with per-utterance
 *                     start/end. Required for our TranscriptSegment mapping;
 *                     without it we only get channel-level transcripts.
 *                     (Without speaker tags, utterances carry speaker_id null
 *                     and attribution_status "not_available" — by design.)
 *   numerals:true  — converts spoken numbers ("forty-seven") → digits ("47"),
 *                    which reduces mis-transcription of numerical claims.
 *   smart_format:true — applies Deepgram's post-processing rules (dates,
 *                    phone numbers, currency).
 *
 * Params NOT set (and why):
 *   vad_events      — WebSocket-only feature; irrelevant for prerecorded path.
 *   paragraphs      — conflicts with utterances grouping; keep utterances.
 */
const TRANSCRIBE_OPTIONS = {
  model: "nova-3" as const,
  punctuate: true,
  smart_format: true,
  diarize: false,
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
 * Transcribes a remote audio URL using Deepgram nova-3 (no speaker tagging in v1).
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

  return parseDeepgramResponse(response, url, { source_audio_kind: "audio_file" });
}

/**
 * Parses a Deepgram synchronous response into TranscriptSegment[] + Speaker[].
 * Shared by transcribeUrl, transcribeFile, and transcribeStream.
 *
 * Speaker honesty: speaker_id is null (not 0) when Deepgram omits the speaker
 * field. Defaulting to 0 was a lie — it falsely claimed every utterance belongs
 * to speaker 0 even on mono recordings with no diarization. We emit null +
 * attribution_status: "not_available" instead.
 *
 * Words: the per-word array lives under results.channels[0].alternatives[0].words
 * in Deepgram's batch response. We preserve them per-utterance by time-overlap
 * (midpoint of each word must fall within [utterance.start, utterance.end]).
 * With diarize=false, words carry confidence; with diarize=true they additionally
 * carry speaker and speaker_confidence. This is the foundation for
 * confidence-weighted attribution (Task 5).
 */
function parseDeepgramResponse(
  response: ListenV1Response | ListenV1AcceptedResponse,
  source: string,
  options: { source_audio_kind?: SourceAudioKind } = {},
): TranscribeResult {
  if (!("results" in response) || !response.results) {
    throw new Error(
      `Deepgram did not return synchronous results. Source: ${source}. ` +
        "Ensure the file is publicly accessible and no callback= is set.",
    );
  }

  const rawUtterances = response.results.utterances ?? [];

  // Words live under results.channels[0].alternatives[0].words in Deepgram's
  // batch response. We preserve them per-utterance by time-overlap. With
  // diarize=false they carry confidence; with diarize=true they additionally
  // carry per-word speaker and speaker_confidence.
  const allWords: unknown[] =
    (response.results.channels as Array<{ alternatives?: Array<{ words?: unknown[] }> }> | undefined)?.[0]?.alternatives?.[0]?.words ?? [];

  const speakerSet = new Set<number>();
  const utterances: TranscriptSegment[] = rawUtterances.map((u, idx) => {
    // Speaker honesty: null when omitted. Do NOT default to 0.
    const speakerId: SpeakerId | null =
      typeof u.speaker === "number" ? u.speaker : null;
    if (speakerId !== null) speakerSet.add(speakerId);

    // Capture words whose midpoint falls inside this utterance's [start, end].
    const uStart = u.start ?? 0;
    const uEnd = u.end ?? 0;
    const words: ASRWord[] = (allWords as Array<{
      word?: string;
      start?: number;
      end?: number;
      confidence?: number;
      speaker?: number;
      speaker_confidence?: number;
    }>)
      .filter((w) => {
        const wStart = w.start ?? 0;
        const wEnd = w.end ?? wStart;
        const mid = (wStart + wEnd) / 2;
        return mid >= uStart && mid <= uEnd;
      })
      .map((w) => ({
        text: w.word ?? "",
        start: w.start ?? 0,
        end: w.end ?? 0,
        confidence: w.confidence ?? 0,
        speaker: typeof w.speaker === "number" ? w.speaker : null,
        speaker_confidence: w.speaker_confidence,
      }));

    return {
      id: `dg-${idx}`,
      provider: "deepgram",
      text: u.transcript ?? "",
      start: uStart,
      end: uEnd,
      is_final: true,
      speaker_id: speakerId,
      words: words.length > 0 ? words : undefined,
      attribution_status:
        speakerId === null ? ("not_available" as const) : undefined,
      source_audio_kind: options.source_audio_kind,
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
 * Transcribes an in-memory audio buffer using Deepgram nova-3 (no speaker tagging in v1).
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

  return parseDeepgramResponse(response, `[buffer:${mime}]`, { source_audio_kind: "audio_file" });
}

/**
 * Transcribes a large audio file via a Node.js Readable stream using Deepgram
 * nova-3 (no speaker tagging in v1). Use this for files >50MB to avoid
 * allocating a large Buffer in the serverless function's memory.
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

  return parseDeepgramResponse(response, `[stream:${mime}]`, { source_audio_kind: "audio_file" });
}
