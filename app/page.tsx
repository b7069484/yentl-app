import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col bg-background">
      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-8 px-8 py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
          Live fact-check & rhetoric analysis
        </span>
        <h1 className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight text-foreground sm:text-6xl">
          Hear what's said.
          <br />
          See what's <span className="text-red-600">true</span>.
        </h1>
        <p className="max-w-prose text-lg leading-relaxed text-muted-foreground">
          Speak, paste, or play audio. Factify transcribes in real time, grades
          each claim against the open web, and surfaces the biases and
          fallacies tucked into the rhetoric.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild size="lg" className="px-6">
            <Link href="/session">Start a session</Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Single speaker · English · Browser mic
          </span>
        </div>
        <ul className="mt-2 grid w-full max-w-2xl grid-cols-1 gap-x-8 gap-y-2 text-sm text-muted-foreground sm:grid-cols-3">
          <li className="flex items-center gap-2">
            <span className="font-mono text-foreground/80">01</span>
            Real-time transcription
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-foreground/80">02</span>
            Cited fact-check verdicts
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-foreground/80">03</span>
            123 bias & fallacy detectors
          </li>
        </ul>
      </section>
    </main>
  );
}
