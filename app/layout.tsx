import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const site = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: {
    default: "NetPulse",
    template: "%s | NetPulse",
  },
  description:
    "Professional IT operations command center for uptime, incidents, alerting, and team visibility.",
  keywords: [
    "uptime monitoring",
    "IT operations",
    "incident management",
    "SRE",
    "status page",
    "NetPulse",
  ],
  authors: [{ name: "NetPulse" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: site,
    siteName: "NetPulse",
    title: "NetPulse — IT Operations Command Center",
    description:
      "Monitor uptime, triage incidents, and alert your team from one Carbon & Cyan operations surface.",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "NetPulse — IT operations monitoring",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NetPulse — IT Operations Command Center",
    description:
      "Monitor uptime, triage incidents, and alert your team from one professional dashboard.",
    images: ["/opengraph-image"],
  },
  icons: {
    icon: "/icon",
    apple: "/icon",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // #region agent log
  fetch("http://127.0.0.1:7838/ingest/1763dc2b-6641-47a8-a74d-209daff78414", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "5c64e3",
    },
    body: JSON.stringify({
      sessionId: "5c64e3",
      location: "layout.tsx:RootLayout",
      message: "root layout render",
      data: { siteLen: site.length },
      timestamp: Date.now(),
      hypothesisId: "H2",
    }),
  }).catch(() => {});
  // #endregion
  return (
    <html
      lang="en"
      className={cn("font-sans", inter.variable)}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased" suppressHydrationWarning>
        <ClerkProvider>
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
