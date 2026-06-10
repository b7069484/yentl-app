import type { ReviewFlag } from "@/lib/types";

export function createUserDisputeFlag(note: string): ReviewFlag {
  return {
    status: "disputed",
    reason: "user_dispute",
    note,
    at: Date.now(),
  };
}

export function ReviewFlagPanel({
  label,
  review,
}: {
  label: "Claim" | "Marker";
  review: ReviewFlag;
}) {
  return (
    <div
      data-testid="review-flag-panel"
      className="rounded-2xl border border-orange/25 bg-orange-soft px-5 py-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-orange">
            Human review
          </div>
          <div className="mt-1 font-serif text-[18px] font-medium leading-tight text-ink-2">
            {label} disputed
          </div>
        </div>
        <span className="rounded-full border border-orange/25 bg-paper px-2.5 py-1 text-[10.5px] font-semibold text-orange">
          Needs review
        </span>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-3">
        {review.note}
      </p>
    </div>
  );
}
