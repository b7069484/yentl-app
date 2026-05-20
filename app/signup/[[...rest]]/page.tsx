import Link from "next/link";
import { SignUp } from "@clerk/nextjs";
import { ChevronLeft, Check } from "lucide-react";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E2DDC9] px-4 py-6 sm:py-12">
      {/* Phone-frame container ~393px wide on mobile, expands slightly on desktop */}
      <div className="relative flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] border border-line/60 bg-cream shadow-[0_30px_60px_rgba(0,0,0,.18)]">
        {/* Back chevron */}
        <div className="flex items-center px-5 pt-4">
          <Link
            href="/"
            aria-label="Back"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-cream-2 hover:text-ink"
          >
            <ChevronLeft className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Brand block */}
        <div className="flex flex-col items-center px-5 pt-3 pb-1.5">
          <span
            className="inline-flex items-baseline font-serif text-[24px] font-medium leading-none tracking-[-.02em] text-ink"
            style={{ fontVariationSettings: "'opsz' 36, 'SOFT' 50" }}
          >
            <svg
              className="mr-[7px] h-6 w-6 translate-y-[2px] text-teal"
              viewBox="0 0 1400 1400"
              fill="none"
              aria-hidden
            >
              <path
                d="M340 320 L700 720 L1060 320 M700 720 L700 1080"
                stroke="currentColor"
                strokeWidth="160"
                strokeLinecap="round"
              />
            </svg>
            yentl
            <span
              aria-hidden
              className="mx-[1px] inline-block h-[5.5px] w-[5.5px] -translate-y-[3px] rounded-full bg-amber"
            />
            <span className="font-normal text-ink-3">it</span>
          </span>
          <p
            className="mt-1.5 font-serif text-[13px] italic leading-tight tracking-[0.005em] text-ink-3"
            style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 80" }}
          >
            Don&rsquo;t argue. Yentl it.
          </p>
        </div>

        {/* Headline */}
        <div className="px-5 pt-4 text-center">
          <h1
            className="font-serif text-[28px] font-medium leading-[1.1] tracking-[-.02em] text-ink"
            style={{ fontVariationSettings: "'opsz' 48, 'SOFT' 50" }}
          >
            Make an account.
          </h1>
          <p className="mt-2 text-[14px] leading-[1.45] text-ink-3">
            Free 15 min/month. No credit card.
          </p>
        </div>

        {/* Clerk SignUp form, themed via appearance */}
        <div className="flex flex-1 flex-col px-5 pt-5 pb-7">
          <SignUp
            routing="path"
            path="/signup"
            signInUrl="/signin"
            appearance={{
              variables: {
                colorPrimary: "#B91C1C",
                colorBackground: "transparent",
                colorText: "#14171F",
                colorTextSecondary: "#5B6075",
                colorInputBackground: "#FFFFFF",
                colorInputText: "#14171F",
                fontFamily: "var(--font-inter), sans-serif",
                borderRadius: "12px",
                spacingUnit: "1rem",
              },
              elements: {
                rootBox: "w-full",
                card: "bg-transparent shadow-none border-0 p-0",
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                logoBox: "hidden",
                main: "gap-0",
                form: "gap-3",
                formFieldRow: "rounded-[14px] border border-line bg-[#F0EAD6] p-4 shadow-[0_1px_0_rgba(20,23,31,.02),0_4px_14px_rgba(20,23,31,.04)]",
                formField: "gap-1",
                formFieldLabel: "sr-only",
                formFieldInput:
                  "h-[52px] w-full rounded-[11px] border-[1.5px] border-teal bg-white px-[14px] font-mono text-[14px] tracking-[.005em] text-ink shadow-[0_0_0_4px_rgba(37,99,235,.18)] outline-none placeholder:font-mono placeholder:text-ink-5",
                formButtonPrimary:
                  "mx-auto mt-3 flex h-[48px] !w-[220px] items-center justify-center gap-2 !rounded-[12px] !border-none !bg-gradient-to-b !from-red !to-[#B91C1C] text-[15px] !font-semibold !tracking-[-.005em] !text-white !shadow-[0_4px_12px_rgba(185,28,28,.28),inset_0_1px_0_rgba(255,255,255,.18)] transition-all hover:!-translate-y-px hover:!shadow-[0_6px_16px_rgba(185,28,28,.34),inset_0_1px_0_rgba(255,255,255,.2)] !normal-case",
                dividerBox: "my-4 mx-1",
                dividerLine: "bg-line",
                dividerText:
                  "font-mono text-[11px] font-semibold uppercase tracking-[.14em] text-ink-4",
                socialButtonsBlockButton:
                  "h-[48px] !rounded-[12px] !border !font-semibold !text-[14.5px] !tracking-[-.005em] !shadow-[0_1px_0_rgba(20,23,31,.02),0_2px_8px_rgba(20,23,31,.04)] !normal-case !text-ink data-[provider=apple]:!bg-black data-[provider=apple]:!text-white data-[provider=apple]:!border-black data-[provider=apple]:!shadow-[0_2px_8px_rgba(0,0,0,.18)]",
                socialButtonsBlockButtonText: "!font-semibold",
                footer: "hidden",
                footerAction: "hidden",
                footerActionText: "hidden",
                footerActionLink: "hidden",
                badge: "hidden",
              },
              layout: {
                socialButtonsPlacement: "bottom",
                socialButtonsVariant: "blockButton",
                showOptionalFields: false,
              },
            }}
          />

          {/* Microcopy under OAuth */}
          <p className="mt-3.5 px-1.5 text-center text-[12px] leading-[1.5] tracking-[.005em] text-ink-3">
            We&rsquo;ll send a magic link. No password required for{" "}
            <span className="whitespace-nowrap">first sign-in.</span>
          </p>

          {/* ToS row */}
          <div className="mt-4 flex items-start gap-2.5 rounded-[10px] border border-line-soft bg-[#F0EAD6] px-3 py-2.5">
            <span
              aria-label="Agreed"
              className="mt-px flex h-[18px] w-[18px] flex-shrink-0 items-center justify-center rounded-[5px] bg-teal text-white shadow-[inset_0_0_0_1px_rgba(0,0,0,.05)]"
            >
              <Check className="h-3 w-3" strokeWidth={3} />
            </span>
            <p className="text-[12px] leading-[1.5] tracking-[.005em] text-ink-2">
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-teal underline">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-teal underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>

          {/* Sign-in footer */}
          <p className="mt-auto pt-4 text-center text-[13px] text-ink-3">
            Already have an account?
            <Link
              href="/signin"
              className="ml-1 whitespace-nowrap font-semibold text-teal hover:underline"
            >
              Sign in →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
