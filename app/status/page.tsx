import type { Metadata } from "next";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  Database,
  Globe,
  KeyRound,
  ShieldCheck,
  XCircle,
  Zap,
} from "lucide-react";
import { NetPulseLogo } from "@/components/netpulse-logo";
import { PlatformStatusRefresh } from "@/components/status/platform-status-refresh";
import { StatusUptimeHeatmap } from "@/components/status/status-uptime-heatmap";
import {
  loadPlatformStatusPageData,
  type OverallStatus,
} from "@/lib/data/platform-status-page";
import type { PlatformServiceKey } from "@/lib/platform-health/types";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Status",
  description:
    "NetPulse platform availability — web app, API, database, auth, and notifications.",
};

export const revalidate = 60;

const SERVICE_ICONS: Record<PlatformServiceKey, LucideIcon> = {
  web: Globe,
  api: Zap,
  database: Database,
  auth: KeyRound,
  notifications: Bell,
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "—";
  }
}

function overallCopy(overall: OverallStatus): { headline: string; sub: string } {
  switch (overall) {
    case "major":
      return {
        headline: "Major Outage",
        sub: "One or more NetPulse platform components are unavailable.",
      };
    case "partial":
      return {
        headline: "Partial Outage",
        sub: "Some platform services are degraded. We’re on it.",
      };
    default:
      return {
        headline: "All Systems Operational",
        sub: "The NetPulse platform is running normally.",
      };
  }
}

/** Flat banner strip (Vercel/GitHub-style): surface + left accent only. */
function bannerTheme(overall: OverallStatus): {
  borderL: string;
  text: string;
  dot: string;
} {
  switch (overall) {
    case "major":
      return {
        borderL: "border-l-[#f85149]",
        text: "text-[#f85149]",
        dot: "bg-[#f85149]",
      };
    case "partial":
      return {
        borderL: "border-l-[#f0b429]",
        text: "text-[#f0b429]",
        dot: "bg-[#f0b429]",
      };
    default:
      return {
        borderL: "border-l-[#3fb950]",
        text: "text-[#3fb950]",
        dot: "bg-[#3fb950]",
      };
  }
}

function badgeStyles(label: "Operational" | "Degraded" | "Down"): {
  className: string;
  dot: string;
} {
  switch (label) {
    case "Down":
      return {
        className:
          "border-carbon-danger/40 bg-carbon-danger/10 text-carbon-danger shadow-[0_0_20px_-8px_rgba(248,81,73,0.5)]",
        dot: "bg-carbon-danger",
      };
    case "Degraded":
      return {
        className:
          "border-carbon-warning/40 bg-carbon-warning/10 text-carbon-warning shadow-[0_0_20px_-8px_rgba(240,180,41,0.35)]",
        dot: "bg-carbon-warning",
      };
    default:
      return {
        className:
          "border-carbon-success/40 bg-carbon-success/10 text-carbon-success shadow-[0_0_20px_-8px_rgba(63,185,80,0.35)]",
        dot: "bg-carbon-success",
      };
  }
}

function severityClass(sev: string): string {
  const s = sev.toLowerCase();
  if (s === "critical")
    return "text-carbon-danger border-carbon-danger/30 bg-carbon-danger/10";
  if (s === "info")
    return "text-carbon-accent border-carbon-accent/30 bg-carbon-accent/10";
  return "text-carbon-warning border-carbon-warning/30 bg-carbon-warning/10";
}

export default async function StatusPage() {
  const data = await loadPlatformStatusPageData();
  const copy = overallCopy(data.overall);
  const banner = bannerTheme(data.overall);
  const bannerIcon =
    data.overall === "major" ? (
      <XCircle className="size-6 shrink-0 opacity-95 sm:size-7" aria-hidden />
    ) : data.overall === "partial" ? (
      <AlertTriangle className="size-6 shrink-0 opacity-95 sm:size-7" aria-hidden />
    ) : (
      <CheckCircle2 className="size-6 shrink-0 opacity-95 sm:size-7" aria-hidden />
    );

  return (
    <div className="min-h-screen bg-carbon-page text-carbon-body antialiased">
      <nav className="border-b border-carbon-border bg-carbon-surface/50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="inline-flex items-center gap-2">
            <NetPulseLogo variant="footer" className="gap-2" />
          </Link>
          <Link
            href="/sign-in"
            className="text-sm font-medium text-carbon-accent transition-colors hover:text-carbon-accent-hover"
          >
            Sign In
          </Link>
        </div>
      </nav>

      <section
        className={cn(
          "flex items-center justify-center border-b border-[#21262d] bg-[#161b22] border-l-4 py-8 pl-5 pr-4 sm:py-10 sm:pl-6 sm:pr-6",
          banner.borderL
        )}
      >
        <div
          className={cn(
            "mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4",
            banner.text
          )}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span
              className={cn(
                "size-2 shrink-0 rounded-full",
                banner.dot,
                "animate-np-pulse-dot"
              )}
              aria-hidden
            />
            {bannerIcon}
          </div>
          <div className="text-center sm:min-w-0 sm:flex-1 sm:text-left">
            <p className="font-heading text-xl font-semibold tracking-tight sm:text-2xl">
              {copy.headline}
            </p>
            <p className="mt-1 max-w-xl text-sm opacity-90 sm:mt-1.5 sm:text-[15px]">
              {copy.sub}
            </p>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        {data.loadError ? (
          <div
            className="mb-10 rounded-lg border border-carbon-danger/40 bg-carbon-danger/10 px-4 py-3 text-sm text-carbon-danger"
            role="alert"
          >
            {data.loadError}
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-heading text-2xl font-semibold tracking-tight text-carbon-heading sm:text-3xl">
              Components
            </h1>
            <p className="mt-1 max-w-xl text-sm text-carbon-body">
              Real-time probes of the NetPulse product stack. Uptime reflects
              days with stored history plus today&apos;s live status.
            </p>
          </div>
          <div className="flex flex-col items-start gap-1 text-xs sm:items-end sm:text-sm">
            <PlatformStatusRefresh />
            <span className="text-carbon-muted">
              Server cache revalidates every 60s
            </span>
          </div>
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {data.services.map((svc) => {
            const Icon = SERVICE_ICONS[svc.key];
            const b = badgeStyles(svc.badgeLabel);
            return (
              <li key={svc.key}>
                <article
                  className={cn(
                    "flex h-full flex-col rounded-xl border border-carbon-border border-l-[3px] border-l-carbon-accent bg-carbon-surface p-5 shadow-sm transition-shadow duration-300 hover:shadow-md"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-carbon-border bg-carbon-page">
                        <Icon
                          className="size-5 text-carbon-accent"
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-heading text-base font-semibold text-carbon-heading">
                          {svc.name}
                        </h2>
                        {svc.detail ? (
                          <p className="mt-0.5 line-clamp-2 text-xs text-carbon-muted">
                            {svc.detail}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide transition-transform duration-300 motion-safe:hover:scale-105 sm:text-xs",
                        b.className
                      )}
                    >
                      {svc.badgeLabel}
                    </span>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-carbon-border/80 pt-4 text-sm">
                    <div>
                      <dt className="text-xs text-carbon-body">Uptime (90d)</dt>
                      <dd className="mt-0.5 font-semibold text-carbon-heading">
                        {svc.uptimePct != null
                          ? `${svc.uptimePct.toFixed(1)}%`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-carbon-body">Response</dt>
                      <dd className="mt-0.5 font-semibold text-carbon-heading">
                        {svc.latencyMs} ms
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-xs text-carbon-body">Last checked</dt>
                      <dd className="mt-0.5 font-medium text-carbon-heading">
                        {formatTimestamp(svc.checkedAtIso)}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-1 border-t border-carbon-border/60 pt-4">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-carbon-body">
                      90-day history
                    </p>
                    <StatusUptimeHeatmap days={svc.heatmapDays} />
                  </div>
                </article>
              </li>
            );
          })}
        </ul>

        <section className="mt-16 border-t border-carbon-border pt-14">
          <h2 className="font-heading text-xl font-semibold text-carbon-heading sm:text-2xl">
            Incident history
          </h2>
          <p className="mt-1 text-sm text-carbon-body">
            Platform incidents resolved in the last 90 days.
          </p>
          {data.incidents.length === 0 ? (
            <div className="mt-8 flex items-start gap-4 rounded-xl border border-carbon-border bg-carbon-surface px-5 py-6">
              <ShieldCheck
                className="mt-0.5 size-8 shrink-0 text-carbon-success"
                aria-hidden
              />
              <div>
                <p className="font-medium text-carbon-heading">
                  No incidents in the last 90 days
                </p>
                <p className="mt-1 text-sm text-carbon-body">
                  We&apos;ll post updates here if anything affects the NetPulse
                  platform.
                </p>
              </div>
            </div>
          ) : (
            <ul className="mt-8 space-y-3">
              {data.incidents.map((inc) => (
                <li key={inc.id}>
                  <div className="rounded-xl border border-carbon-border bg-carbon-surface p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-heading font-semibold text-carbon-heading">
                        {inc.title}
                      </p>
                      <span
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          severityClass(inc.severity)
                        )}
                      >
                        {inc.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-carbon-body sm:text-sm">
                      Started {formatTimestamp(inc.startedAtIso)} · Resolved{" "}
                      {formatTimestamp(inc.resolvedAtIso)} · Duration{" "}
                      {inc.durationLabel}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <footer className="mt-20 border-t border-carbon-border pt-10 text-center">
          <div className="flex flex-col items-center gap-4 text-xs text-carbon-body sm:flex-row sm:flex-wrap sm:justify-center sm:gap-x-8 sm:gap-y-2 sm:text-sm">
            <span className="inline-flex items-center gap-2 text-carbon-heading">
              <span>Powered by</span>
              <NetPulseLogo variant="footer" className="gap-2" />
            </span>
            <span className="text-carbon-muted">
              Auto refreshes every 60 seconds
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}
