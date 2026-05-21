"use client";

import Link from "next/link";
import { ArrowLeft, FlaskConical, Workflow } from "lucide-react";
import { UxFlowDashboard } from "@/components/session/ux-flow-dashboard";

export default function ProjectFlowsPage() {
  return (
    <main className="min-h-screen bg-cream text-ink">
      <header className="border-b border-line-soft bg-paper">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-4">
              <Workflow className="h-3.5 w-3.5" aria-hidden />
              Project workspace
            </div>
            <h1 className="font-serif text-[28px] leading-tight text-ink">
              Yentl UX flow atlas
            </h1>
            <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-3">
              Internal product-planning wireframes and critique notes. This is
              intentionally separate from the end-user session experience.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Link
              href="/project/validation"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-teal px-3 py-2 text-[13px] font-medium text-white shadow-sm hover:bg-teal-2"
            >
              <FlaskConical className="h-4 w-4" aria-hidden />
              Validation lab
            </Link>
            <Link
              href="/session"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-line bg-cream px-3 py-2 text-[13px] font-medium text-ink-2 shadow-sm hover:bg-cream-2"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to app
            </Link>
          </div>
        </div>
      </header>
      <UxFlowDashboard />
    </main>
  );
}
