"use client";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

const FLAG_KEY = "yentl.two_party_seen";

export function TwoPartyDisclosure() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(FLAG_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(FLAG_KEY, "1");
    setVisible(false);
  };

  return (
    <div
      role="banner"
      className="flex items-start gap-3 border-b bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p className="flex-1">
        Heads up — recording the people around you may need their consent.
        Yentl doesn&apos;t know where you are; you do.
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss consent reminder"
        className="shrink-0 rounded p-0.5 hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-700"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
