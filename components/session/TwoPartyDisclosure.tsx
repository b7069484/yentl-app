"use client";
import { useSyncExternalStore } from "react";
import { X } from "lucide-react";

const FLAG_KEY = "yentl.two_party_seen";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === FLAG_KEY) callback();
  };

  listeners.add(callback);
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot() {
  if (typeof window === "undefined") return false;
  return !window.localStorage.getItem(FLAG_KEY);
}

function getServerSnapshot() {
  return false;
}

function notifyDisclosureListeners() {
  for (const listener of listeners) listener();
}

export function TwoPartyDisclosure() {
  const visible = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(FLAG_KEY, "1");
    notifyDisclosureListeners();
  };

  return (
    <div
      role="banner"
      className="px-4 pt-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-[1120px] items-start gap-3 rounded-lg border border-amber/35 bg-amber-50/95 px-4 py-3 text-sm text-amber-900 shadow-sm">
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
    </div>
  );
}
