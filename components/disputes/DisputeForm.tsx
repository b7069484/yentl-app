"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

type SubmitState =
  | { kind: "idle" }
  | { kind: "submitting" }
  | { kind: "success"; id: string }
  | { kind: "error"; message: string };

export function DisputeForm({
  sessionId,
  claimId,
}: {
  sessionId: string;
  claimId: string | null;
}) {
  const [email, setEmail] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [correction, setCorrection] = useState("");
  const [state, setState] = useState<SubmitState>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState({ kind: "submitting" });

    try {
      const res = await fetch("/api/disputes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          claimId: claimId ?? undefined,
          disputerEmail: email,
          evidenceUrl: evidenceUrl || undefined,
          correctionRequested: correction,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setState({
          kind: "error",
          message:
            (body as { error?: string }).error ?? `Submit failed (${res.status})`,
        });
        return;
      }

      const { id } = (await res.json()) as { id: string };
      setState({ kind: "success", id });
    } catch (err) {
      setState({
        kind: "error",
        message: err instanceof Error ? err.message : "Submit failed",
      });
    }
  }

  if (state.kind === "success") {
    return (
      <div
        role="status"
        className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-900"
      >
        <p className="font-semibold">Thanks — we&apos;ll review.</p>
        <p className="mt-1 text-sm">
          Your dispute is logged as <code className="rounded bg-white/60 px-1">{state.id}</code>.
          If a correction lands, it&apos;ll appear at{" "}
          <a className="underline" href="/corrections">
            /corrections
          </a>{" "}
          and the verdict card will be flagged.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {claimId && (
        <p className="rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          Disputing claim <code className="font-mono">{claimId}</code>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dispute-email" className="text-sm font-medium text-foreground">
          Your email <span className="text-red-600">*</span>
        </label>
        <input
          id="dispute-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <p className="text-xs text-muted-foreground">
          So we can follow up if we need clarification.
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dispute-evidence" className="text-sm font-medium text-foreground">
          Evidence URL <span className="text-muted-foreground">(optional)</span>
        </label>
        <input
          id="dispute-evidence"
          type="url"
          placeholder="https://example.com/the-source-that-proves-us-wrong"
          value={evidenceUrl}
          onChange={(e) => setEvidenceUrl(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="dispute-correction" className="text-sm font-medium text-foreground">
          What should we correct? <span className="text-red-600">*</span>
        </label>
        <textarea
          id="dispute-correction"
          required
          minLength={10}
          maxLength={4000}
          rows={6}
          value={correction}
          onChange={(e) => setCorrection(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm"
          placeholder="Tell us specifically what's wrong and what it should say instead."
        />
      </div>

      {state.kind === "error" && (
        <p role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
          {state.message}
        </p>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={state.kind === "submitting"}>
          {state.kind === "submitting" ? "Submitting…" : "Submit dispute"}
        </Button>
      </div>
    </form>
  );
}
