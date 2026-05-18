"use client";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { consentCopy } from "@/lib/copy/consent";
import {
  writeConsent,
  type ConsentRecord,
} from "@/lib/client/consent-ledger";

type Props = {
  open: boolean;
  onConfirm: (record: ConsentRecord) => void;
  onCancel: () => void;
};

// First-run consent modal. Required: mic + AI + search + age affirmation.
// Optional: analytics. Cancel dismisses without recording; the user can't
// proceed to a session without the four required boxes.
export function ConsentGate({ open, onConfirm, onCancel }: Props) {
  const [mic, setMic] = useState(false);
  const [ai, setAi] = useState(false);
  const [search, setSearch] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [age, setAge] = useState(false);

  const canSubmit = mic && ai && search && age;

  const submit = () => {
    const record = writeConsent({
      mic_stt: mic,
      ai_analysis: ai,
      web_search: search,
      analytics,
      age_13_plus: age,
    });
    onConfirm(record);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onCancel();
      }}
    >
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="text-lg">{consentCopy.title}</DialogTitle>
          <DialogDescription>{consentCopy.lede}</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <ConsentCheckbox
            checked={mic}
            onChange={setMic}
            label={consentCopy.required.mic.label}
            why={consentCopy.required.mic.why}
            required
          />
          <ConsentCheckbox
            checked={ai}
            onChange={setAi}
            label={consentCopy.required.ai.label}
            why={consentCopy.required.ai.why}
            required
          />
          <ConsentCheckbox
            checked={search}
            onChange={setSearch}
            label={consentCopy.required.search.label}
            why={consentCopy.required.search.why}
            required
          />
        </div>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
            {consentCopy.sensitive.title}
          </p>
          <p className="mt-1 text-sm text-amber-900">
            {consentCopy.sensitive.body}
          </p>
        </div>

        <div className="space-y-2 border-t pt-3">
          <ConsentCheckbox
            checked={analytics}
            onChange={setAnalytics}
            label={consentCopy.optional.analytics.label}
            why={consentCopy.optional.analytics.why}
          />
          <ConsentCheckbox
            checked={age}
            onChange={setAge}
            label={consentCopy.age}
            required
          />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {consentCopy.recording}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {consentCopy.cta.cancel}
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            {consentCopy.cta.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ConsentCheckbox({
  checked,
  onChange,
  label,
  why,
  required,
}: {
  checked: boolean;
  onChange: (b: boolean) => void;
  label: string;
  why?: string;
  required?: boolean;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50",
        checked && "border-blue-600 bg-blue-50/60",
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 cursor-pointer accent-blue-600"
        aria-required={required}
      />
      <div className="flex-1">
        <div className="text-sm font-medium">
          {label}
          {required && (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              (required)
            </span>
          )}
        </div>
        {why && (
          <p className="mt-1 text-xs leading-snug text-muted-foreground">
            {why}
          </p>
        )}
      </div>
    </label>
  );
}
