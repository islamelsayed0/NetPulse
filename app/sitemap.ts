import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const now = new Date();
  return [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/status`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/docs`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${base}/sign-in`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/sign-up`, lastModified: now, changeFrequency: "yearly", priority: 0.4 },
  ];
}
