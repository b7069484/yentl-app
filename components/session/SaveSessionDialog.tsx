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
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const defaultName =
    title?.trim() ||
    (startedAt
      ? `Session @ ${new Date(startedAt).toLocaleString()}`
      : `Session @ ${new Date().toLocaleString()}`);

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && !name) {
      setName(defaultName);
      setSaved(false);
    }
    if (!isOpen) onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const session = useSession.getState().toSession();
      await saveSession(session, { name: name.trim() || defaultName });
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        setName("");
        onClose();
      }, 800);
    } catch {
      // ignore — user can retry
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save session</DialogTitle>
          <DialogDescription>
            Sessions are saved locally in your browser. They survive page
            reloads but are lost if you clear your browser data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Name
            </span>
            <input
              type="text"
              value={name || defaultName}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => {
                if (!name) setName(defaultName);
                e.target.select();
              }}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring"
              aria-label="Session name"
              disabled={saving || saved}
            />
          </label>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || saved}>
            {saved ? "Saved ✓" : saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
