"use client";
import { type ReactNode, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Braces, Captions, Eye, FileCode2, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  type DevilAdvocateState,
  type SynthesisState,
  useSession,
} from "@/lib/client/session-store";
import { exportSession, type SessionExportKind } from "@/lib/client/export-actions";
import type { ClaimCard, PrimaryLabel, RhetoricMarker, SessionSource } from "@/lib/types";

const LABEL_TEXT: Record<PrimaryLabel, string> = {
  TRUE: "True",
  MOSTLY_TRUE: "Mostly true",
  PARTIAL: "Partially true",
  MISLEADING: "Misleading",
  OMISSION: "Missing context",
  FALSE: "False",
  UNVERIFIABLE: "No reliable backing",
  OPINION: "Opinion",
};

const MARKER_TYPE_TEXT: Record<RhetoricMarker["type"], string> = {
  fallacy: "Fallacy",
  bias: "Bias",
  rhetoric: "Rhetoric",
};

export function ExportDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const title = useSession((s) => s.title);
  const source = useSession((s) => s.source);
  const transcriptCount = useSession((s) => s.transcript.length);
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const synthesis = useSession((s) => s.synthesis);
  const devilAdvocate = useSession((s) => s.devilAdvocate);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const isEmpty =
    transcriptCount === 0 &&
    claims.length === 0 &&
    markers.length === 0;

  const doExport = (kind: SessionExportKind) => {
    setError(null);
    setSuccess(null);
    try {
      const data = useSession.getState().toSession();
      exportSession(data, kind);
      setSuccess(successMessage(kind));
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 800);
    } catch (err) {
      setSuccess(null);
      setError(
        err instanceof Error
          ? err.message
          : "Yentl could not create this export. Try a different format.",
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export this session</DialogTitle>
          <DialogDescription>
            Pick a format. Exports include transcript, claims, markers,
            summary, and Devil&apos;s Advocate when present. The report opens in a
            new tab so you can print or save it as PDF.
          </DialogDescription>
        </DialogHeader>

        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            Nothing to export yet — start an analysis and capture transcript,
            claims, markers, or report context first.
          </p>
        ) : (
          <div className="space-y-2">
            <FormatRow
              label="Preview report"
              hint="Review what the shareable report will contain before opening or saving."
              icon={Eye}
              primary
              expanded={previewOpen}
              onClick={() => setPreviewOpen((v) => !v)}
            />
            {previewOpen && (
              <ReportPreview
                title={title}
                source={source}
                transcriptCount={transcriptCount}
                claims={claims}
                markers={markers}
                synthesis={synthesis}
                devilAdvocate={devilAdvocate}
              />
            )}
            <FormatRow
              label="Open as report"
              hint="Styled HTML in a new tab — print to PDF, share, embed."
              icon={FileText}
              onClick={() => doExport("report")}
            />
            <FormatRow
              label="Markdown file"
              hint="Plain-text export for notes apps, version control, or pasting."
              icon={FileCode2}
              onClick={() => doExport("markdown")}
            />
            <FormatRow
              label="Transcript file"
              hint="Timed plain-text transcript with speakers and source anchors."
              icon={Captions}
              onClick={() => doExport("transcript")}
            />
            <FormatRow
              label="JSON file"
              hint="Raw structured data for scripting, archiving, or analysis."
              icon={Braces}
              onClick={() => doExport("json")}
            />
          </div>
        )}

        {error && (
          <p role="alert" className="rounded-md border border-red-soft bg-red-soft px-3 py-2 text-sm text-red">
            {error}
          </p>
        )}

        {success && (
          <p role="status" aria-live="polite" className="rounded-md border border-teal/20 bg-teal-soft px-3 py-2 text-sm text-teal">
            {success}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function FormatRow({
  label,
  hint,
  icon: Icon,
  onClick,
  primary = false,
  expanded,
}: {
  label: string;
  hint: string;
  icon: LucideIcon;
  onClick: () => void;
  primary?: boolean;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition hover:border-foreground/30 hover:bg-card ${
        primary
          ? "border-foreground/30 bg-card"
          : "border-border/60 bg-card/40"
      }`}
    >
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
        <Icon aria-hidden className="h-4 w-4" />
      </span>
      <div className="flex-1">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
      </div>
      <span aria-hidden className="self-center text-foreground/40 group-hover:text-foreground/70">
        →
      </span>
    </button>
  );
}

function ReportPreview({
  title,
  source,
  transcriptCount,
  claims,
  markers,
  synthesis,
  devilAdvocate,
}: {
  title: string;
  source: SessionSource;
  transcriptCount: number;
  claims: ClaimCard[];
  markers: RhetoricMarker[];
  synthesis: SynthesisState;
  devilAdvocate: DevilAdvocateState;
}) {
  const read = synthesisText(synthesis);
  const challenge = devilAdvocateBrief(devilAdvocate)?.stance;
  const topClaims = claims.slice(0, 3);
  const topMarkers = markers.slice(0, 3);

  return (
    <section
      id="report-preview-panel"
      data-testid="report-preview-panel"
      className="rounded-lg border border-border bg-background p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Report preview
          </p>
          <h3 className="mt-1 text-base font-semibold text-foreground">
            {title || "Yentl session"}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Source: {sourceLabel(source)}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <PreviewStat label="Utterances" value={transcriptCount} />
          <PreviewStat label="Claims" value={claims.length} />
          <PreviewStat label="Markers" value={markers.length} />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {read && (
          <PreviewSection title="Yentl's read">
            <p>{trimPreview(read, 260)}</p>
          </PreviewSection>
        )}

        {challenge && (
          <PreviewSection title="Devil's Advocate">
            <p>{trimPreview(challenge, 220)}</p>
          </PreviewSection>
        )}

        <PreviewSection title="Claim sample">
          {topClaims.length ? (
            <ul className="space-y-2">
              {topClaims.map((claim) => (
                <li key={claim.id} className="rounded-md border border-border/70 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-border px-2 py-0.5 font-semibold text-foreground">
                      {LABEL_TEXT[claim.primary_label]}
                    </span>
                    <span className="font-mono text-muted-foreground">
                      {claim.sources.length} source{claim.sources.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">
                    {trimPreview(claim.claim_text, 180)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No claims captured yet.</p>
          )}
        </PreviewSection>

        <PreviewSection title="Marker sample">
          {topMarkers.length ? (
            <ul className="space-y-2">
              {topMarkers.map((marker) => (
                <li key={marker.id} className="rounded-md border border-border/70 p-3">
                  <div className="text-xs font-semibold text-muted-foreground">
                    {MARKER_TYPE_TEXT[marker.type]} · {marker.display}
                  </div>
                  <p className="mt-1 text-sm text-foreground">
                    {trimPreview(marker.excerpt, 180)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>No rhetoric, fallacy, or bias markers captured yet.</p>
          )}
        </PreviewSection>
      </div>
    </section>
  );
}

function PreviewStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-[4.75rem] rounded-md border border-border bg-card px-2 py-2">
      <div className="font-mono text-lg font-semibold leading-none text-foreground">
        {value}
      </div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </h4>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </section>
  );
}

function synthesisText(synthesis: SynthesisState): string | null {
  if (!synthesis || !("text" in synthesis) || !synthesis.text) return null;
  return synthesis.text;
}

function devilAdvocateBrief(devilAdvocate: DevilAdvocateState) {
  if (!devilAdvocate || !("brief" in devilAdvocate)) return null;
  return devilAdvocate.brief;
}

function sourceLabel(source: SessionSource): string {
  switch (source.kind) {
    case "browser_tab":
      return source.title || source.url || "Browser tab";
    case "audio_file":
      return source.filename;
    case "text_doc":
      return source.filename;
    case "youtube":
      return source.title || source.url;
    case "media_url":
      return source.url;
    case "mic":
    default:
      return "Live microphone";
  }
}

function trimPreview(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function successMessage(kind: SessionExportKind): string {
  switch (kind) {
    case "report":
      return "Report export started.";
    case "markdown":
      return "Markdown export started.";
    case "transcript":
      return "Transcript export started.";
    case "json":
      return "JSON export started.";
  }
}
