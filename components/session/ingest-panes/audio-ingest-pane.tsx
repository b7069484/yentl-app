"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { ArrowLeft, Upload, FileAudio, Loader2, AlertCircle } from "lucide-react";
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

  // Abort any in-flight upload/transcribe when the component unmounts
  useEffect(() => () => { abortRef.current?.abort(); }, []);

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
      await bulkIngest(data.utterances, { signal: ac.signal });

      if (!ac.signal.aborted) {
        setPhase({ kind: "done" });
        router.push("/session?view=watch");
      }
    } catch (e: unknown) {
      URL.revokeObjectURL(localBlobUrl);
      if ((e as Error).name === "AbortError") return;
      const message = e instanceof Error ? e.message : String(e);
      setPhase({ kind: "error", message });
    }
  }, [staged, setSource]);

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
    <div className="max-w-[680px] mx-auto px-6 pt-8 pb-12">
      {/* Back link */}
      <button
        type="button"
        onClick={() => setPrerecordStage("picker")}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <h1 className="font-serif text-[22px] text-ink mb-1">Drop an audio file</h1>
      <p className="text-[13px] text-ink-3 mb-6">
        .mp3, .wav, .m4a, .ogg, .webm — up to 500 MB / 4 hours
      </p>

      {/* Drop zone */}
      {!staged && !isProcessing && phase.kind !== "done" && phase.kind !== "error" && (
        <label
          htmlFor="audio-file-input"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={[
            "flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl px-8 py-12 cursor-pointer transition-colors",
            isDragging
              ? "border-accent bg-accent/5"
              : "border-ink-6 hover:border-ink-4 hover:bg-ink-6/40",
          ].join(" ")}
          data-testid="drop-zone"
        >
          <Upload className="w-8 h-8 text-ink-4" />
          <div className="text-center">
            <div className="text-[14px] font-medium text-ink-2">
              Drop your audio file here
            </div>
            <div className="text-[12px] text-ink-3 mt-0.5">
              or click to browse
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
        <div className="border border-ink-6 rounded-xl p-5 bg-paper">
          <div className="flex items-start gap-3">
            <FileAudio className="w-5 h-5 text-ink-3 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div
                className="text-[14px] font-medium text-ink truncate"
                title={staged.file.name}
              >
                {staged.file.name}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[12px] text-ink-3">
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
              className="text-[11px] text-ink-3 hover:text-ink-2 shrink-0"
              aria-label="Remove file"
            >
              Remove
            </button>
          </div>
        </div>
      )}

      {/* Processing states */}
      {isProcessing && (
        <div className="border border-ink-6 rounded-xl p-5 bg-surface flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-ink-3 animate-spin shrink-0" />
            <div className="text-[13px] text-ink-2">
              {phase.kind === "probing" && "Checking audio…"}
              {phase.kind === "uploading" && `Uploading… ${phase.progress}%`}
              {phase.kind === "processing" && "Transcribing…"}
              {phase.kind === "ingesting" && "Feeding to fact-checker…"}
            </div>
          </div>
          {phase.kind === "uploading" && (
            <div className="h-1 rounded-full bg-ink-6 overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-150"
                style={{ width: `${phase.progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Done state */}
      {phase.kind === "done" && (
        <div className="border border-green-200 rounded-xl p-5 bg-green-50 text-[13px] text-green-800">
          Transcription complete — session is live.
        </div>
      )}

      {/* Error state */}
      {phase.kind === "error" && (
        <div className="mt-4 flex items-start gap-2 text-[13px] text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{phase.message}</span>
        </div>
      )}

      {/* Process button */}
      {staged && !isProcessing && phase.kind !== "done" && (
        <button
          type="button"
          onClick={handleProcess}
          disabled={!staged || isProcessing}
          className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink text-bg text-[14px] font-medium px-5 py-2.5 hover:bg-ink/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Process audio →
        </button>
      )}

      {/* After error: re-show drop zone so user can try again */}
      {phase.kind === "error" && !staged && (
        <label
          htmlFor="audio-file-input-retry"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="mt-4 flex items-center justify-center gap-2 border-2 border-dashed border-ink-6 hover:border-ink-4 rounded-xl px-8 py-6 cursor-pointer transition-colors text-[13px] text-ink-3"
          data-testid="drop-zone"
        >
          <Upload className="w-4 h-4" />
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
