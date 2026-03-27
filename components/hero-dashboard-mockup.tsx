import { Activity, Bell, LayoutGrid, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const sidebarIcons = [LayoutGrid, Activity, Bell, Settings] as const;

export function HeroDashboardMockup({ className }: { className?: string }) {
  const bars = [42, 68, 55, 88, 72, 95, 61, 78, 84, 70, 92, 65, 89, 76, 98, 82];

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-carbon-border bg-carbon-surface shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)]",
        className
      )}
    >
      {/* Browser chrome */}
      <div className="flex h-9 items-center gap-2 border-b border-carbon-border bg-[#0d1117] px-3 sm:h-10">
        <span className="size-2.5 rounded-full bg-[#ff5f56]" aria-hidden />
        <span className="size-2.5 rounded-full bg-[#ffbd2e]" aria-hidden />
        <span className="size-2.5 rounded-full bg-[#27c93f]" aria-hidden />
        <div className="ml-2 hidden h-5 flex-1 items-center rounded-md border border-carbon-border bg-carbon-surface/80 px-2 text-[10px] text-carbon-muted sm:flex">
          <span className="truncate">command.netpulse.app</span>
        </div>
      </div>

      <div className="flex min-h-[220px] sm:min-h-[280px]">
        {/* Sidebar */}
        <aside
          className="flex w-10 shrink-0 flex-col items-center gap-2 border-r border-carbon-border py-3 sm:w-12 sm:gap-2.5 sm:py-4"
          aria-hidden
        >
          {sidebarIcons.map((Icon, i) => (
            <div
              key={i}
              className={cn(
                "flex size-7 items-center justify-center rounded-md border border-carbon-border sm:size-8",
                i === 0 && "border-carbon-accent/40 bg-carbon-accent/10"
              )}
            >
              <Icon
                className={cn(
                  "size-3.5 sm:size-4",
                  i === 0 ? "text-carbon-accent" : "text-carbon-muted"
                )}
                strokeWidth={1.75}
                aria-hidden
              />
            </div>
          ))}
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 space-y-2.5 p-2.5 sm:space-y-3 sm:p-4">
          {/* Status row */}
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
            <div className="rounded-lg border border-carbon-border bg-carbon-page/60 px-2 py-1.5 sm:px-3 sm:py-2">
              <p className="text-[9px] font-medium uppercase tracking-wider text-carbon-muted sm:text-[10px]">
                API
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-carbon-success sm:text-xs">
                Operational
              </p>
            </div>
            <div className="rounded-lg border border-carbon-border bg-carbon-page/60 px-2 py-1.5 sm:px-3 sm:py-2">
              <p className="text-[9px] font-medium uppercase tracking-wider text-carbon-muted sm:text-[10px]">
                Workers
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-carbon-warning sm:text-xs">
                Degraded
              </p>
            </div>
            <div className="rounded-lg border border-carbon-border bg-carbon-page/60 px-2 py-1.5 sm:px-3 sm:py-2">
              <p className="text-[9px] font-medium uppercase tracking-wider text-carbon-muted sm:text-[10px]">
                Edge
              </p>
              <p className="mt-0.5 text-[10px] font-semibold text-carbon-danger sm:text-xs">
                Down
              </p>
            </div>
          </div>

          {/* Chart + metrics */}
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
            <div className="min-h-[72px] flex-1 rounded-lg border border-carbon-border bg-carbon-page/40 p-2 sm:min-h-[88px] sm:p-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[9px] font-medium uppercase tracking-wider text-carbon-muted sm:text-[10px]">
                  Uptime (24h)
                </span>
                <span className="text-[9px] text-carbon-accent sm:text-[10px]">
                  Live
                </span>
              </div>
              <div
                className="flex h-10 items-end justify-between gap-0.5 sm:h-12"
                role="presentation"
              >
                {bars.map((h, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm bg-gradient-to-t from-carbon-accent/25 to-carbon-accent"
                    style={{ height: `${h}%`, minHeight: "4px" }}
                  />
                ))}
              </div>
            </div>
            <div className="grid shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-1 sm:gap-2 sm:w-[100px]">
              <div className="rounded-lg border border-carbon-border bg-carbon-page/60 px-2 py-1.5 sm:py-2">
                <p className="text-[9px] text-carbon-muted sm:text-[10px]">
                  Uptime
                </p>
                <p className="text-sm font-semibold tabular-nums text-carbon-heading sm:text-base">
                  99.94%
                </p>
              </div>
              <div className="rounded-lg border border-carbon-border bg-carbon-page/60 px-2 py-1.5 sm:py-2">
                <p className="text-[9px] text-carbon-muted sm:text-[10px]">
                  p95
                </p>
                <p className="text-sm font-semibold tabular-nums text-carbon-heading sm:text-base">
                  142ms
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
