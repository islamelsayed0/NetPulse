import { npDebug } from "@/lib/netpulse-runtime-debug";

/** Canonical site URL for metadata and sitemap (no trailing slash). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    let candidate = raw.replace(/\/$/, "");
    if (!/^https?:\/\//i.test(candidate)) {
      // #region agent log
      npDebug("H1", "lib/site-url.ts:host-only-explicit", {
        normalizedHttps: true,
        len: candidate.length,
      });
      // #endregion
      candidate = `https://${candidate}`;
    }
    try {
      new URL(candidate);
      return candidate;
    } catch {
      // #region agent log
      npDebug("H1", "lib/site-url.ts:explicit-invalid-fallback", {
        len: candidate.length,
      });
      // #endregion
    }
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
