import Link from "next/link";
import {
  Activity,
  Plug2,
  Siren,
  UsersRound,
} from "lucide-react";
import { HeroDashboardMockup } from "@/components/hero-dashboard-mockup";
import { MarketingHeader } from "@/components/marketing-header";
import { NetPulseLogo } from "@/components/netpulse-logo";
import type { Metadata } from "next";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "NetPulse — IT Operations Command Center",
  description:
    "Uptime monitoring, incidents, and alerting in one IT operations dashboard. Built with Next.js, Clerk, and Supabase.",
  keywords: [
    "NetPulse",
    "uptime monitoring",
    "IT operations",
    "incident management",
    "status page",
    "SRE tools",
  ],
  openGraph: {
    title: "NetPulse — IT Operations Command Center",
    description:
      "Run production with clarity: monitors, incidents, Discord and email alerts.",
  },
};

const features = [
  {
    title: "Uptime visibility",
    description:
      "Monitor services and dependencies from a single pane of glass with clear health signals.",
    icon: Activity,
  },
  {
    title: "Incident response",
    description:
      "Triage faster with timelines, ownership, and context that stays attached to every event.",
    icon: Siren,
  },
  {
    title: "Integrations",
    description:
      "Connect alerting, chat, and ticketing so the right people are looped in automatically.",
    icon: Plug2,
  },
  {
    title: "Team alignment",
    description:
      "Shared views for ops, SRE, and leadership—without duplicating spreadsheets or dashboards.",
    icon: UsersRound,
  },
] as const;

function IconUptimeBubble() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-carbon-success"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function IconLatencyBubble() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-carbon-accent"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function IconAlertBubble() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4 shrink-0 text-carbon-warning"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-carbon-page text-carbon-body antialiased">
      <MarketingHeader />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-carbon-border">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            aria-hidden
            style={{
              backgroundImage: `linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px),
                linear-gradient(90deg, rgba(34,211,238,0.4) 1px, transparent 1px)`,
              backgroundSize: "64px 64px",
            }}
          />
          <div className="relative mx-auto max-w-6xl px-4 pb-20 pt-12 sm:px-6 sm:pb-28 sm:pt-16 lg:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
              <div className="max-w-xl space-y-7 lg:max-w-none">
                <div className="inline-flex items-center gap-2 rounded-full border border-carbon-border bg-carbon-surface px-3 py-1.5 pr-4">
                  <span
                    className="size-2 shrink-0 rounded-full bg-carbon-accent shadow-[0_0_0_3px_rgba(34,211,238,0.2)] motion-safe:animate-np-pulse-dot"
                    aria-hidden
                  />
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-carbon-accent">
                    IT operations command center
                  </span>
                </div>

                <h1 className="font-heading text-4xl font-semibold leading-[1.08] tracking-tight text-carbon-heading text-balance sm:text-5xl lg:text-[3.25rem] lg:leading-[1.06]">
                  Run production with{" "}
                  <span className="text-carbon-accent">clarity</span>, not
                  chaos.
                </h1>

                <p className="max-w-lg text-lg leading-relaxed text-carbon-body text-pretty sm:text-xl sm:leading-relaxed">
                  NetPulse brings uptime, incidents, and team workflows into
                  one professional operations surface—built for teams who ship
                  under pressure.
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <Link
                    href="/sign-up"
                    className="inline-flex h-12 items-center justify-center rounded-lg bg-carbon-accent px-8 text-base font-semibold text-carbon-ctaText transition-colors hover:bg-carbon-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-page"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    href="/status"
                    className="inline-flex h-12 items-center justify-center rounded-lg border border-carbon-border bg-transparent px-8 text-base font-medium text-carbon-body transition-colors hover:border-carbon-muted hover:text-carbon-heading focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-page"
                  >
                    View system status
                  </Link>
                </div>
              </div>

              <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
                <div
                  className="pointer-events-none absolute -right-4 top-[8%] z-10 hidden max-w-[140px] rounded-lg border border-carbon-border bg-carbon-surface p-3 shadow-xl motion-safe:sm:animate-np-float sm:block lg:-right-2 lg:top-[6%]"
                  role="status"
                >
                  <div className="flex items-start gap-2.5">
                    <IconUptimeBubble />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
                        Uptime
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-carbon-success">
                        99.9% Uptime
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute -left-2 bottom-[18%] z-10 hidden max-w-[150px] rounded-lg border border-carbon-border bg-carbon-surface p-3 shadow-xl motion-safe:sm:animate-np-float-alt sm:block lg:-left-4 lg:bottom-[22%]"
                  role="status"
                >
                  <div className="flex items-start gap-2.5">
                    <IconLatencyBubble />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
                        Latency
                      </p>
                      <p className="mt-0.5 text-sm font-semibold tabular-nums text-carbon-accent">
                        142ms Avg response
                      </p>
                    </div>
                  </div>
                </div>

                <div
                  className="pointer-events-none absolute -right-2 bottom-[4%] z-10 hidden max-w-[148px] rounded-lg border border-carbon-border bg-carbon-surface p-3 shadow-xl motion-safe:sm:animate-np-float-slow sm:block lg:right-[4%] lg:bottom-[8%]"
                  role="status"
                >
                  <div className="flex items-start gap-2.5">
                    <IconAlertBubble />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
                        Alerts
                      </p>
                      <p className="mt-0.5 text-sm font-semibold text-carbon-warning">
                        1 Active alert
                      </p>
                    </div>
                  </div>
                </div>

                <HeroDashboardMockup className="relative z-0" />

                <div
                  className="mt-5 grid grid-cols-1 gap-3 sm:hidden"
                  aria-label="Sample metrics"
                >
                  <div className="flex items-center gap-3 rounded-lg border border-carbon-border bg-carbon-surface p-3">
                    <IconUptimeBubble />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
                        Uptime
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-carbon-success">
                        99.9% Uptime
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-carbon-border bg-carbon-surface p-3">
                    <IconLatencyBubble />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
                        Latency
                      </p>
                      <p className="text-sm font-semibold tabular-nums text-carbon-accent">
                        142ms Avg response
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg border border-carbon-border bg-carbon-surface p-3">
                    <IconAlertBubble />
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-wider text-carbon-muted">
                        Alerts
                      </p>
                      <p className="text-sm font-semibold text-carbon-warning">
                        1 Active alert
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section
          id="features"
          className="scroll-mt-24 border-b border-carbon-border bg-carbon-deeper py-16 sm:py-24"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mb-12 max-w-2xl lg:mb-16">
              <h2 className="font-heading text-2xl font-semibold tracking-tight text-carbon-heading sm:text-3xl">
                Built for serious operations
              </h2>
              <p className="mt-4 text-base leading-relaxed text-carbon-body sm:text-lg">
                Everything you need to coordinate reliability work across tools
                and teams—without losing the narrative.
              </p>
            </div>
            <ul className="grid gap-5 sm:grid-cols-2 sm:gap-6 lg:gap-8">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <li key={feature.title}>
                    <article
                      className={cn(
                        "h-full rounded-xl border border-carbon-border bg-carbon-surface/40 p-6 transition-colors hover:bg-carbon-surface/70 sm:p-7",
                        "border-l-[3px] border-l-carbon-accent pl-[calc(1.5rem-3px)] sm:pl-[calc(1.75rem-3px)]"
                      )}
                    >
                      <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg border border-carbon-border bg-carbon-page/80 text-carbon-accent">
                        <Icon className="size-5" strokeWidth={1.75} />
                      </div>
                      <h3 className="font-heading text-lg font-semibold text-carbon-accent sm:text-xl">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-carbon-body sm:text-base">
                        {feature.description}
                      </p>
                    </article>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* About */}
        <section className="border-b border-carbon-border py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-carbon-heading sm:text-3xl">
              Built by engineers, for engineers
            </h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-12 lg:items-start">
              <div className="max-w-xl space-y-4 text-base leading-relaxed text-carbon-body sm:text-lg">
                <p>
                  NetPulse was built out of frustration with expensive, bloated
                  monitoring tools. We wanted something clean, fast, and
                  focused — built for IT ops and infrastructure teams who need
                  clarity not chaos.
                </p>
                <p className="text-carbon-muted">
                  Free forever for small teams.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                {(["100% Free", "Open Source", "Built with Next.js"] as const).map(
                  (label) => (
                    <div
                      key={label}
                      className="flex min-h-[100px] items-center justify-center rounded-xl border border-carbon-border bg-carbon-surface px-5 py-6 sm:min-h-[112px] sm:p-6"
                    >
                      <p className="text-center font-heading text-lg font-semibold text-carbon-heading sm:text-xl">
                        {label}
                      </p>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-b border-carbon-border bg-carbon-deeper/80 py-16 sm:py-24">
          <div className="mx-auto max-w-2xl px-4 text-center sm:px-6">
            <h2 className="font-heading text-2xl font-semibold tracking-tight text-carbon-heading sm:text-3xl">
              Ready when your stack is not?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-carbon-body sm:text-lg">
              Create an account and open your command center in minutes.
            </p>
            <Link
              href="/sign-up"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-lg bg-carbon-accent px-10 text-base font-semibold text-carbon-ctaText transition-colors hover:bg-carbon-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent focus-visible:ring-offset-2 focus-visible:ring-offset-carbon-deeper sm:h-14 sm:px-12 sm:text-lg"
            >
              Get Started Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-carbon-border bg-carbon-page py-12 sm:py-14">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 sm:px-6 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
          <div className="max-w-xs">
            <NetPulseLogo variant="footer" />
            <p className="mt-4 text-sm leading-relaxed text-carbon-muted">
              © 2026 NetPulse. Built for the people keeping the lights on.
            </p>
          </div>
          <nav
            className="flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium"
            aria-label="Footer"
          >
            <Link
              href="/status"
              className="text-carbon-body transition-colors hover:text-carbon-heading"
            >
              Status
            </Link>
            <a
              href="https://github.com"
              className="text-carbon-body transition-colors hover:text-carbon-heading"
              rel="noopener noreferrer"
              target="_blank"
            >
              GitHub
            </a>
            <Link
              href="/docs"
              className="text-carbon-body transition-colors hover:text-carbon-heading"
            >
              Docs
            </Link>
            <Link
              href="/sign-in"
              className="text-carbon-body transition-colors hover:text-carbon-heading"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
