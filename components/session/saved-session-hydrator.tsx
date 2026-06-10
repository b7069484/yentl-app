"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { loadSession } from "@/lib/client/session-storage";
import { loadCloudSession } from "@/lib/client/session-sync";
import { useSession } from "@/lib/client/session-store";

type Props = {
  restoreId: string | null;
  children: ReactNode;
};

type RestoreState =
  | { state: "idle"; id: null }
  | { state: "loading"; id: string }
  | { state: "ready"; id: string }
  | { state: "error"; id: string; message: string };

export function SavedSessionHydrator({ restoreId, children }: Props) {
  const restoreSession = useSession((s) => s.restoreSession);
  const [restoreState, setRestoreState] = useState<RestoreState>({ state: "idle", id: null });
  const appliedId = useRef<string | null>(null);

  useEffect(() => {
    if (!restoreId || appliedId.current === restoreId) return;
    let cancelled = false;
    const id = restoreId;

    async function restoreSavedSession() {
      setRestoreState({ state: "loading", id });
      try {
        let saved;
        try {
          saved = await loadSession(id);
        } catch {
          const cloud = await loadCloudSession(id);
          if (!cloud.ok) throw new Error(cloud.message);
          saved = cloud.data;
        }
        if (cancelled) return;
        restoreSession({
          ...saved.session,
          title: saved.name || saved.session.title,
        });
        appliedId.current = id;
        setRestoreState({ state: "ready", id });
      } catch (error) {
        if (cancelled) return;
        setRestoreState({
          state: "error",
          id,
          message: error instanceof Error ? error.message : "Could not restore this saved session.",
        });
      }
    }

    void restoreSavedSession();

    return () => {
      cancelled = true;
    };
  }, [restoreId, restoreSession]);

  if (!restoreId || restoreState.state === "ready") return <>{children}</>;

  if (restoreState.state === "error") {
    return (
      <main id="main-content" className="min-h-screen bg-cream text-ink">
        <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
          <p className="text-xs font-semibold uppercase text-ink-4">TV room mode</p>
          <h1 className="mt-4 font-serif text-[44px] font-medium leading-tight text-ink">
            Saved session not found.
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-ink-3">
            Yentl could not open that saved session locally or in account sync.
            It may have been deleted, saved in another browser without sync, or
            cleared with site data.
          </p>
          <div className="mt-5 rounded-lg border border-red-soft bg-red-soft px-4 py-3 text-sm text-red">
            {restoreState.message}
          </div>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/sessions"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-paper px-4 text-sm font-semibold text-ink-2 hover:bg-cream-2"
            >
              Open saved sessions
            </Link>
            <Link
              href="/tv"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-teal px-4 text-sm font-semibold text-white hover:bg-teal-2"
            >
              Open room mode
            </Link>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="min-h-screen bg-cream text-ink">
      <section className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
        <p className="text-xs font-semibold uppercase text-ink-4">TV room mode</p>
        <h1 className="mt-4 font-serif text-[44px] font-medium leading-tight text-ink">
          Opening saved session.
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-ink-3">
          Yentl is loading the saved transcript, claims, source evidence, and
          rhetoric markers into the room display.
        </p>
      </section>
    </main>
  );
}
