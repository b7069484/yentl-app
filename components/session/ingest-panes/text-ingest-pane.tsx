"use client";

import { useState, useRef, useCallback, useEffect, type DragEvent, type ChangeEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileText,
  ListChecks,
  Loader2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
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

function textStructure(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { speakers: 0, lines: 0, paragraphs: 0 };
  }

  const nonEmptyLines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const speakerLabels = new Set<string>();
  for (const line of nonEmptyLines) {
    const match = line.trim().match(/^([A-Z][\w .'-]{0,30}):\s+/);
    if (match?.[1]) speakerLabels.add(match[1]);
  }

  return {
    speakers: speakerLabels.size,
    lines: nonEmptyLines.length,
    paragraphs: trimmed.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length,
  };
}

export function TextIngestPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const initialText = useSession((s) =>
    s.source.kind === "text_doc" ? s.source.initial_text ?? "" : "",
  );

  const [text, setText] = useState(initialText);
  const [withSpeakers, setWithSpeakers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Holds the AbortController for the currently running bulkIngest call.
  const abortControllerRef = useRef<AbortController | null>(null);
  const handoffRef = useRef(false);

  // Abort any in-progress ingest on unmount
  useEffect(() => {
    return () => {
      if (!handoffRef.current) abortControllerRef.current?.abort();
    };
  }, []);

  const charCount = text.length;
  const tokenEst = Math.ceil(charCount / 4);
  const structure = textStructure(text);

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
      handoffRef.current = true;
      await bulkIngest(segments, { signal: controller.signal });
      if (!controller.signal.aborted) {
        router.push("/session?view=overview");
      }
    } catch (e) {
      handoffRef.current = false;
      setError(`Processing failed: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [text, withSpeakers, isProcessing, router]);

  // ── back navigation ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    abortControllerRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const canProcess = text.trim().length > 0 && !isProcessing;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex items-center gap-1.5 text-[12px] text-ink-3 transition-colors hover:text-ink-2"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> Back to sources
      </button>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="rounded-lg border border-line bg-paper p-5 shadow-sm sm:p-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-teal/20 bg-teal-soft px-3 py-1 text-[11px] font-semibold text-teal">
            <FileText className="h-3.5 w-3.5" aria-hidden />
            Transcript or text
          </div>

          {/* Headline */}
          <h2 className="font-serif text-[28px] font-medium leading-tight tracking-tight text-ink sm:text-[34px]">
            Paste or drop a transcript
          </h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-3">
            Accepts plain text, Markdown, or a Word document (.docx). Speaker labels like{" "}
            <span className="font-mono">David:</span> are auto-detected before Yentl builds
            claims and markers from the text.
          </p>

          {/* Drop zone + textarea (wrapped in label for keyboard file-pick a11y) */}
          <label htmlFor={FILE_INPUT_ID} className="mt-6 block">
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
                  ? "border-teal bg-teal-soft"
                  : "border-line bg-cream",
              ].join(" ")}
            >
              {isDragOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-teal-soft pointer-events-none">
                  <span className="text-[14px] font-medium text-teal">Drop file here</span>
                </div>
              )}
              <textarea
                ref={textareaRef}
                value={text}
                onChange={handleTextChange}
                placeholder={"Paste your transcript here...\n\nDavid: We opened the school budget meeting last night.\nMaya: The district said repairs would finish by June."}
                onClick={(e) => e.stopPropagation()}
                className={[
                  "min-h-[320px] w-full resize-y rounded-lg bg-transparent p-3",
                  "font-mono text-[13px] leading-relaxed text-ink placeholder:text-ink-3",
                  "focus:outline-none focus:ring-2 focus:ring-teal/40",
                ].join(" ")}
                disabled={isProcessing}
              />
            </div>
          </label>

          {/* Char / token count */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px] text-ink-3">
            <span>{charCount.toLocaleString()} chars</span>
            <span className="opacity-40">·</span>
            <span>~{tokenEst.toLocaleString()} tokens</span>
            <span className="opacity-40">·</span>
            <span>{structure.lines.toLocaleString()} non-empty lines</span>
          </div>

          {/* Error message */}
          {error && (
            <p className="mt-3 rounded-lg border border-red/20 bg-red-soft px-3 py-2 text-[13px] text-red">
              {error}
            </p>
          )}

          {/* Speaker toggle */}
          <label className="mt-4 flex w-fit cursor-pointer select-none items-center gap-2.5">
            <input
              type="checkbox"
              checked={withSpeakers}
              onChange={(e) => setWithSpeakers(e.target.checked)}
              className="h-4 w-4 rounded accent-teal"
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
                "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-5 py-2.5",
                "text-[13px] font-medium shadow-sm transition-colors",
                canProcess
                  ? "bg-teal text-white hover:bg-teal-2"
                  : "bg-cream-2 text-ink-3 cursor-not-allowed",
              ].join(" ")}
            >
              {isProcessing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              ) : (
                <ArrowRight className="h-3.5 w-3.5" aria-hidden />
              )}
              {isProcessing ? "Processing..." : "Process transcript"}
            </button>
          </div>
        </section>

        <aside className="grid gap-3">
          <section className="rounded-lg border border-line bg-cream p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <Users className="h-3.5 w-3.5" aria-hidden />
              Detected structure
            </div>
            {text.trim() ? (
              <div className="grid gap-2">
                <StructureStat label="Speaker labels" value={withSpeakers ? structure.speakers : 0} />
                <StructureStat label="Paragraph blocks" value={structure.paragraphs} />
                <StructureStat label="Transcript lines" value={structure.lines} />
              </div>
            ) : (
              <div className="rounded-md border border-line bg-paper px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
                Paste transcript text to preview speaker labels, paragraph blocks, and line count before processing.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-paper p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <ListChecks className="h-3.5 w-3.5" aria-hidden />
              What happens next
            </div>
            <div className="grid gap-2">
              <TextStep label="Parse" body="Speaker-prefixed lines become timed transcript segments." />
              <TextStep label="Analyze" body="Yentl extracts checkable claims and rhetorical markers." />
              <TextStep label="Review" body="The workspace opens with transcript context intact." />
            </div>
          </section>

          <section className="rounded-lg border border-green/25 bg-green-soft p-4 text-[12.5px] leading-relaxed text-ink-3">
            <div className="mb-2 flex items-center gap-2 font-semibold text-green">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Best for prepared text
            </div>
            Use browser-tab or media URL when you want Yentl to capture or transcribe playable media.
          </section>
        </aside>
      </div>
    </div>
  );
}

function StructureStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border border-line bg-paper px-3 py-2 text-[12.5px]">
      <span className="text-ink-3">{label}</span>
      <span className="font-semibold text-ink">{value.toLocaleString()}</span>
    </div>
  );
}

function TextStep({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-md border border-line bg-cream px-3 py-3">
      <div className="text-[12.5px] font-semibold text-ink-2">{label}</div>
      <div className="mt-0.5 text-[12px] leading-snug text-ink-3">{body}</div>
    </div>
  );
}
