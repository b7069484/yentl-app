"use client";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { HomeOverview } from "@/components/session/home-overview";
import { TranscriptView } from "@/components/session/TranscriptView";
import { FilteredList } from "@/components/session/filtered-list";
import { WatchView } from "@/components/session/watch-view";
import { SourceRouter } from "@/lib/client/source-router";

export default function SessionPage() {
  return (
    <Suspense>
      <SessionPageInner />
    </Suspense>
  );
}

function SessionPageInner() {
  const sp = useSearchParams();
  const view = sp.get("view") || "overview";
  const startedAt = useSession((s) => s.startedAt);

  if (!startedAt) {
    return <SourceRouter />;
  }

  switch (view) {
    case "transcript":
      return <TranscriptView variant="compact" />;
    case "claims":
    case "markers":
      return <FilteredList />;
    case "watch":
      return <WatchView />;
    case "overview":
    default:
      return <HomeOverview />;
  }
}
