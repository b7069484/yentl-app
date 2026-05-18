"use client";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useSession } from "@/lib/client/session-store";

const THIRTY_MINUTES_MS = 30 * 60 * 1000;

export function SessionTimer() {
  const { isRecording, startedAt } = useSession();
  const fired = useRef(false);

  useEffect(() => {
    if (!isRecording || !startedAt) return;

    fired.current = false;
    const sessionStart = new Date(startedAt).getTime();

    const id = setInterval(() => {
      if (!isRecording) return;
      const elapsed = Date.now() - sessionStart;
      if (elapsed >= THIRTY_MINUTES_MS && !fired.current) {
        fired.current = true;
        toast("Still rolling at 30:00. Pause anytime.");
      }
    }, 1000);

    return () => clearInterval(id);
  }, [isRecording, startedAt]);

  return null;
}
