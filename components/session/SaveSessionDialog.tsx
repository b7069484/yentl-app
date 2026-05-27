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
import { useSession } from "@/lib/client/session-store";
import { saveSession } from "@/lib/client/session-storage";

export function SaveSessionDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const title = useSession((s) => s.title);
  const startedAt = useSession((s) => s.startedAt);
  const transcriptCount = useSession((s) => s.transcript.length);
  const claimCount = useSession((s) => s.claims.length);
  const markerCount = useSession((s) => s.markers.length);
  const synthesis = useSession((s) => s.synthesis);
  const devilAdvocate = useSession((s) => s.devilAdvocate);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasSynthesis =
    synthesis?.state === "fresh" ||
    synthesis?.state === "refreshing" ||
    (synthesis?.state === "error" && !!synthesis.text);
  const hasDevilAdvocate =
    devilAdvocate?.state === "fresh" ||
    devilAdvocate?.state === "refreshing" ||
    (devilAdvocate?.state === "error" && !!devilAdvocate.brief);
  const hasUsefulContent =
    transcriptCount > 0 ||
    claimCount > 0 ||
    markerCount > 0 ||
    hasSynthesis ||
    hasDevilAdvocate;

  const defaultName =
    title?.trim() ||
    (startedAt
      ? `Session @ ${new Date(startedAt).toLocaleString()}`
      : `Session @ ${new Date().toLocaleString()}`);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !name) {
      setName(defaultName);
      setSaved(false);
      setError(null);
    }
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const session = useSession.getState().toSession();
      await saveSession(session, { name: name.trim() || defaultName });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setName("");
        onClose();
      }, 800);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Yentl could not save this snapshot in this browser. Try again or export a file.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save local snapshot</DialogTitle>
          <DialogDescription>
            Saves stay in this browser&apos;s local library. They survive page
            reloads, but they do not sync to another device and can be removed
            if you clear browser data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {!hasUsefulContent ? (
            <p className="rounded-md border border-dashed border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
              Nothing useful has been captured yet. Save appears after Yentl has
              transcript, claims, markers, or a report brief to preserve.
            </p>
          ) : (
            <div className="rounded-md border border-border/70 bg-card/60 px-3 py-2 text-xs text-muted-foreground">
              This snapshot includes {transcriptCount} transcript line
              {transcriptCount === 1 ? "" : "s"}, {claimCount} claim
              {claimCount === 1 ? "" : "s"}, {markerCount} marker
              {markerCount === 1 ? "" : "s"}
              {hasSynthesis ? ", the current summary" : ""}
              {hasDevilAdvocate ? ", and Devil's Advocate" : ""}.
            </div>
          )}
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Name
            </span>
            <input
              type="text"
              value={name || defaultName}
              onChange={(e) => {
                setError(null);
                setName(e.target.value);
              }}
              onFocus={(e) => {
                if (!name) setName(defaultName);
                e.target.select();
              }}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Session name"
              disabled={saving || saved || !hasUsefulContent}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-md border border-red-soft bg-red-soft px-3 py-2 text-sm text-red">
              {error}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || saved || !hasUsefulContent}>
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
