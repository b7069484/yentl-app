import { ReactNode } from "react";

export function PhoneFrame({
  children,
  innerBg = "bg-cream",
}: {
  children: ReactNode;
  innerBg?: string;
}) {
  return (
    <div className="flex min-h-screen items-start justify-center bg-[#E2DDC9] px-4 py-6 sm:py-12">
      <div
        className={`relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-line/60 shadow-[0_30px_60px_rgba(0,0,0,.18)] ${innerBg}`}
      >
        {children}
      </div>
    </div>
  );
}

export function YouTubeModePill() {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-[#FF003319] px-3 py-1.5 text-[11.5px] font-semibold tracking-[-.01em] text-[#B91C1C]">
      <span className="relative inline-flex h-2.5 w-3.5 items-center justify-center rounded-[3px] bg-[#FF0033]">
        <span
          aria-hidden
          className="absolute left-[5px] top-1/2 -translate-y-1/2"
          style={{
            borderStyle: "solid",
            borderWidth: "3px 0 3px 5px",
            borderColor: "transparent transparent transparent #fff",
          }}
        />
      </span>
      YouTube
    </div>
  );
}
