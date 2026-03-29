"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Loader2,
  Monitor as MonitorIcon,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createMonitor,
  deleteMonitor,
  setMonitorPaused,
  updateMonitor,
} from "@/lib/actions/monitors";
import {
  getMonitorPanelData,
  runSingleMonitorCheckNow,
} from "@/lib/actions/monitor-checks";
import {
  computeStats,
  formatRelativeTimeFriendly,
  type HourlyChartPoint,
} from "@/lib/dashboard-utils";
import type {
  CheckIntervalMinutes,
  MonitorHealth,
  MonitorListItem,
  MonitorListItemSerialized,
  MonitorType,
} from "@/lib/dashboard-types";
import type { MonitorCheck } from "@/lib/supabase";
import { cn } from "@/lib/utils";


const MonitorsPanelChartsLazy = dynamic(
  () =>
    import("./monitors-panel-charts").then((m) => ({
      default: m.MonitorsPanelCharts,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="mt-8 space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            Uptime (24h)
          </p>
          <div className="mt-3 flex h-[180px] items-center justify-center rounded-lg bg-[#21262d]/30">
            <Loader2 className="size-6 animate-spin text-[#8b949e]" aria-hidden />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            Response time (24h)
          </p>
          <div className="mt-3 flex h-[180px] items-center justify-center rounded-lg bg-[#21262d]/20">
            <Loader2 className="size-5 animate-spin text-[#484f58]" aria-hidden />
          </div>
        </div>
      </div>
    ),
  }
);

type FilterTab = "all" | MonitorHealth;

function typePillLabel(t: string): string {
  const u = t.toLowerCase();
  if (u === "http") return "HTTP";
  if (u === "https") return "HTTPS";
  if (u === "ping") return "Ping";
  if (u === "tcp") return "TCP";
  return t.toUpperCase();
}

function StatusBadge({ status }: { status: MonitorHealth }) {
  const map = {
    operational: "border-[#3fb950]/40 bg-[#3fb950]/15 text-[#3fb950]",
    degraded: "border-[#f0b429]/40 bg-[#f0b429]/15 text-[#f0b429]",
    down: "border-[#f85149]/40 bg-[#f85149]/15 text-[#f85149]",
    pending:
      "border-[#484f58]/60 bg-[#21262d]/80 text-[#8b949e]",
  } as const;
  const labels = {
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
    pending: "Pending",
  };
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold border",
        map[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

function CheckStatusBadge({ status }: { status: string }) {
  const up = status === "up";
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-xs font-semibold border",
        up
          ? "border-[#3fb950]/40 bg-[#3fb950]/15 text-[#3fb950]"
          : "border-[#f85149]/40 bg-[#f85149]/15 text-[#f85149]"
      )}
    >
      {up ? "Up" : "Down"}
    </span>
  );
}

function UptimeMiniBar({ pct }: { pct: number }) {
  const c = Math.min(100, Math.max(0, pct));
  const color =
    c >= 99 ? "bg-[#3fb950]" : c >= 95 ? "bg-[#f0b429]" : "bg-[#f85149]";
  return (
    <div className="mt-1 h-1 w-full max-w-[120px] overflow-hidden rounded-full bg-[#21262d]">
      <div
        className={cn("h-full rounded-full transition-all duration-500", color)}
        style={{ width: `${c}%` }}
      />
    </div>
  );
}

function StatTopCard({
  label,
  value,
  valueClass,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  valueClass: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#21262d] bg-[#161b22] p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[#22d3ee]" aria-hidden />
      <div className="flex items-start justify-between gap-3 pt-0.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl",
              valueClass
            )}
          >
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-[#21262d] bg-[#0d1117]/80 p-2.5 text-[#22d3ee]">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function deserializeMonitors(
  items: MonitorListItemSerialized[]
): MonitorListItem[] {
  return items.map((m) => ({
    ...m,
    lastChecked: m.lastChecked ? new Date(m.lastChecked) : null,
    createdAt: m.createdAt ? new Date(m.createdAt) : null,
  }));
}

function MonitorEmptyIllustration() {
  return (
    <svg
      width="160"
      height="120"
      viewBox="0 0 160 120"
      fill="none"
      className="mx-auto text-[#22d3ee]/90"
      aria-hidden
    >
      <rect x="24" y="20" width="112" height="72" rx="8" stroke="currentColor" strokeWidth="2" fill="#161b22" />
      <rect x="36" y="36" width="72" height="6" rx="2" fill="#21262d" />
      <rect x="36" y="48" width="48" height="6" rx="2" fill="#21262d" />
      <rect x="36" y="60" width="56" height="6" rx="2" fill="#21262d" />
      <path d="M56 100h48" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="128" cy="44" r="6" fill="#3fb950" opacity="0.85" />
    </svg>
  );
}


export function MonitorsView({
  initialMonitors,
  userId,
}: {
  initialMonitors: MonitorListItemSerialized[];
  userId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [monitors, setMonitors] = useState(() =>
    deserializeMonitors(initialMonitors)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [monitorType, setMonitorType] = useState<MonitorType>("http");
  const [intervalMin, setIntervalMin] = useState<CheckIntervalMinutes>(5);
  const [notificationEmail, setNotificationEmail] = useState("");
  const [panelHourly, setPanelHourly] = useState<HourlyChartPoint[]>([]);
  const [panelRecent, setPanelRecent] = useState<MonitorCheck[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);
  const [panelError, setPanelError] = useState<string | null>(null);

  useEffect(() => {
    setMonitors(deserializeMonitors(initialMonitors));
  }, [initialMonitors]);

  const selected = useMemo(
    () => monitors.find((m) => m.id === selectedId) ?? null,
    [monitors, selectedId]
  );

  const loadPanel = useCallback(async (id: string) => {
    setPanelLoading(true);
    setPanelError(null);
    try {
      const data = await getMonitorPanelData(id);
      setPanelHourly(data.hourly);
      setPanelRecent(data.recentChecks);
    } catch (e) {
      setPanelError(
        e instanceof Error ? e.message : "Could not load monitor details"
      );
      setPanelHourly([]);
      setPanelRecent([]);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPanelHourly([]);
      setPanelRecent([]);
      return;
    }
    void loadPanel(selectedId);
  }, [selectedId, loadPanel]);
  useEffect(() => {
    if (!selectedId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId]);


  const stats = useMemo(() => computeStats(monitors), [monitors]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return monitors.filter((m) => {
      if (filterTab !== "all" && m.status !== filterTab) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q)
      );
    });
  }, [monitors, search, filterTab]);

  function resetForm() {
    setName("");
    setUrl("");
    setMonitorType("http");
    setIntervalMin(5);
    setNotificationEmail("");
    setEditingId(null);
  }

  function openEdit(m: MonitorListItem) {
    setEditingId(m.id);
    setName(m.name);
    setUrl(m.url);
    setMonitorType((m.monitorType as MonitorType) || "http");
    const iv = m.intervalMinutes;
    setIntervalMin(iv === 1 || iv === 5 || iv === 10 ? iv : 5);
    setNotificationEmail(m.notificationEmail ?? "");
    setFormError(null);
    setEditOpen(true);
  }

  function handleAdd(e: React.FormEvent) {
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
          ...(notificationEmail.trim()
            ? { notification_email: notificationEmail.trim() }
            : {}),
        });
        setAddOpen(false);
        resetForm();
        router.refresh();
        toast.success("Monitor created and checked.");
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not create monitor"
        );
      }
    });
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const trimmedName = name.trim();
    const trimmedUrl = url.trim();
    if (!trimmedName || !trimmedUrl) return;
    setFormError(null);
    startTransition(async () => {
      try {
        const original = monitors.find((m) => m.id === editingId);
        const origEmail = original?.notificationEmail ?? null;
        const nextEmail = notificationEmail.trim() || null;
        const patch: Parameters<typeof updateMonitor>[1] = {
          name: trimmedName,
          url: trimmedUrl,
          type: monitorType,
          interval: intervalMin,
        };
        if (nextEmail !== origEmail) {
          patch.notification_email = nextEmail;
        }
        const { warning } = await updateMonitor(editingId, patch);
        if (warning) {
          toast.warning(warning, { duration: 12_000 });
        }
        setEditOpen(false);
        resetForm();
        setFormError(null);
        router.refresh();
        if (selectedId === editingId) void loadPanel(editingId);
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not update monitor"
        );
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Remove this monitor and its history?")) return;
    setFormError(null);
    startTransition(async () => {
      try {
        await deleteMonitor(id);
        if (selectedId === id) setSelectedId(null);
        router.refresh();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not delete monitor"
        );
      }
    });
  }

  function handleCheckNow(id: string) {
    setFormError(null);
    startTransition(async () => {
      try {
        await runSingleMonitorCheckNow(id);
        router.refresh();
        if (selectedId === id) void loadPanel(id);
      } catch (err) {
        setFormError(err instanceof Error ? err.message : "Could not run check");
      }
    });
  }

  function togglePaused(id: string, next: boolean) {
    setFormError(null);
    startTransition(async () => {
      try {
        await setMonitorPaused(id, next);
        setMonitors((prev) =>
          prev.map((m) => (m.id === id ? { ...m, paused: next } : m))
        );
        router.refresh();
      } catch (err) {
        setFormError(
          err instanceof Error ? err.message : "Could not update pause state"
        );
      }
    });
  }

  const filterTabs: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "operational", label: "Up" },
    { id: "down", label: "Down" },
    { id: "degraded", label: "Degraded" },
    { id: "pending", label: "Pending" },
  ];

  const formFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="np-mon-name" className="text-[#e6edf3]">
          Monitor name
        </Label>
        <Input
          id="np-mon-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-[#21262d] bg-[#161b22] text-[#e6edf3] placeholder:text-[#484f58]"
          placeholder="e.g. API gateway"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="np-mon-url" className="text-[#e6edf3]">
          URL
        </Label>
        <Input
          id="np-mon-url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border-[#21262d] bg-[#161b22] text-[#e6edf3] placeholder:text-[#484f58]"
          placeholder="https://example.com"
          autoComplete="off"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[#e6edf3]">Type</Label>
        <Select
          value={monitorType}
          onValueChange={(v) => setMonitorType(v as MonitorType)}
        >
          <SelectTrigger className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectItem value="http">HTTP</SelectItem>
            <SelectItem value="https">HTTPS</SelectItem>
            <SelectItem value="ping">Ping</SelectItem>
            <SelectItem value="tcp">TCP</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-[#e6edf3]">Check interval</Label>
        <Select
          value={String(intervalMin)}
          onValueChange={(v) =>
            setIntervalMin(Number(v) as CheckIntervalMinutes)
          }
        >
          <SelectTrigger className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectItem value="1">1 minute</SelectItem>
            <SelectItem value="5">5 minutes</SelectItem>
            <SelectItem value="10">10 minutes</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="np-mon-email" className="text-[#e6edf3]">
          Notification email
        </Label>
        <Input
          id="np-mon-email"
          type="email"
          value={notificationEmail}
          onChange={(e) => setNotificationEmail(e.target.value)}
          className="border-[#21262d] bg-[#161b22] text-[#e6edf3] placeholder:text-[#484f58]"
          placeholder="ops@company.com (optional)"
          autoComplete="email"
        />
        <p className="text-xs leading-relaxed text-[#8b949e]">
          Default alert email is set under Settings → Integrations. This field
          overrides the recipient for this monitor once it is stored (requires
          DB column from{" "}
          <code className="rounded bg-[#21262d] px-1 font-mono text-[10px] text-[#e6edf3]">
            003_monitor_notification_pause.sql
          </code>
          ).
        </p>
      </div>
    </>
  );


  return (
    <div className="min-h-full bg-[#0d1117] pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#e6edf3]">
              Monitors
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#8b949e]">
              Track the uptime and health of your services
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              resetForm();
              setFormError(null);
              setAddOpen(true);
            }}
            disabled={isPending}
            className="h-11 shrink-0 gap-2 rounded-lg border-0 bg-[#22d3ee] px-6 text-sm font-semibold text-[#0d1117] shadow-lg shadow-[#22d3ee]/20 transition hover:bg-[#06b6d4]"
          >
            Add Monitor
            <Plus className="size-4" strokeWidth={2.5} aria-hidden />
          </Button>
        </header>

        {formError ? (
          <div
            className="mt-6 rounded-lg border border-[#f85149]/40 bg-[#f85149]/10 px-4 py-3 text-sm text-[#f85149]"
            role="alert"
          >
            {formError}
          </div>
        ) : null}

        <section
          className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
          aria-label="Monitor statistics"
        >
          <StatTopCard
            label="Total Monitors"
            value={stats.total}
            valueClass="text-[#e6edf3]"
            icon={MonitorIcon}
          />
          <StatTopCard
            label="Monitors Up"
            value={stats.up}
            valueClass="text-[#3fb950]"
            icon={TrendingUp}
          />
          <StatTopCard
            label="Monitors Down"
            value={stats.down}
            valueClass="text-[#f85149]"
            icon={TrendingDown}
          />
          <StatTopCard
            label="Average Uptime %"
            value={`${stats.avgUptimePct.toFixed(1)}%`}
            valueClass="text-[#22d3ee]"
            icon={Activity}
          />
        </section>

        {monitors.length > 0 ? (
          <>
            <div className="mt-10 space-y-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#484f58]"
                  aria-hidden
                />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or URL…"
                  className="h-11 border-[#21262d] bg-[#161b22] pl-10 text-[#e6edf3] placeholder:text-[#484f58]"
                  aria-label="Search monitors"
                />
              </div>
              <div
                className="flex flex-wrap gap-1 border-b border-[#21262d]"
                role="tablist"
              >
                {filterTabs.map((tab) => {
                  const active = filterTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setFilterTab(tab.id)}
                      className={cn(
                        "relative px-4 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "text-[#22d3ee]"
                          : "text-[#8b949e] hover:text-[#e6edf3]"
                      )}
                    >
                      {tab.label}
                      {active ? (
                        <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#22d3ee]" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>

            <ul
              className="mt-6 divide-y divide-[#21262d] overflow-hidden rounded-xl border border-[#21262d] bg-[#0d1117]"
              aria-label="Monitors list"
            >
              {filtered.length === 0 ? (
                <li className="px-6 py-12 text-center text-sm text-[#8b949e]">
                  No monitors match your search or filter.
                </li>
              ) : (
                filtered.map((m) => (
                  <li key={m.id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedId(m.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedId(m.id);
                        }
                      }}
                      className={cn(
                        "flex cursor-pointer flex-col gap-4 px-4 py-4 transition-colors sm:flex-row sm:items-center sm:gap-6 sm:px-5",
                        "hover:bg-[#161b22]",
                        selectedId === m.id && "bg-[#161b22]/80"
                      )}
                    >
                      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
                        <span
                          className={cn(
                            "mt-1.5 size-2.5 shrink-0 rounded-full sm:mt-0 animate-np-pulse-dot",
                            m.status === "operational" && "bg-[#3fb950]",
                            m.status === "degraded" && "bg-[#f0b429]",
                            m.status === "down" && "bg-[#f85149]",
                            m.status === "pending" && "bg-[#484f58]"
                          )}
                          aria-hidden
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-[#e6edf3]">{m.name}</p>
                          <p className="truncate font-mono text-xs text-[#484f58]">
                            {m.url}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                        <span className="rounded-full border border-[#21262d] bg-[#161b22] px-2.5 py-0.5 text-xs font-medium text-[#8b949e]">
                          {typePillLabel(m.monitorType)}
                        </span>
                        <StatusBadge status={m.status} />
                      </div>
                      <div className="flex flex-wrap items-end gap-6 sm:shrink-0">
                        <div>
                          <p className="text-xs font-medium text-[#8b949e]">
                            Uptime
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-[#e6edf3]">
                            {m.uptimePct.toFixed(1)}%
                          </p>
                          <UptimeMiniBar pct={m.uptimePct} />
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#8b949e]">
                            Response
                          </p>
                          <p className="text-sm font-semibold tabular-nums text-[#22d3ee]">
                            {m.lastResponseMs != null
                              ? `${m.lastResponseMs} ms`
                              : "—"}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-[#8b949e]">
                            Last checked
                          </p>
                          <p className="text-sm text-[#8b949e]">
                            {formatRelativeTimeFriendly(m.lastChecked)}
                          </p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 shrink-0 border-[#21262d] bg-[#161b22] text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Monitor actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            align="end"
                            className="min-w-[10rem] border-[#21262d] bg-[#161b22]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <DropdownMenuItem
                              className="cursor-pointer text-[#e6edf3] focus:bg-[#21262d]"
                              disabled={isPending || m.paused}
                              onClick={() => handleCheckNow(m.id)}
                            >
                              Check Now
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="cursor-pointer text-[#e6edf3] focus:bg-[#21262d]"
                              onClick={() => openEdit(m)}
                            >
                              <Pencil className="mr-2 inline size-4 opacity-70" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator className="bg-[#21262d]" />
                            <DropdownMenuItem
                              className="cursor-pointer text-[#f85149] focus:bg-[#f85149]/10 focus:text-[#f85149]"
                              onClick={() => handleDelete(m.id)}
                            >
                              <Trash2 className="mr-2 inline size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </li>
                ))
              )}
            </ul>
          </>
        ) : (
          <div className="mt-16 flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#21262d] bg-[#161b22]/40 px-6 py-20 text-center">
            <MonitorEmptyIllustration />
            <h2 className="mt-8 font-heading text-xl font-bold text-[#e6edf3]">
              No monitors yet
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[#8b949e]">
              Add your first monitor to start tracking uptime
            </p>
            <Button
              type="button"
              onClick={() => {
                resetForm();
                setFormError(null);
                setAddOpen(true);
              }}
              className="mt-8 h-11 gap-2 rounded-lg border-0 bg-[#22d3ee] px-8 text-sm font-semibold text-[#0d1117] hover:bg-[#06b6d4]"
            >
              Add Monitor
              <Plus className="size-4" />
            </Button>
          </div>
        )}
      </div>


      {selectedId && selected ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            aria-label="Close panel"
            onClick={() => setSelectedId(null)}
          />
          <aside
            className="fixed inset-0 z-50 flex w-full max-w-none flex-col border-l border-[#21262d] bg-[#161b22] shadow-2xl animate-in slide-in-from-right duration-300 sm:inset-y-0 sm:left-auto sm:max-w-md"
            role="dialog"
            aria-modal="true"
            aria-labelledby="np-panel-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#21262d] p-5">
              <div className="min-w-0">
                <h2
                  id="np-panel-title"
                  className="font-heading text-lg font-bold text-[#e6edf3]"
                >
                  {selected.name}
                </h2>
                <p className="mt-1 truncate font-mono text-xs text-[#484f58]">
                  {selected.url}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={selected.status} />
                <span className="rounded-full border border-[#21262d] bg-[#0d1117] px-2.5 py-0.5 text-xs text-[#8b949e]">
                  {typePillLabel(selected.monitorType)}
                </span>
                {selected.paused ? (
                  <span className="rounded-full border border-[#f0b429]/40 bg-[#f0b429]/10 px-2 py-0.5 text-xs font-medium text-[#f0b429]">
                    Paused
                  </span>
                ) : null}
              </div>
              <p className="mt-4 text-sm text-[#8b949e]">
                Created{" "}
                <span className="text-[#e6edf3]">
                  {selected.createdAt
                    ? selected.createdAt.toLocaleDateString(undefined, {
                        dateStyle: "medium",
                      })
                    : "—"}
                </span>
              </p>

              <MonitorsPanelChartsLazy
                panelHourly={panelHourly}
                panelLoading={panelLoading}
                panelError={panelError}
              />

              <div className="mt-8">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                  Recent checks
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-[#21262d]">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#21262d] bg-[#0d1117] text-[#484f58]">
                        <th className="px-3 py-2 font-medium">Time</th>
                        <th className="px-3 py-2 font-medium">Status</th>
                        <th className="px-3 py-2 font-medium">RT</th>
                        <th className="px-3 py-2 font-medium">Code</th>
                      </tr>
                    </thead>
                    <tbody>
                      {panelRecent.length === 0 && !panelLoading ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-3 py-6 text-center text-[#8b949e]"
                          >
                            No checks in this window yet.
                          </td>
                        </tr>
                      ) : (
                        panelRecent.map((c) => (
                          <tr
                            key={c.id}
                            className="border-b border-[#21262d] last:border-0"
                          >
                            <td className="px-3 py-2 text-[#8b949e]">
                              {c.checked_at
                                ? new Date(c.checked_at).toLocaleString(
                                    undefined,
                                    {
                                      month: "short",
                                      day: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    }
                                  )
                                : "—"}
                            </td>
                            <td className="px-3 py-2">
                              <CheckStatusBadge status={c.status} />
                            </td>
                            <td className="px-3 py-2 tabular-nums text-[#22d3ee]">
                              {c.response_time != null
                                ? `${c.response_time} ms`
                                : "—"}
                            </td>
                            <td className="px-3 py-2 tabular-nums text-[#e6edf3]">
                              {c.status_code ?? "—"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-[#21262d] pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "h-10 w-full border-[#21262d] bg-[#0d1117] font-medium",
                    selected.paused
                      ? "text-[#3fb950] hover:bg-[#3fb950]/10"
                      : "text-[#f0b429] hover:bg-[#f0b429]/10"
                  )}
                  disabled={isPending}
                  onClick={() => togglePaused(selected.id, !selected.paused)}
                >
                  {selected.paused ? "Resume monitoring" : "Pause monitoring"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-[#f85149]/50 bg-transparent font-semibold text-[#f85149] hover:bg-[#f85149]/10"
                  disabled={isPending}
                  onClick={() => {
                    handleDelete(selected.id);
                    setSelectedId(null);
                  }}
                >
                  Delete monitor
                </Button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <Dialog
        open={addOpen}
        onOpenChange={(o) => {
          setAddOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#21262d] bg-[#161b22] sm:max-w-md max-sm:fixed max-sm:inset-0 max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="text-[#e6edf3]">Add monitor</DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              New check stored in Supabase for your workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            {formError && addOpen ? (
              <p className="text-sm text-[#f85149]" role="alert">
                {formError}
              </p>
            ) : null}
            {formFields}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#21262d] bg-transparent text-[#8b949e] hover:bg-[#21262d]"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="border-0 bg-[#22d3ee] font-semibold text-[#0d1117] hover:bg-[#06b6d4]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
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

      <Dialog
        open={editOpen}
        onOpenChange={(o) => {
          setEditOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#21262d] bg-[#161b22] sm:max-w-md max-sm:fixed max-sm:inset-0 max-sm:max-h-none max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="text-[#e6edf3]">Edit monitor</DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              Update check settings for this monitor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {formError && editOpen ? (
              <p className="text-sm text-[#f85149]" role="alert">
                {formError}
              </p>
            ) : null}
            {formFields}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#21262d] bg-transparent text-[#8b949e] hover:bg-[#21262d]"
                onClick={() => setEditOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="border-0 bg-[#22d3ee] font-semibold text-[#0d1117] hover:bg-[#06b6d4]"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 inline size-4 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
