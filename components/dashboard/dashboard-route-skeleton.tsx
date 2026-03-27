import { cn } from "@/lib/utils";

function Shimmer({
  className,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-carbon-border/35",
        className
      )}
      {...rest}
    />
  );
}

export function DashboardRouteSkeleton({
  withChart = true,
}: {
  withChart?: boolean;
}) {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Shimmer className="h-8 w-48 max-w-full" />
            <Shimmer className="h-4 w-full max-w-xl" />
            <Shimmer className="h-4 w-full max-w-lg" />
          </div>
          <Shimmer className="h-11 w-36 shrink-0" />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-carbon-border bg-carbon-surface p-5"
            >
              <Shimmer className="h-3 w-24" />
              <Shimmer className="mt-4 h-10 w-20" />
              <Shimmer className="mt-2 h-3 w-32" />
            </div>
          ))}
        </div>
        {withChart ? (
          <div className="rounded-xl border border-carbon-border bg-carbon-surface p-4 sm:p-6">
            <Shimmer className="h-4 w-40" />
            <Shimmer className="mt-6 h-[240px] w-full sm:h-[280px]" />
          </div>
        ) : null}
        <div className="rounded-xl border border-carbon-border bg-carbon-surface p-4">
          <Shimmer className="h-4 w-32" />
          <div className="mt-4 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Shimmer key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
