import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { npDebug } from "@/lib/netpulse-runtime-debug";
import { getSiteUrl } from "@/lib/site-url";
import { cn } from "@/lib/utils";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const site = getSiteUrl();
const explicitSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
// #region agent log
try {
  new URL(site);
  npDebug("H1", "app/layout.tsx:metadata-eval", {
    metadataBaseParseOk: true,
    explicitLen: explicitSite?.length ?? 0,
    explicitHasProtocol: explicitSite
      ? /^https?:\/\//i.test(explicitSite)
      : false,
    computedSiteLen: site.length,
    hasVercelUrl: Boolean(process.env.VERCEL_URL),
    hasClerkPk: Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
    ),
    hasClerkSecret: Boolean(process.env.CLERK_SECRET_KEY?.trim()),
  });
} catch (e) {
  npDebug("H1", "app/layout.tsx:metadata-eval", {
    metadataBaseParseOk: false,
    errorName: e instanceof Error ? e.name : "unknown",
    explicitLen: explicitSite?.length ?? 0,
    explicitHasProtocol: explicitSite
      ? /^https?:\/\//i.test(explicitSite)
      : false,
    computedSiteLen: site.length,
    sitePrefix: site.slice(0, 24),
    hasVercelUrl: Boolean(process.env.VERCEL_URL),
    hasClerkPk: Boolean(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()
    ),
    hasClerkSecret: Boolean(process.env.CLERK_SECRET_KEY?.trim()),
  });
  throw e;
}
// #endregion

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
  return (
    <html lang="en" className={cn("font-sans", inter.variable)}>
      <body className="min-h-screen antialiased">
        <ClerkProvider>
          {children}
          <Toaster />
        </ClerkProvider>
      </body>
    </html>
  );
}
