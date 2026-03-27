"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Loader2,
  MonitorSmartphone,
  TrendingDown,
  TrendingUp,
  Siren,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { runMyMonitorChecksNow } from "@/lib/actions/monitor-checks";
import { createMonitor, deleteMonitor } from "@/lib/actions/monitors";
import type { UptimeDayPoint } from "@/lib/data/monitors";
import { computeStats, formatRelativeTime } from "@/lib/dashboard-utils";
import type {
  CheckIntervalMinutes,
  IncidentRow,
  MonitorHealth,
  MonitorRow,
  MonitorType,
} from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

const DashboardUptimeChart = dynamic(
  () =>
    import("./dashboard-uptime-chart").then((m) => ({
      default: m.DashboardUptimeChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-[240px] w-full min-w-0 animate-pulse rounded-lg bg-carbon-border/25 sm:h-[280px]"
        role="status"
        aria-label="Loading chart"
      />
    ),
  }
);

function SectionHeader({
  id,
  title,
  description,
}: {
  id?: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 sm:mb-5">
      <h2
        id={id}
        className="font-heading text-lg font-semibold tracking-tight text-carbon-heading sm:text-xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-carbon-body">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function StatusBadge({ status }: { status: MonitorHealth }) {
  const map = {
    operational: {
      label: "Operational",
      className: "bg-carbon-success/15 text-carbon-success",
    },
    degraded: {
      label: "Degraded",
      className: "bg-carbon-warning/15 text-carbon-warning",
    },
    down: { label: "Down", className: "bg-carbon-danger/15 text-carbon-danger" },
  } as const;
  const s = map[status];
  return (
    <span
      className={cn(
        "inline-flex rounded-md px-2 py-0.5 text-xs font-semibold",
        s.className
      )}
    >
      {s.label}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
  if (severity === "critical") {
    return (
      <span className="rounded-md bg-carbon-danger/15 px-2 py-0.5 text-xs font-semibold text-carbon-danger">
        Critical
      </span>
    );
  }
  if (severity === "info") {
    return (
      <span className="rounded-md border border-carbon-accent/30 bg-carbon-accent/10 px-2 py-0.5 text-xs font-semibold text-carbon-accent">
        Info
      </span>
    );
  }
  return (
    <span className="rounded-md bg-carbon-warning/15 px-2 py-0.5 text-xs font-semibold text-carbon-warning">
      Warning
    </span>
  );
}

function IncidentStatusBadge({ status }: { status: "active" | "resolved" }) {
  if (status === "active") {
    return (
      <span className="rounded-md border border-carbon-accent/30 bg-carbon-accent/10 px-2 py-0.5 text-xs font-semibold text-carbon-accent">
        Active
      </span>
    );
  }
  return (
    <span className="rounded-md bg-carbon-border/40 px-2 py-0.5 text-xs font-semibold text-carbon-body">
      Resolved
    </span>
  );
}

type DashboardViewProps = {
  initialMonitors: MonitorRow[];
  initialIncidents: IncidentRow[];
  uptimeSeries: UptimeDayPoint[];
  userId: string;
};

export function DashboardView({
  initialMonitors,
  initialIncidents,
  uptimeSeries,
  userId,
}: DashboardViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [monitorType, setMonitorType] = useState<MonitorType>("http");
  const [intervalMin, setIntervalMin] = useState<CheckIntervalMinutes>(5);

  const monitors = initialMonitors;
  const incidents = initialIncidents;

  const stats = useMemo(() => computeStats(monitors), [monitors]);

  function resetForm() {
    setName("");
    setUrl("");
    setMonitorType("http");
    setIntervalMin(5);
  }

  function handleAddMonitor(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;

    setFormError(null);
    startTransition(async () => {
      try {
        await createMonitor(userId, {
          name: trimmedName,
          url: trimmedUrl,
          type: monitorType,
          interval: intervalMin,
        });
        setDialogOpen(false);
        resetForm();
        router.refresh();
        toast.success("Monitor created.");
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not create monitor"
        );
      }
    });
  }

  function handleRunChecksNow() {
    setFormError(null);
    startTransition(async () => {
      try {
        const { checked } = await runMyMonitorChecksNow();
        router.refresh();
        toast.success(
          checked === 0
            ? "No active monitors to check (paused or empty)."
            : `Finished ${checked} monitor check${checked === 1 ? "" : "s"}.`
        );
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Could not run monitor checks";
        setFormError(message);
        toast.error(message);
      }
    });
  }

  function handleDeleteMonitor(id: string) {
    if (!window.confirm("Remove this monitor and its history?")) return;
    setFormError(null);
    startTransition(async () => {
      try {
        await deleteMonitor(id);
        router.refresh();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not delete monitor"
        );
      }
    });
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-10 sm:space-y-12">
        {/* Page header */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h1 className="font-heading text-2xl font-semibold tracking-tight text-carbon-heading sm:text-3xl">
                Dashboard
              </h1>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRunChecksNow}
                disabled={isPending || monitors.length === 0}
                className="min-h-11 h-11 shrink-0 gap-1.5 border-carbon-border bg-transparent px-2.5 text-xs font-medium text-carbon-body hover:bg-carbon-border/30"
              >
                {isPending ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : null}
                Run checks now
              </Button>
            </div>
            <p className="mt-1 text-sm text-carbon-body">
              Snapshot of monitors, uptime trend, and open incidents. HTTP
              checks run from{" "}
              <span className="font-medium text-carbon-heading">
                Run checks now
              </span>{" "}
              (signed-in, server-side) or when your scheduler calls{" "}
              <code className="rounded bg-carbon-border/40 px-1 py-0.5 font-mono text-xs">
                POST /api/check-monitors
              </code>{" "}
              with <code className="rounded bg-carbon-border/40 px-1 py-0.5 font-mono text-xs">x-cron-secret</code>. The
              check interval is stored for future scheduling.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => setDialogOpen(true)}
              disabled={isPending}
              className="h-11 shrink-0 rounded-lg border-0 bg-carbon-accent px-5 text-sm font-semibold text-carbon-ctaText hover:bg-carbon-accent-hover sm:h-10"
            >
              Add Monitor
            </Button>
          </div>
        </header>

        {formError ? (
          <div
            className="rounded-lg border border-carbon-danger/40 bg-carbon-danger/10 px-4 py-3 text-sm text-carbon-danger"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        {/* Stats */}
        <section aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="sr-only">
            Overview statistics
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total monitors"
              hint="Configured checks"
              value={stats.total}
              valueClassName="text-carbon-heading"
              icon={MonitorSmartphone}
            />
            <StatCard
              label="Monitors up"
              hint="Healthy right now"
              value={stats.up}
              valueClassName="text-carbon-success"
              icon={TrendingUp}
            />
            <StatCard
              label="Monitors down"
              hint="Needs attention"
              value={stats.down}
              valueClassName="text-carbon-danger"
              icon={TrendingDown}
            />
            <StatCard
              label="Avg uptime"
              hint="Rolling across all monitors"
              value={`${stats.avgUptimePct.toFixed(2)}%`}
              valueClassName="text-carbon-accent"
              icon={Activity}
            />
          </div>
        </section>

        {/* Chart */}
        <section aria-labelledby="uptime-chart-heading">
          <SectionHeader
            id="uptime-chart-heading"
            title="Uptime trend"
            description="Combined availability by day for the last 7 days. Higher bars mean better uptime."
          />
          <div className="rounded-xl border border-carbon-border bg-carbon-surface p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-carbon-muted">
                Last 7 days
              </p>
              <p className="text-sm text-carbon-body">
                Y-axis is uptime percentage (0–100%).
              </p>
            </div>
            <DashboardUptimeChart data={uptimeSeries} />
          </div>
        </section>

        {/* Monitors */}
        <section aria-labelledby="monitors-heading">
          <SectionHeader
            id="monitors-heading"
            title="Monitors"
            description="Live status, target, and last successful check."
          />
          {monitors.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-carbon-border bg-carbon-surface/50 px-6 py-16 text-center">
              <p className="max-w-sm text-sm text-carbon-body">
                No monitors yet. Add one to start tracking uptime from this
                workspace.
              </p>
              <Button
                type="button"
                onClick={() => setDialogOpen(true)}
                className="mt-6 h-10 rounded-lg border-0 bg-carbon-accent px-6 text-sm font-semibold text-carbon-ctaText hover:bg-carbon-accent-hover"
              >
                Add your first monitor
              </Button>
            </div>
          ) : (
            <>
              <ul
                className="space-y-3 sm:hidden"
                aria-label="Monitors list"
              >
                {monitors.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-xl border border-carbon-border bg-carbon-surface p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-block size-2.5 shrink-0 rounded-full",
                              m.status === "operational" && "bg-carbon-success",
                              m.status === "degraded" && "bg-carbon-warning",
                              m.status === "down" && "bg-carbon-danger"
                            )}
                            aria-hidden
                          />
                          <p className="font-medium text-carbon-heading">
                            {m.name}
                          </p>
                        </div>
                        <p className="mt-1 break-all font-mono text-xs text-carbon-body">
                          {m.url}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <StatusBadge status={m.status} />
                          <span className="tabular-nums text-sm text-carbon-heading">
                            {m.uptimePct.toFixed(2)}% uptime
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-carbon-muted">
                          Last check{" "}
                          {formatRelativeTime(m.lastChecked)}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isPending}
                        className="min-h-11 h-11 shrink-0 border-carbon-border bg-transparent text-carbon-body hover:bg-carbon-border/30 hover:text-carbon-heading"
                        onClick={() => handleDeleteMonitor(m.id)}
                        aria-label={`Delete monitor ${m.name}`}
                      >
                        Delete
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden overflow-hidden rounded-xl border border-carbon-border bg-carbon-surface sm:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-carbon-border bg-carbon-page/50 text-xs font-semibold uppercase tracking-wider text-carbon-muted">
                      <th className="px-4 py-3 sm:px-5">Status</th>
                      <th className="px-4 py-3 sm:px-5">Name</th>
                      <th className="px-4 py-3 sm:px-5">Target</th>
                      <th className="px-4 py-3 sm:px-5">State</th>
                      <th className="px-4 py-3 sm:px-5">Uptime</th>
                      <th className="px-4 py-3 sm:px-5">Last check</th>
                      <th className="px-4 py-3 text-right sm:px-5"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {monitors.map((m, i) => (
                      <tr
                        key={m.id}
                        className={cn(
                          "border-b border-carbon-border last:border-0",
                          i % 2 === 1 ? "bg-carbon-page/35" : "bg-transparent"
                        )}
                      >
                        <td className="px-4 py-3 sm:px-5">
                          <span
                            className={cn(
                              "inline-block size-2.5 rounded-full",
                              m.status === "operational" && "bg-carbon-success",
                              m.status === "degraded" && "bg-carbon-warning",
                              m.status === "down" && "bg-carbon-danger"
                            )}
                            title={m.status}
                            aria-hidden
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-carbon-heading sm:px-5">
                          {m.name}
                        </td>
                        <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-carbon-body sm:max-w-xs sm:px-5">
                          {m.url}
                        </td>
                        <td className="px-4 py-3 sm:px-5">
                          <StatusBadge status={m.status} />
                        </td>
                        <td className="px-4 py-3 tabular-nums text-carbon-heading sm:px-5">
                          {m.uptimePct.toFixed(2)}%
                        </td>
                        <td className="px-4 py-3 tabular-nums text-carbon-muted sm:px-5">
                          {formatRelativeTime(m.lastChecked)}
                        </td>
                        <td className="px-4 py-3 text-right sm:px-5">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            className="min-h-11 h-11 border-carbon-border bg-transparent text-carbon-body hover:bg-carbon-border/30 hover:text-carbon-heading"
                            onClick={() => handleDeleteMonitor(m.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}
        </section>

        {/* Incidents */}
        <section aria-labelledby="incidents-heading">
          <SectionHeader
            id="incidents-heading"
            title="Recent incidents"
            description="Latest events across your stack, newest first."
          />
          {incidents.length === 0 ? (
            <div className="flex flex-col items-center rounded-xl border border-dashed border-carbon-border bg-carbon-surface/50 px-6 py-14 text-center">
              <div
                className="flex size-14 items-center justify-center rounded-full border border-carbon-border bg-carbon-page/80 text-carbon-accent"
                aria-hidden
              >
                <Siren className="size-7" strokeWidth={1.5} />
              </div>
              <p className="mt-4 max-w-sm text-sm text-carbon-body">
                No incidents recorded in this window. When monitors fail or you
                log events, they will appear here.
              </p>
              <Link
                href="/dashboard/incidents"
                className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg border border-carbon-border px-5 text-sm font-medium text-carbon-heading transition-colors hover:bg-carbon-border/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon-accent/40"
              >
                Open incidents
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-carbon-border rounded-xl border border-carbon-border bg-carbon-surface">
              {incidents.map((inc) => (
                <li
                  key={inc.id}
                  className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <SeverityBadge severity={inc.severity} />
                      <span className="text-sm font-semibold text-carbon-heading">
                        {inc.service}
                      </span>
                      <IncidentStatusBadge status={inc.status} />
                    </div>
                    <p className="text-sm leading-relaxed text-carbon-body">
                      {inc.description}
                    </p>
                    <p className="text-xs tabular-nums text-carbon-muted">
                      {inc.timestamp.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="border-carbon-border bg-carbon-surface sm:max-w-md max-sm:fixed max-sm:inset-0 max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
          <DialogHeader>
            <DialogTitle>Add monitor</DialogTitle>
            <DialogDescription>
              Create a new HTTP check. Data is stored in Supabase for this
              workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddMonitor} className="space-y-4">
            {formError ? (
              <p className="text-sm text-carbon-danger" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="mon-name">Monitor name</Label>
              <Input
                id="mon-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. API health"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mon-url">URL or IP address</Label>
              <Input
                id="mon-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com/health"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mon-type">Monitor type</Label>
              <Select
                value={monitorType}
                onValueChange={(v) => setMonitorType(v as MonitorType)}
              >
                <SelectTrigger id="mon-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="http">HTTP</SelectItem>
                  <SelectItem value="https">HTTPS</SelectItem>
                  <SelectItem value="ping">Ping</SelectItem>
                  <SelectItem value="tcp">TCP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="mon-interval">Check interval</Label>
              <Select
                value={String(intervalMin)}
                onValueChange={(v) =>
                  setIntervalMin(Number(v) as CheckIntervalMinutes)
                }
              >
                <SelectTrigger id="mon-interval">
                  <SelectValue placeholder="Interval" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 minute</SelectItem>
                  <SelectItem value="5">5 minutes</SelectItem>
                  <SelectItem value="10">10 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="gap-2 pt-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                className="border-carbon-border bg-transparent text-carbon-body hover:bg-carbon-border/30"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="border-0 bg-carbon-accent text-carbon-ctaText hover:bg-carbon-accent-hover"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                    Saving…
                  </>
                ) : (
                  "Add monitor"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({
  label,
  hint,
  value,
  valueClassName,
  icon: Icon,
}: {
  label: string;
  hint: string;
  value: number | string;
  valueClassName: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-carbon-border bg-carbon-surface p-5 pt-4 shadow-sm">
      <div
        className="absolute inset-x-0 top-0 h-0.5 bg-carbon-accent"
        aria-hidden
      />
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-carbon-muted">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-3xl font-semibold tabular-nums tracking-tight sm:text-4xl",
              valueClassName
            )}
          >
            {value}
          </p>
          <p className="mt-1 text-xs text-carbon-muted">{hint}</p>
        </div>
        <div className="rounded-lg border border-carbon-border bg-carbon-page/60 p-2.5 text-carbon-accent">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </div>
  );
}
