"use client";
import { useState } from "react";
import { ulid } from "ulid";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const REPORT_CATEGORIES = [
  "Wrong verdict",
  "Bad sources",
  "Harmful content",
  "Other",
] as const;

type ReportCategory = (typeof REPORT_CATEGORIES)[number];

interface ReportRecord {
  report_id: string;
  category: ReportCategory;
  note: string;
  verdict_ref: string;
  timestamp_iso: string;
}

const STORAGE_KEY = "yentl.reports";

function persistReport(record: ReportRecord) {
  const existing: ReportRecord[] = JSON.parse(
    localStorage.getItem(STORAGE_KEY) ?? "[]"
  );
  existing.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function ReportFlow({
  open,
  onClose,
  verdictRef,
}: {
  open: boolean;
  onClose: () => void;
  verdictRef?: string;
}) {
  const [category, setCategory] = useState<ReportCategory | "">("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    if (!category) {
      setError("Please select a category.");
      return;
    }
    persistReport({
      report_id: ulid(),
      category: category as ReportCategory,
      note,
      verdict_ref: verdictRef ?? "",
      timestamp_iso: new Date().toISOString(),
    });
    setCategory("");
    setNote("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this verdict</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">
              What went wrong?
            </legend>
            <div className="space-y-2">
              {REPORT_CATEGORIES.map((cat) => (
                <label key={cat} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="report-category"
                    value={cat}
                    checked={category === cat}
                    onChange={() => {
                      setCategory(cat);
                      setError("");
                    }}
                    className="h-4 w-4"
                  />
                  {cat}
                </label>
              ))}
            </div>
            {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
          </fieldset>
          <div>
            <label htmlFor="report-note" className="mb-1 block text-sm font-medium">
              What went wrong? (optional)
            </label>
            <textarea
              id="report-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe the issue..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit}>Submit report</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
