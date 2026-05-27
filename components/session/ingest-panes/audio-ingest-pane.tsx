"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Upload,
  FileAudio,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import {
  probeAudioDuration,
  estimateDeepgramCost,
  formatDuration,
  formatBytes,
  transcribeAudioFile,
  BLOB_UPLOAD_THRESHOLD_BYTES,
} from "@/lib/client/audio-ingest";

const ACCEPTED_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-m4a",
  "audio/mp4",
  "audio/ogg",
  "audio/webm",
]);

const ACCEPT_ATTR =
  "audio/mpeg, audio/wav, audio/x-m4a, audio/mp4, audio/ogg, audio/webm, .mp3, .wav, .m4a, .ogg, .webm";

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB
const MAX_DURATION_SEC = 4 * 60 * 60; // 4 hours

type Phase =
  | { kind: "idle" }
  | { kind: "probing" }
  | { kind: "uploading"; progress: number } // client-direct Blob upload (large files)
  | { kind: "processing" }                  // transcribing via Deepgram
  | { kind: "ingesting" }
  | { kind: "done" }
  | { kind: "error"; message: string };

interface StagedFile {
  file: File;
  duration: number;
}

function isAudioMime(type: string): boolean {
  // Check exact match or .m4a which often comes as audio/x-m4a or audio/mp4
  return ACCEPTED_TYPES.has(type);
}

export function AudioIngestPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);

  const [staged, setStaged] = useState<StagedFile | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const handoffRef = useRef(false);

  // Abort any in-flight upload/transcribe when the component unmounts
  useEffect(() => () => {
    if (!handoffRef.current) abortRef.current?.abort();
  }, []);

  const handleFile = useCallback(async (file: File) => {
    // Validate type
    if (!isAudioMime(file.type) && !isAudioMime(guessTypeFromName(file.name))) {
      setPhase({
        kind: "error",
        message: `Unsupported file type: "${file.type || file.name}". Please upload .mp3, .wav, .m4a, .ogg, or .webm.`,
      });
      return;
    }

    // Validate size
    if (file.size > MAX_BYTES) {
      setPhase({
        kind: "error",
        message: `File is too large (${formatBytes(file.size)}). Maximum allowed size is 500 MB.`,
      });
      return;
    }

    setPhase({ kind: "probing" });
    const duration = await probeAudioDuration(file);

    if (duration > MAX_DURATION_SEC) {
      setPhase({
        kind: "error",
        message: `Audio is too long (${formatDuration(duration)}). Maximum allowed duration is 4 hours.`,
      });
      return;
    }

    setStaged({ file, duration });
    setPhase({ kind: "idle" });
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected after clearing
      e.target.value = "";
    },
    [handleFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  const handleProcess = useCallback(async () => {
    if (!staged) return;

    const ac = new AbortController();
    abortRef.current = ac;

    // Create a blob: URL for in-app audio playback (Watch view audio adapter).
    // URL.createObjectURL gives a playable local reference with no server roundtrip.
    const localBlobUrl = URL.createObjectURL(staged.file);

    // Large files go via Vercel Blob (client-direct) to bypass the 4.5 MB
    // serverless function body limit. Show distinct upload + processing phases.
    const isLargeFile = staged.file.size >= BLOB_UPLOAD_THRESHOLD_BYTES;

    try {
      // 1 — Upload + transcribe
      if (isLargeFile) {
        setPhase({ kind: "uploading", progress: 0 });
      } else {
        setPhase({ kind: "processing" });
      }

      const data = await transcribeAudioFile(
        staged.file,
        staged.duration,
        ac.signal,
        isLargeFile
          ? (pct) => {
              if (pct >= 100) {
                setPhase({ kind: "processing" });
              } else {
                setPhase({ kind: "uploading", progress: pct });
              }
            }
          : undefined,
      );

      if (ac.signal.aborted) {
        URL.revokeObjectURL(localBlobUrl);
        return;
      }

      // 2 — Set session source (blob_url points to the in-memory file for playback)
      setSource({
        kind: "audio_file",
        blob_url: localBlobUrl,
        duration_sec: staged.duration,
        filename: staged.file.name,
        mime: staged.file.type,
      });

      // 3 — Bulk ingest
      setPhase({ kind: "ingesting" });
      handoffRef.current = true;
      await bulkIngest(data.utterances, { signal: ac.signal });

      if (!ac.signal.aborted) {
        setPhase({ kind: "done" });
        router.push("/session?view=watch");
      }
    } catch (e: unknown) {
      handoffRef.current = false;
      URL.revokeObjectURL(localBlobUrl);
      if ((e as Error).name === "AbortError") return;
      const message = e instanceof Error ? e.message : String(e);
      setPhase({ kind: "error", message });
    }
  }, [staged, setSource, router]);

  const handleClear = useCallback(() => {
    abortRef.current?.abort();
    setStaged(null);
    setPhase({ kind: "idle" });
  }, []);

  const isProcessing =
    phase.kind === "uploading" ||
    phase.kind === "processing" ||
    phase.kind === "ingesting" ||
    phase.kind === "probing";

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      {/* Back link */}
      <button
        type="button"
        onClick={() => setPrerecordStage("picker")}
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">
            <FileAudio className="h-3.5 w-3.5" aria-hidden />
            Audio upload
          </div>

          <h1 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[34px]">
            Drop an audio or video file
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Upload a recording and Yentl will transcribe it, detect speakers,
            then open the Watch view with transcript, claims, markers, and
            source playback together.
          </p>

          <div className="mt-5 flex flex-wrap gap-2 text-[11.5px] text-ink-3">
            <span className="rounded-full border border-line bg-cream px-2.5 py-1">
              MP3, WAV, M4A, OGG, WebM
            </span>
            <span className="rounded-full border border-line bg-cream px-2.5 py-1">
              Up to 500 MB
            </span>
            <span className="rounded-full border border-line bg-cream px-2.5 py-1">
              Up to 4 hours
            </span>
          </div>

          {/* Drop zone */}
          {!staged && !isProcessing && phase.kind !== "done" && phase.kind !== "error" && (
            <label
              htmlFor="audio-file-input"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={[
                "mt-6 flex min-h-56 cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-8 py-12 text-center transition-colors",
                isDragging
                  ? "border-teal bg-teal-soft"
                  : "border-line-strong bg-cream hover:border-teal/50 hover:bg-teal-soft/50",
              ].join(" ")}
              data-testid="drop-zone"
            >
              <Upload className="h-8 w-8 text-ink-4" aria-hidden />
              <div>
                <div className="text-[15px] font-semibold text-ink-2">
                  Drop your recording here
                </div>
                <div className="mt-1 text-[12.5px] text-ink-3">
                  or click to browse from this device
                </div>
              </div>
              <input
                id="audio-file-input"
                ref={inputRef}
                type="file"
                accept={ACCEPT_ATTR}
                className="sr-only"
                onChange={handleInputChange}
                aria-label="Select audio file"
              />
            </label>
          )}

          {/* Staged file preview card */}
          {staged && !isProcessing && phase.kind !== "done" && (
            <div className="mt-6 rounded-lg border border-green/25 bg-green-soft p-5">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-paper px-2.5 py-1 text-[11px] font-semibold text-green">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                Ready to process
              </div>
              <div className="flex items-start gap-3 rounded-lg border border-line bg-paper p-4">
                <FileAudio className="mt-0.5 h-5 w-5 shrink-0 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <div
                    className="truncate text-[14px] font-semibold text-ink"
                    title={staged.file.name}
                  >
                    {staged.file.name}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink-3">
                    <span>{formatBytes(staged.file.size)}</span>
                    {staged.duration > 0 && (
                      <span>{formatDuration(staged.duration)}</span>
                    )}
                    <span>
                      Est. cost: {estimateDeepgramCost(staged.duration).display}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClear}
                  className="shrink-0 text-[12px] font-medium text-ink-3 hover:text-ink-2"
                  aria-label="Remove file"
                >
                  Remove
                </button>
              </div>
              <button
                type="button"
                onClick={handleProcess}
                disabled={!staged || isProcessing}
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-ink px-5 py-2.5 text-[14px] font-medium text-white shadow-sm transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Process audio
                <ArrowRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}

          {/* Processing states */}
          {isProcessing && (
            <div className="mt-6 flex flex-col gap-3 rounded-lg border border-line bg-cream p-5">
              <div className="flex items-center gap-3">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-teal" />
                <div>
                  <div className="text-[13px] font-semibold text-ink-2">
                    {phase.kind === "probing" && "Checking file details"}
                    {phase.kind === "uploading" && `Uploading recording ${phase.progress}%`}
                    {phase.kind === "processing" && "Transcribing recording"}
                    {phase.kind === "ingesting" && "Building the analysis workspace"}
                  </div>
                  <div className="mt-0.5 text-[12px] text-ink-3">
                    Keep this tab open. Yentl will move to Watch when the transcript is ready.
                  </div>
                </div>
              </div>
              {phase.kind === "uploading" && (
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-teal transition-all duration-150"
                    style={{ width: `${phase.progress}%` }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Done state */}
          {phase.kind === "done" && (
            <div className="mt-6 flex items-start gap-3 rounded-lg border border-green/25 bg-green-soft px-4 py-3 text-[13px] text-ink-2">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
              <div>
                <div className="font-semibold text-ink">Transcription complete.</div>
                <div className="mt-0.5 text-ink-3">Opening the synchronized Watch view now.</div>
              </div>
            </div>
          )}

          {/* Error state */}
          {phase.kind === "error" && (
            <div className="mt-5 flex items-start gap-2 rounded-lg border border-red/20 bg-red-soft px-4 py-3 text-[13px] text-red">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{phase.message}</span>
            </div>
          )}

          {/* After error: re-show drop zone so user can try again */}
          {phase.kind === "error" && !staged && (
            <label
              htmlFor="audio-file-input-retry"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-line-strong px-8 py-6 text-[13px] text-ink-3 transition-colors hover:border-teal/50 hover:bg-teal-soft/50"
              data-testid="drop-zone"
            >
              <Upload className="h-4 w-4" aria-hidden />
              Try another file
              <input
                id="audio-file-input-retry"
                type="file"
                accept={ACCEPT_ATTR}
                className="sr-only"
                onChange={handleInputChange}
                aria-label="Select audio file"
              />
            </label>
          )}
        </section>

        <aside className="grid gap-3">
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              What happens next
            </div>
            <div className="grid gap-2">
              <AudioStep label="Upload" body="Large files show upload progress before transcription." />
              <AudioStep label="Transcribe" body="Deepgram turns the recording into timed speech segments." />
              <AudioStep label="Review" body="Yentl opens Watch with playback, transcript, claims, and markers." />
            </div>
          </section>

          <section className="rounded-lg border border-teal/20 bg-teal-soft p-4 text-[12.5px] leading-relaxed text-ink-3">
            <div className="mb-2 flex items-center gap-2 font-semibold text-teal">
              <ShieldCheck className="h-4 w-4" aria-hidden />
              Upload note
            </div>
            Audio is processed to create a transcript for this session. Use browser-tab capture instead
            when you want to keep an online media page visible beside Yentl.
          </section>
        </aside>
      </div>
    </div>
  );
}

function AudioStep({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-paper px-3 py-3">
      <div className="text-[12.5px] font-semibold text-ink-2">{label}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{body}</div>
    </div>
  );
}

/** Guess MIME type from file extension when file.type is empty. */
function guessTypeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/x-m4a",
    ogg: "audio/ogg",
    webm: "audio/webm",
  };
  return map[ext] ?? "";
}
