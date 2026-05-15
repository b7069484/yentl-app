"use client";

import { useRouter } from "next/navigation";
import { useSession } from "@/lib/client/session-store";
import { getEntry } from "@/lib/taxonomy";
import { MarkerLearnMore } from "./marker-learn-more";
import { ClaimLearnMore } from "./claim-learn-more";

// ─── NotFound ─────────────────────────────────────────────────────────────────

function NotFound({
  onBack,
  message,
}: {
  onBack: () => void;
  message: string;
}) {
  return (
    <div className="px-6 pt-12 pb-12 max-w-[820px] mx-auto text-center">
      <div className="font-serif text-[20px] text-ink-2">{message}</div>
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-1.5 mt-5 px-4 py-2 text-[12px] bg-paper border border-line rounded-lg hover:bg-cream-2 transition-colors"
      >
        ← Go back
      </button>
    </div>
  );
}

// ─── LearnMore ────────────────────────────────────────────────────────────────

export function LearnMore({
  type,
  id,
}: {
  type: "marker" | "claim";
  id: string;
}) {
  const router = useRouter();
  const claims = useSession((s) => s.claims);
  const markers = useSession((s) => s.markers);
  const speakers = useSession((s) => s.speakers);

  if (type === "marker") {
    const entry = getEntry(id);
    if (!entry) {
      return (
        <NotFound
          onBack={() => router.back()}
          message="Unknown marker pattern."
        />
      );
    }
    const occurrences = markers.filter((m) => m.name === id);
    return (
      <MarkerLearnMore
        entry={entry}
        occurrences={occurrences}
        speakers={speakers}
        onBack={() => router.back()}
      />
    );
  }

  // type === "claim"
  const claim = claims.find((c) => c.id === id);
  if (!claim) {
    return (
      <NotFound
        onBack={() => router.back()}
        message="This claim isn't in the current session."
      />
    );
  }
  return (
    <ClaimLearnMore
      claim={claim}
      claims={claims}
      speakers={speakers}
      onBack={() => router.back()}
    />
  );
}
