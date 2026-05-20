import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Fraunces } from "next/font/google";
import { Toaster } from "sonner";
import { SkipToContent } from "@/components/ui/skip-to-content";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Brand v5.0 wordmark font (WM-A · Editorial Serif).
// Fraunces is a variable serif — we load it as variable so all wght values are
// available via CSS font-weight, plus the SOFT and opsz axes for the wordmark.
// Apply axis values inline at the wordmark site with
//   style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 50" }}.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
});

export const metadata: Metadata = {
  title: "Yentl — Live fact-check & rhetoric analysis",
  description:
    "Listen, check, learn. Yentl transcribes the conversation, scores every claim against the open web, and surfaces the biases and fallacies tucked into the rhetoric in real time.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      localization={{
        formButtonPrimary: "Continue with email →",
        formFieldLabel__emailAddress: "Email",
      }}
    >
      <html
        lang="en"
        className={`${inter.variable} ${fraunces.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
          <SkipToContent />
          {children}
          <Toaster position="bottom-right" />
        </body>
      </html>
    </ClerkProvider>
  );
}
