"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { HeatmapDayStatus } from "@/lib/platform-health/types";

function labelFor(status: HeatmapDayStatus): string {
  switch (status) {
    case "up":
      return "Operational";
    case "degraded":
      return "Degraded";
    case "down":
      return "Down";
    default:
      return "No data";
  }
}

function squareClass(status: HeatmapDayStatus): string {
  switch (status) {
    case "up":
      return "bg-carbon-success";
    case "degraded":
      return "bg-carbon-warning";
    case "down":
      return "bg-carbon-danger";
    default:
      return "bg-carbon-muted/60";
  }
}

function formatDay(date: string): string {
  const d = new Date(`${date}T12:00:00.000Z`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function StatusUptimeHeatmap({
  days,
}: {
  days: { date: string; status: HeatmapDayStatus }[];
}) {
  return (
    <div className="mt-4">
      <TooltipProvider delayDuration={200}>
        <div
          className="flex gap-px overflow-x-auto pb-1 pt-0.5 [scrollbar-width:thin]"
          role="img"
          aria-label="Uptime over the last 90 days"
        >
          {days.map((d) => (
            <Tooltip key={d.date}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "size-2 min-h-2 min-w-2 shrink-0 rounded-[2px] border border-carbon-border/40 outline-none transition-transform hover:z-10 hover:scale-125 focus-visible:ring-2 focus-visible:ring-carbon-accent",
                    squareClass(d.status)
                  )}
                  title={`${formatDay(d.date)} — ${labelFor(d.status)}`}
                  aria-label={`${formatDay(d.date)}, ${labelFor(d.status)}`}
                />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[220px]">
                <p className="font-medium text-carbon-heading">
                  {formatDay(d.date)}
                </p>
                <p className="text-carbon-body">{labelFor(d.status)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
      <div className="mt-1.5 flex justify-between text-[10px] uppercase tracking-wider text-carbon-body sm:text-xs">
        <span>90 days ago</span>
        <span>Today</span>
      </div>
    </div>
  );
}
