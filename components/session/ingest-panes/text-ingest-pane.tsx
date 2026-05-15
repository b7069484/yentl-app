"use client";

import { useState, useRef, useCallback, useEffect, type DragEvent, type ChangeEvent } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useSession } from "@/lib/client/session-store";
import { parsePlainText, parseDocx } from "@/lib/client/text-ingest";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";

const MAX_BYTES = 1_048_576; // 1 MB

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".docx"];
const ACCEPTED_MIME = [
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const FILE_INPUT_ID = "text-ingest-file-input";

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export function TextIngestPane() {
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);

  const [text, setText] = useState("");
  const [withSpeakers, setWithSpeakers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Holds the AbortController for the currently running bulkIngest call.
  const abortControllerRef = useRef<AbortController | null>(null);

  // Abort any in-progress ingest on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const charCount = text.length;
  const tokenEst = Math.ceil(charCount / 4);

  // ── text change ─────────────────────────────────────────────────────────────
  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_BYTES) {
      setError("Transcript is too large (max 1 MB). Please trim it and try again.");
      // Still allow the user to see the text, but show the error
      setText(val);
      return;
    }
    setError(null);
    setText(val);
  }, []);

  // ── file reading ─────────────────────────────────────────────────────────────
  const loadFile = useCallback(async (file: File) => {
    setError(null);

    if (!isSupportedFile(file)) {
      setError("Only .txt, .md, and .docx files are supported.");
      return;
    }

    if (file.size > MAX_BYTES) {
      setError("Transcript is too large (max 1 MB). Please trim it and try again.");
      return;
    }

    try {
      let content: string;
      if (file.name.toLowerCase().endsWith(".docx")) {
        content = await parseDocx(file);
      } else {
        content = await file.text();
      }
      setText(content);
    } catch (e) {
      setError(`Failed to read file: ${String(e)}`);
    }
  }, []);

  // ── file input (keyboard a11y) ────────────────────────────────────────────
  const handleFileInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await loadFile(file);
      // Reset so the same file can be re-selected if the user wants
      e.target.value = "";
    },
    [loadFile],
  );

  // ── drag-drop ─────────────────────────────────────────────────────────────
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length === 0) return;
      await loadFile(files[0]);
    },
    [loadFile],
  );

  // ── process ──────────────────────────────────────────────────────────────────
  const handleProcess = useCallback(async () => {
    if (!text.trim() || isProcessing) return;

    // Abort any previous run (shouldn't be one, but safety net)
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsProcessing(true);
    setError(null);
    try {
      const segments = parsePlainText(text, { withSpeakers });
      await bulkIngest(segments, { signal: controller.signal });
    } catch (e) {
      setError(`Processing failed: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [text, withSpeakers, isProcessing]);

  // ── back navigation ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    abortControllerRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const canProcess = text.trim().length > 0 && !isProcessing;

  return (
    <div className="max-w-[680px] mx-auto px-6 pt-8 pb-12">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="inline-flex items-center gap-1.5 text-[12px] text-ink-3 hover:text-ink-2 mb-6"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      {/* Headline */}
      <h2 className="font-serif text-[22px] text-ink mb-1">Paste or drop a transcript</h2>
      <p className="text-[13px] text-ink-3 mb-5">
        Accepts plain text, Markdown, or a Word document (.docx). Speaker labels like{" "}
        <span className="font-mono">David:</span> are auto-detected.
      </p>

      {/* Drop zone + textarea (wrapped in label for keyboard file-pick a11y) */}
      <label htmlFor={FILE_INPUT_ID}>
        {/* Hidden file input — keyboard users activate via the label */}
        <input
          id={FILE_INPUT_ID}
          type="file"
          accept={[...ACCEPTED_EXTENSIONS, ...ACCEPTED_MIME].join(",")}
          className="sr-only"
          aria-label="Choose a transcript file"
          onChange={handleFileInputChange}
          disabled={isProcessing}
        />
        <div
          data-testid="drop-zone"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={[
            "relative rounded-lg border transition-colors",
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-border bg-surface",
          ].join(" ")}
        >
          {isDragOver && (
            <div className="absolute inset-0 flex items-center justify-center rounded-lg pointer-events-none z-10 bg-primary/10">
              <span className="text-[14px] font-medium text-primary">Drop file here</span>
            </div>
          )}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            placeholder="Paste your transcript here…"
            onClick={(e) => e.stopPropagation()}
            className={[
              "w-full min-h-[280px] p-3 bg-transparent rounded-lg resize-y",
              "font-mono text-[13px] text-ink placeholder:text-ink-3",
              "focus:outline-none focus:ring-2 focus:ring-primary/40",
            ].join(" ")}
            disabled={isProcessing}
          />
        </div>
      </label>

      {/* Char / token count */}
      <div className="mt-2 flex items-center gap-3 text-[12px] text-ink-3">
        <span>{charCount.toLocaleString()} chars</span>
        <span className="opacity-40">·</span>
        <span>~{tokenEst.toLocaleString()} tokens</span>
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-3 text-[13px] text-red-600 dark:text-red-400">{error}</p>
      )}

      {/* Speaker toggle */}
      <label className="mt-4 flex items-center gap-2.5 cursor-pointer select-none w-fit">
        <input
          type="checkbox"
          checked={withSpeakers}
          onChange={(e) => setWithSpeakers(e.target.checked)}
          className="w-4 h-4 rounded accent-primary"
          disabled={isProcessing}
        />
        <span className="text-[13px] text-ink-2">
          Detect speaker labels (e.g.{" "}
          <span className="font-mono text-[12px]">David:</span>)
        </span>
      </label>

      {/* Process button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={handleProcess}
          disabled={!canProcess}
          className={[
            "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
            "text-[13px] font-medium transition-colors",
            canProcess
              ? "bg-primary text-white hover:bg-primary/90"
              : "bg-surface-2 text-ink-3 cursor-not-allowed",
          ].join(" ")}
        >
          {isProcessing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          {isProcessing ? "Processing…" : "Process transcript →"}
        </button>
      </div>
    </div>
  );
}
