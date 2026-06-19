"use client";

import { useState, useRef, useCallback, useEffect, useMemo, type DragEvent, type ChangeEvent } from "react";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  FileSearch,
  FileText,
  ListChecks,
  Loader2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import {
  buildDocumentOutline,
  parsePlainText,
  parseDocx,
  parsePdfWithMetadata,
  parseTimedText,
} from "@/lib/client/text-ingest";
import { bulkIngest } from "@/lib/client/ingest-orchestrator";
import type { TextDocumentMeta, TextDocumentOutlineItem, TranscriptSegment } from "@/lib/types";

const MAX_TEXT_BYTES = 1_048_576; // 1 MB of extracted text
const MAX_FILE_BYTES = 25 * 1024 * 1024; // PDF/text container cap

const ACCEPTED_EXTENSIONS = [".txt", ".md", ".docx", ".pdf", ".srt", ".vtt"];
const ACCEPTED_MIME = [
  "text/plain",
  "text/markdown",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/pdf",
  "text/vtt",
  "application/x-subrip",
];

const FILE_INPUT_ID = "text-ingest-file-input";
const VALIDATION_TEXT_FIXTURES = [
  {
    label: "Load validation TXT",
    path: "/validation/yentl-synthetic-transcript.txt",
    filename: "yentl-synthetic-transcript.txt",
    mime: "text/plain",
    responseType: "text",
  },
  {
    label: "Load validation MD",
    path: "/validation/yentl-synthetic-transcript.md",
    filename: "yentl-synthetic-transcript.md",
    mime: "text/markdown",
    responseType: "text",
  },
  {
    label: "Load validation DOCX",
    path: "/validation/yentl-small-brief.docx",
    filename: "yentl-small-brief.docx",
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    responseType: "arrayBuffer",
  },
  {
    label: "Load validation PDF",
    path: "/validation/yentl-small-text-layer.pdf",
    filename: "yentl-small-text-layer.pdf",
    mime: "application/pdf",
    responseType: "arrayBuffer",
  },
  {
    label: "Load validation VTT",
    path: "/validation/yentl-synthetic-captions.vtt",
    filename: "yentl-synthetic-captions.vtt",
    mime: "text/vtt",
    responseType: "text",
  },
  {
    label: "Load validation SRT",
    path: "/validation/yentl-synthetic-captions.srt",
    filename: "yentl-synthetic-captions.srt",
    mime: "application/x-subrip",
    responseType: "text",
  },
] as const;

type LoadedTextFile = {
  name: string;
  mime: string;
  size: number;
  extractionKind: TextDocumentMeta["extraction_kind"];
  pageCount?: number;
  outline: TextDocumentOutlineItem[];
};

function isSupportedFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

function textStructure(text: string) {
  const trimmed = text.trim();
  if (!trimmed) {
    return { speakers: 0, speakerTurns: 0, lines: 0, paragraphs: 0 };
  }

  const nonEmptyLines = trimmed.split(/\r?\n/).filter((line) => line.trim().length > 0);
  const speakerLabels = new Set<string>();
  let speakerTurns = 0;
  for (const line of nonEmptyLines) {
    const match = line.trim().match(/^(?:\[[^\]]{1,16}\]\s*)?([A-Z][\w .'-]{1,30})\s*[:—–]\s+/);
    if (match?.[1]) {
      speakerLabels.add(match[1]);
      speakerTurns += 1;
    }
  }

  return {
    speakers: speakerLabels.size,
    speakerTurns,
    lines: nonEmptyLines.length,
    paragraphs: trimmed.split(/\n\s*\n/).filter((part) => part.trim().length > 0).length,
  };
}

export function TextIngestPane() {
  const router = useRouter();
  const setPrerecordStage = useSession((s) => s.setPrerecordStage);
  const setSource = useSession((s) => s.setSource);
  const pendingLaunchFile = useSession((s) => s.pendingLaunchFile);
  const clearPendingLaunchFile = useSession((s) => s.clearPendingLaunchFile);
  const initialText = useSession((s) =>
    s.source.kind === "text_doc" ? s.source.initial_text ?? "" : "",
  );

  const [text, setText] = useState(initialText);
  const [loadedFile, setLoadedFile] = useState<LoadedTextFile | null>(null);
  const [timedSegments, setTimedSegments] = useState<TranscriptSegment[] | null>(null);
  const [withSpeakers, setWithSpeakers] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [filePhase, setFilePhase] = useState<{ label: string } | null>(null);
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
  const reviewAnchorCount = timedSegments
    ? timedSegments.length
    : withSpeakers && structure.speakerTurns > 0
      ? structure.speakerTurns
      : structure.paragraphs;
  const documentOutline = useMemo(
    () => loadedFile?.outline ?? (text.trim() ? buildDocumentOutline(text, { maxItems: 5 }) : []),
    [loadedFile, text],
  );

  // ── text change ─────────────────────────────────────────────────────────────
  const handleTextChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    if (val.length > MAX_TEXT_BYTES) {
      setError("Transcript is too large (max 1 MB). Please trim it and try again.");
      // Still allow the user to see the text, but show the error
      setText(val);
      return;
    }
    setError(null);
    setLoadedFile(null);
    setTimedSegments(null);
    setFilePhase(null);
    setText(val);
  }, []);

  // ── file reading ─────────────────────────────────────────────────────────────
  const loadFile = useCallback(async (file: File) => {
    setError(null);
    setLoadedFile(null);
    setTimedSegments(null);

    if (!isSupportedFile(file)) {
      setError("Only .txt, .md, .docx, .pdf, .srt, and .vtt files are supported.");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      setError("File is too large (max 25 MB). Please trim it and try again.");
      return;
    }

    try {
      let content: string;
      let extractionKind: TextDocumentMeta["extraction_kind"] = "plain_text";
      let pageCount: number | undefined;
      let outline: TextDocumentOutlineItem[] = [];
      const lowerName = file.name.toLowerCase();
      if (lowerName.endsWith(".docx")) {
        setFilePhase({ label: "Extracting Word document text" });
        content = await parseDocx(file);
        extractionKind = "docx_text";
        outline = buildDocumentOutline(content);
        setTimedSegments(null);
      } else if (lowerName.endsWith(".pdf")) {
        setFilePhase({ label: "Extracting selectable PDF text" });
        const result = await parsePdfWithMetadata(file);
        content = result.text;
        extractionKind = "pdf_text_layer";
        pageCount = result.pageCount;
        outline = result.outline;
        setTimedSegments(null);
      } else if (lowerName.endsWith(".srt") || lowerName.endsWith(".vtt")) {
        setFilePhase({ label: "Parsing caption cues" });
        const raw = await file.text();
        const segments = parseTimedText(raw, lowerName.endsWith(".srt") ? "srt" : "vtt");
        if (segments.length === 0) {
          throw new Error("No timed caption cues were found.");
        }
        setTimedSegments(segments);
        content = segments
          .map((segment) => `${formatClock(segment.start)} ${segment.text}`)
          .join("\n");
        extractionKind = "timed_text";
        outline = buildDocumentOutline(content);
      } else {
        setFilePhase({ label: "Reading text file" });
        content = await file.text();
        outline = buildDocumentOutline(content);
        setTimedSegments(null);
      }
      if (content.length > MAX_TEXT_BYTES) {
        setError("Transcript is too large (max 1 MB). Please trim it and try again.");
        return;
      }
      setLoadedFile({
        name: file.name,
        mime: file.type || guessMimeFromName(file.name),
        size: file.size,
        extractionKind,
        pageCount,
        outline,
      });
      setText(content);
    } catch (e) {
      setError(`Failed to read file: ${String(e)}`);
    } finally {
      setFilePhase(null);
    }
  }, []);

  useEffect(() => {
    if (!pendingLaunchFile) return;

    let cancelled = false;
    const file = pendingLaunchFile;

    void Promise.resolve()
      .then(() => loadFile(file))
      .finally(() => {
        if (!cancelled) clearPendingLaunchFile();
      });

    return () => {
      cancelled = true;
    };
  }, [clearPendingLaunchFile, loadFile, pendingLaunchFile]);

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

  const handleLoadValidationFixture = useCallback(async (fixture: typeof VALIDATION_TEXT_FIXTURES[number]) => {
    if (isProcessing || filePhase) return;

    try {
      const res = await fetch(fixture.path);
      if (!res.ok) {
        throw new Error(`Could not load validation text (${res.status}).`);
      }
      const content = fixture.responseType === "arrayBuffer"
        ? await res.arrayBuffer()
        : await res.text();
      const file = new File([content], fixture.filename, {
        type: fixture.mime,
      });
      await loadFile(file);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [filePhase, isProcessing, loadFile]);

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
      const segments = timedSegments ?? parsePlainText(text, { withSpeakers });
      setSource({
        kind: "text_doc",
        filename: loadedFile?.name || "Pasted transcript",
        mime: loadedFile?.mime || "text/plain",
        byte_count: loadedFile?.size ?? text.length,
        initial_text: text,
        intent: "document",
        document_meta: {
          extraction_kind: loadedFile?.extractionKind ?? (timedSegments ? "timed_text" : "plain_text"),
          page_count: loadedFile?.pageCount,
          outline: documentOutline,
        },
      });
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
  }, [documentOutline, loadedFile, setSource, text, timedSegments, withSpeakers, isProcessing, router]);

  // ── back navigation ────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    abortControllerRef.current?.abort();
    setPrerecordStage("picker");
  }, [setPrerecordStage]);

  const canProcess = text.trim().length > 0 && !isProcessing && !filePhase;

  return (
    <div className="mx-auto w-full max-w-[1180px] px-4 pb-12 pt-6 sm:px-6 md:px-8">
      {/* Back link */}
      <button
        type="button"
        onClick={handleBack}
        className="mb-5 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-[12px] font-medium text-ink-3 transition-colors hover:bg-cream-2 hover:text-ink-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/30"
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
            Accepts plain text, Markdown, Word, PDF text layers, SRT, or VTT. Speaker labels like{" "}
            <span className="font-mono">David:</span> are auto-detected before Yentl builds
            claims and markers from the text.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-[11.5px] text-ink-3">
            <span className="rounded-full border border-line bg-cream px-2.5 py-1">
              TXT, MD, DOCX, PDF, SRT, VTT
            </span>
            <span className="rounded-full border border-line bg-cream px-2.5 py-1">
              PDFs need selectable text
            </span>
            <span className="rounded-full border border-line bg-cream px-2.5 py-1">
              Scanned PDFs need OCR elsewhere
            </span>
          </div>

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
              disabled={isProcessing || Boolean(filePhase)}
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
              {filePhase && (
                <div
                  role="status"
                  className="absolute inset-0 z-20 flex items-center justify-center rounded-lg border border-teal/30 bg-paper/90"
                >
                  <span className="inline-flex items-center gap-2 text-[13px] font-medium text-teal">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {filePhase.label}
                  </span>
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
                disabled={isProcessing || Boolean(filePhase)}
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
            {timedSegments && (
              <>
                <span className="opacity-40">·</span>
                <span>{timedSegments.length.toLocaleString()} timed cues</span>
              </>
            )}
            {loadedFile?.pageCount && (
              <>
                <span className="opacity-40">·</span>
                <span>{loadedFile.pageCount.toLocaleString()} PDF pages</span>
              </>
            )}
          </div>

          {loadedFile && (
            <div className="mt-3 rounded-lg border border-teal/20 bg-teal-soft px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium text-teal">
                <FileSearch className="h-3.5 w-3.5" aria-hidden />
                <span>{loadedFile.name}</span>
                <span className="text-teal/60">·</span>
                <span>{fileExtractionLabel(loadedFile.extractionKind)}</span>
                <span className="text-teal/60">·</span>
                <span>{formatBytes(loadedFile.size)}</span>
              </div>
              {loadedFile.pageCount && (
                <div className="mt-1 text-ink-3">
                  Selectable text extracted from {loadedFile.pageCount.toLocaleString()} PDF pages.
                </div>
              )}
            </div>
          )}

          {validationDemoEnabled() && !isProcessing && !filePhase && (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {VALIDATION_TEXT_FIXTURES.map((fixture) => (
                <button
                  key={fixture.path}
                  type="button"
                  onClick={() => void handleLoadValidationFixture(fixture)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-teal/25 bg-teal-soft px-3 text-[12.5px] font-semibold text-teal transition-colors hover:border-teal/40 hover:bg-paper disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {fixture.label}
                </button>
              ))}
            </div>
          )}

          {/* Error message */}
          {error && (
            <DocumentImportError
              message={error}
              onChooseFile={() => document.getElementById(FILE_INPUT_ID)?.click()}
              onPasteText={() => {
                setError(null);
                textareaRef.current?.focus();
              }}
              onBrowserTab={() => {
                setSource({ kind: "browser_tab" });
                setPrerecordStage("selected");
              }}
            />
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
                {loadedFile?.pageCount && (
                  <StructureStat label="PDF pages" value={loadedFile.pageCount} />
                )}
                <StructureStat label="Review anchors" value={reviewAnchorCount} />
              </div>
            ) : (
              <div className="rounded-md border border-line bg-paper px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
                Paste transcript text to preview speaker labels, paragraph blocks, and line count before processing.
              </div>
            )}
          </section>

          <section className="rounded-lg border border-line bg-paper p-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-4">
              <FileSearch className="h-3.5 w-3.5" aria-hidden />
              Document outline
            </div>
            {documentOutline.length > 0 ? (
              <ol className="grid gap-2">
                {documentOutline.slice(0, 5).map((item, index) => (
                  <li key={`${item.kind}-${item.line_start ?? item.paragraph_index ?? index}`} className="rounded-md border border-line bg-cream px-3 py-2">
                    <div className="text-[12.5px] font-semibold text-ink-2">{item.label}</div>
                    {item.preview && (
                      <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink-3">{item.preview}</div>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-md border border-line bg-cream px-3 py-3 text-[12.5px] leading-relaxed text-ink-3">
                Yentl will build an outline from headings or opening paragraphs once text is loaded.
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
              <TextStep label="Anchor" body="Document sections and paragraph positions stay attached to findings." />
              <TextStep label="Analyze" body="Yentl extracts checkable claims and rhetorical markers." />
              <TextStep label="Review" body="The workspace opens with transcript context intact." />
            </div>
          </section>

          <section className="rounded-lg border border-amber/30 bg-amber-soft p-4 text-[12.5px] leading-relaxed text-ink-3">
            <div className="mb-2 flex items-center gap-2 font-semibold text-amber-2">
              <AlertCircle className="h-4 w-4" aria-hidden />
              PDF import boundary
            </div>
            Selectable PDF text is imported with page count and outline context. Scanned image-only PDFs
            currently need OCR before import; paste the extracted text or use browser-tab capture when
            the PDF is being viewed online.
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

function DocumentImportError({
  message,
  onChooseFile,
  onPasteText,
  onBrowserTab,
}: {
  message: string;
  onChooseFile: () => void;
  onPasteText: () => void;
  onBrowserTab: () => void;
}) {
  const isPdfTextLayerProblem = /pdf|ocr|selectable text|text layer/i.test(message);

  return (
    <div role="alert" className="mt-3 rounded-lg border border-red/20 bg-red-soft px-3 py-3 text-[13px] text-red">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div>
          <div className="font-semibold">Document import needs attention.</div>
          <div className="mt-0.5">{message}</div>
        </div>
      </div>
      {isPdfTextLayerProblem && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onChooseFile}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red/20 bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 hover:bg-cream"
          >
            Choose another file
          </button>
          <button
            type="button"
            onClick={onPasteText}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red/20 bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 hover:bg-cream"
          >
            Paste extracted text
          </button>
          <button
            type="button"
            onClick={onBrowserTab}
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-red/20 bg-paper px-3 py-2 text-[12px] font-semibold text-ink-2 hover:bg-cream"
          >
            Use browser tab
          </button>
        </div>
      )}
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

function fileExtractionLabel(kind: TextDocumentMeta["extraction_kind"]) {
  switch (kind) {
    case "pdf_text_layer":
      return "PDF text layer";
    case "docx_text":
      return "Word text";
    case "timed_text":
      return "Timed captions";
    case "plain_text":
    default:
      return "Plain text";
  }
}

function validationDemoEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_YENTL_DISABLE_VALIDATION_DEMO === "1") return false;
  if (process.env.NEXT_PUBLIC_YENTL_ENABLE_VALIDATION_DEMO === "1") return true;
  return process.env.NODE_ENV !== "production";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function guessMimeFromName(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith(".md")) return "text/markdown";
  if (lower.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".srt")) return "application/x-subrip";
  if (lower.endsWith(".vtt")) return "text/vtt";
  return "text/plain";
}
