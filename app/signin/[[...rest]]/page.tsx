import Link from "next/link";
import { SignIn } from "@clerk/nextjs";
import { ChevronLeft } from "lucide-react";

const YMark = ({
  className,
  height = 24,
}: {
  className?: string;
  height?: number;
}) => (
  <svg
    className={className}
    viewBox="0 0 1400 1400"
    width={height}
    height={height}
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
);

const InlineWordmark = ({ size = 24 }: { size?: number }) => (
  <span
    className="inline-flex items-baseline font-serif font-medium tracking-[-.02em] text-ink"
    style={{
      fontSize: `${size}px`,
      fontVariationSettings: "'opsz' 36, 'SOFT' 50",
      whiteSpace: "nowrap",
    }}
  >
    <YMark
      className="mr-[6px] translate-y-[2px] text-teal"
      height={Math.round(size * 0.95)}
    />
    yentl
    <span
      aria-hidden
      className="mx-[1px] inline-block h-[5px] w-[5px] -translate-y-[2px] rounded-full bg-amber"
    />
    <span className="font-normal text-ink-3">it</span>
  </span>
);

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#E2DDC9] px-4 py-6 sm:py-12">
      {/* Phone-frame container */}
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

        {/* Small brand + welcome-back kicker */}
        <div className="flex flex-col items-center px-5 pt-2.5 pb-1">
          <InlineWordmark size={24} />
          <p
            className="mt-1 font-serif text-[13px] italic leading-tight tracking-[0.005em] text-ink-3"
            style={{ fontVariationSettings: "'opsz' 14, 'SOFT' 80" }}
          >
            Welcome back.
          </p>
        </div>

        {/* Headline with inline brand mark */}
        <div className="px-5 pt-4 text-center">
          <h1
            className="font-serif text-[28px] font-medium leading-[1.12] tracking-[-.02em] text-ink"
            style={{ fontVariationSettings: "'opsz' 48, 'SOFT' 50" }}
          >
            Sign in to <InlineWordmark size={28} />
          </h1>
          <p className="mt-2 text-[14px] leading-[1.45] text-ink-3">
            We&rsquo;ll email you a magic link.
          </p>
        </div>

        {/* Clerk SignIn — themed to match V3.18 scaffold */}
        <div className="flex flex-1 flex-col px-5 pt-5 pb-7">
          <SignIn
            routing="path"
            path="/signin"
            signUpUrl="/signup"
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
                formFieldRow:
                  "rounded-[14px] border border-line bg-[#F0EAD6] p-4 shadow-[0_1px_0_rgba(20,23,31,.02),0_4px_14px_rgba(20,23,31,.04)]",
                formField: "gap-2",
                formFieldLabel:
                  "!block !font-mono !text-[10px] !font-semibold uppercase !tracking-[.1em] !text-ink-4",
                formFieldLabelRow: "!block",
                formFieldInput:
                  "h-[52px] w-full rounded-[11px] border-[1.5px] border-teal bg-white px-[14px] font-mono text-[14px] tracking-[.005em] text-ink shadow-[0_0_0_4px_rgba(37,99,235,.18)] outline-none placeholder:font-mono placeholder:text-ink-5",
                formButtonPrimary:
                  "mx-auto mt-3 flex h-[48px] !w-[220px] items-center justify-center gap-2 !rounded-[24px] !border-none !bg-gradient-to-b !from-red !to-[#B91C1C] text-[15px] !font-semibold !tracking-[-.005em] !text-white !shadow-[0_6px_16px_rgba(185,28,28,.32),inset_0_1px_0_rgba(255,255,255,.18)] transition-all hover:!-translate-y-px hover:!shadow-[0_8px_20px_rgba(185,28,28,.38),inset_0_1px_0_rgba(255,255,255,.2)] !normal-case",
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
            Links expire in 10 minutes.
          </p>

          {/* Two-row footer */}
          <div className="mt-auto flex flex-col items-center gap-2 pt-5 text-center">
            <p className="text-[13px] leading-[1.4] text-ink-3">
              Don&rsquo;t have an account?
              <Link
                href="/signup"
                className="ml-1 whitespace-nowrap font-semibold text-teal hover:underline"
              >
                Make one →
              </Link>
            </p>
            <Link
              href="/about#help"
              className="text-[12px] font-medium text-ink-4 hover:text-ink-3 hover:underline"
            >
              Trouble signing in? →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
