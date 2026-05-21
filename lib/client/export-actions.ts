"use client";

import { toJSON } from "@/lib/export/json";
import { toMarkdown } from "@/lib/export/markdown";
import { toReport } from "@/lib/export/report";
import type { Session } from "@/lib/types";

export type SessionExportKind = "report" | "markdown" | "json";

export function fileSafe(value: string) {
  return (value || "yentl-session").replace(/[^\w-]+/g, "_").slice(0, 60);
}

export function downloadFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function openReport(session: Session) {
  const content = toReport(session);
  const blob = new Blob([content], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (!win) {
    downloadFile(`${fileSafe(session.title || "yentl-report")}.html`, content, "text/html");
  }
}

export function exportSession(session: Session, kind: SessionExportKind) {
  const stem = fileSafe(session.title || "yentl-session");
  if (kind === "report") {
    openReport(session);
  } else if (kind === "markdown") {
    downloadFile(`${stem}.md`, toMarkdown(session), "text/markdown");
  } else {
    downloadFile(`${stem}.json`, toJSON(session), "application/json");
  }
}
