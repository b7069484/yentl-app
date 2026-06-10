import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "sonner";
import { SkipToContent } from "@/components/ui/skip-to-content";
import "./globals.css";

export const metadata: Metadata = {
  applicationName: "Yentl",
  title: "Yentl — Live fact-check & rhetoric analysis",
  description:
    "Listen, check, learn. Yentl transcribes the conversation, scores every claim against the open web, and surfaces the biases and fallacies tucked into the rhetoric in real time.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/yentl-mark.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
  },
  appleWebApp: {
    capable: true,
    title: "Yentl",
    statusBarStyle: "default",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkConfigured = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const document = (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        <SkipToContent />
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );

  if (!clerkConfigured) {
    return document;
  }

  return <ClerkProvider>{document}</ClerkProvider>;
}
