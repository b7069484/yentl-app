import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-cream">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-7 px-8 py-16 text-center">
        {/* Plain <img> intentionally — Next.js Image optimizer through
            /_next/image was returning a sandboxed CSP response that some
            browsers refused to render. The raw PNG is 1.2MB but it's the
            only image on the landing page, so the cost is acceptable. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/yenta-y-mark.png"
          alt="Yentl"
          width={600}
          height={340}
          className="h-32 w-auto md:h-40"
        />

        <div className="inline-flex items-baseline font-serif text-[44px] font-medium leading-none tracking-tight text-ink md:text-[56px]">
          <span>yentl</span>
          <span aria-hidden className="yentl-dot ml-2 inline-block h-2.5 w-2.5 self-baseline md:ml-2.5 md:h-3 md:w-3" />
        </div>

        <h1 className="font-serif text-[48px] font-medium leading-none tracking-tight text-ink md:text-[68px]">
          speak <span className="italic text-teal-2">truth</span>.
        </h1>

        <p className="max-w-prose text-[15.5px] leading-relaxed text-ink-3 md:text-[17px]">
          A live fact-checker for any conversation. Yentl transcribes in real
          time, separates speakers, scores every claim against the open web,
          and surfaces the biases and fallacies tucked into the rhetoric.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <Link
            href="/session"
            className="inline-flex items-center gap-2 rounded-xl bg-teal px-6 py-3.5 text-[15px] font-medium text-white shadow-md transition-colors hover:bg-teal-2"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            Start a session
          </Link>
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 rounded-xl border border-line px-5 py-3 text-[14px] font-medium text-ink-2 transition-colors hover:bg-cream-2 hover:text-ink"
          >
            Sessions library
          </Link>
          <span className="text-[12.5px] text-ink-4">
            Multi-speaker · English · Browser mic
          </span>
        </div>

        <ul className="mt-3 grid w-full max-w-2xl grid-cols-1 gap-x-8 gap-y-2.5 pt-4 text-left text-[13.5px] text-ink-3 sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <span className="font-mono text-ink-4">01</span>
            Real-time transcription
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-ink-4">02</span>
            Cited fact-check verdicts
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-ink-4">03</span>
            123 bias &amp; fallacy detectors
          </li>
        </ul>
      </section>
    </main>
  );
}
