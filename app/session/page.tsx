"use client";
import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { HomeOverview } from "@/components/session/home-overview";
import { TranscriptView } from "@/components/session/TranscriptView";
import { FilteredList } from "@/components/session/filtered-list";
import { WatchView } from "@/components/session/watch-view";
import { SourceRouter } from "@/lib/client/source-router";
import { PLAYABLE_SOURCE_KINDS } from "@/lib/source-kinds";
import { AIDisclosureFooter } from "@/components/session/AIDisclosureFooter";
import { SessionTimer } from "@/components/session/SessionTimer";
import { TwoPartyDisclosure } from "@/components/session/TwoPartyDisclosure";
import { ClaimsLiveRegion } from "@/components/session/ClaimsLiveRegion";

export default function SessionPage() {
  return (
    <div id="main-content" className="flex flex-1 flex-col">
      <SessionTimer />
      <TwoPartyDisclosure />
      <Suspense>
        <SessionPageInner />
      </Suspense>
      <ClaimsLiveRegion />
      <AIDisclosureFooter />
    </div>
  );
}

function SessionPageInner() {
  const sp = useSearchParams();
  const view = sp.get("view") || "overview";
  const startedAt = useSession((s) => s.startedAt);
  const sourceKind = useSession((s) => s.source.kind);
  const router = useRouter();

  const shouldRedirect = view === "watch" && !PLAYABLE_SOURCE_KINDS.has(sourceKind);

  useEffect(() => {
    if (shouldRedirect) {
      router.replace("/session?view=overview");
    }
  }, [shouldRedirect, router]);

  if (!startedAt) {
    return <SourceRouter />;
  }

  if (shouldRedirect) {
    return null;
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
