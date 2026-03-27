"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Clock,
  Info,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
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
  addIncidentUpdateAction,
  createIncidentAction,
  deleteIncidentAction,
  fetchIncidentUpdatesAction,
  resolveIncident,
  updateIncidentAction,
} from "@/lib/actions/incidents";
import { formatRelativeTimeFriendly } from "@/lib/dashboard-utils";
import type {
  IncidentListItem,
  IncidentListItemSerialized,
  IncidentSeverity,
  IncidentState,
  IncidentUpdateSerialized,
} from "@/lib/dashboard-types";
import { cn } from "@/lib/utils";

type MonitorOption = { id: string; name: string };

type FilterTab = "all" | IncidentState | IncidentSeverity;

function deserializeIncidents(
  rows: IncidentListItemSerialized[]
): IncidentListItem[] {
  return rows.map((r) => ({
    ...r,
    startedAt: new Date(r.startedAt),
    resolvedAt: r.resolvedAt ? new Date(r.resolvedAt) : null,
  }));
}

function formatDurationMs(ms: number): string {
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const rm = min % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

function computeIncidentStats(items: IncidentListItem[]) {
  const total = items.length;
  const active = items.filter((i) => i.status === "active").length;
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const resolvedToday = items.filter(
    (i) =>
      i.status === "resolved" &&
      i.resolvedAt &&
      i.resolvedAt.getTime() >= startOfDay.getTime()
  ).length;
  const resolved = items.filter((i) => i.resolvedAt && i.status === "resolved");
  let avgMs = 0;
  if (resolved.length) {
    const sum = resolved.reduce((s, i) => {
      return s + (i.resolvedAt!.getTime() - i.startedAt.getTime());
    }, 0);
    avgMs = Math.round(sum / resolved.length);
  }
  return { total, active, resolvedToday, avgMs, hasAvg: resolved.length > 0 };
}

function SeverityIcon({ severity }: { severity: IncidentSeverity }) {
  if (severity === "critical") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f85149]/15 text-[#f85149]">
        <AlertCircle className="size-4" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  if (severity === "warning") {
    return (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#f0b429]/15 text-[#f0b429]">
        <AlertTriangle className="size-4" strokeWidth={2} aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#22d3ee]/15 text-[#22d3ee]">
      <Info className="size-4" strokeWidth={2} aria-hidden />
    </span>
  );
}

function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  const styles = {
    critical: "border-[#f85149]/40 bg-[#f85149]/15 text-[#f85149]",
    warning: "border-[#f0b429]/40 bg-[#f0b429]/15 text-[#f0b429]",
    info: "border-[#22d3ee]/40 bg-[#22d3ee]/15 text-[#22d3ee]",
  } as const;
  const labels = { critical: "Critical", warning: "Warning", info: "Info" };
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        styles[severity]
      )}
    >
      {labels[severity]}
    </span>
  );
}

function StatusBadge({ status }: { status: IncidentState }) {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f85149]/40 bg-[#f85149]/10 px-2.5 py-0.5 text-xs font-semibold text-[#f85149]">
        <span className="size-1.5 animate-pulse rounded-full bg-[#f85149]" />
        Active
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full border border-[#3fb950]/40 bg-[#3fb950]/15 px-2.5 py-0.5 text-xs font-semibold text-[#3fb950]">
      Resolved
    </span>
  );
}

function StatCard({
  label,
  value,
  valueClass,
  topAccent,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  valueClass: string;
  topAccent: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[#21262d] bg-[#161b22] p-5 shadow-sm">
      <div className={cn("absolute inset-x-0 top-0 h-[3px]", topAccent)} aria-hidden />
      <div className="flex items-start justify-between gap-3 pt-0.5">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
            {label}
          </p>
          <p
            className={cn(
              "mt-2 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl",
              valueClass
            )}
          >
            {value}
          </p>
        </div>
        <div className="shrink-0 rounded-lg border border-[#21262d] bg-[#0d1117]/80 p-2.5 text-[#8b949e]">
          <Icon className="size-5" strokeWidth={1.75} aria-hidden />
        </div>
      </div>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <div className="relative mx-auto flex size-28 items-center justify-center rounded-2xl border border-[#3fb950]/30 bg-[#161b22]">
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        className="text-[#3fb950]"
        aria-hidden
      >
        <path
          d="M32 8L12 18v16c0 11 8.5 20.5 20 22 11.5-1.5 20-11 20-22V18L32 8z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M24 32l6 6 12-14"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className="absolute -bottom-1 right-2 flex size-3 rounded-full bg-[#3fb950] ring-2 ring-[#0d1117]" />
    </div>
  );
}


export function IncidentsView({
  initialIncidents,
  monitorOptions,
}: {
  initialIncidents: IncidentListItemSerialized[];
  monitorOptions: MonitorOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [incidents, setIncidents] = useState(() =>
    deserializeIncidents(initialIncidents)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<
    "all" | "active" | "resolved" | "critical" | "warning"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<IncidentSeverity>("warning");
  const [monitorId, setMonitorId] = useState<string>("");

  const [panelUpdates, setPanelUpdates] = useState<IncidentUpdateSerialized[]>(
    []
  );
  const [panelLoading, setPanelLoading] = useState(false);
  const [updateDraft, setUpdateDraft] = useState("");

  useEffect(() => {
    setIncidents(deserializeIncidents(initialIncidents));
  }, [initialIncidents]);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId]
  );

  const loadUpdates = useCallback(async (id: string) => {
    setPanelLoading(true);
    try {
      const u = await fetchIncidentUpdatesAction(id);
      setPanelUpdates(u);
    } catch {
      setPanelUpdates([]);
    } finally {
      setPanelLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPanelUpdates([]);
      setUpdateDraft("");
      return;
    }
    void loadUpdates(selectedId);
  }, [selectedId, loadUpdates]);

  const stats = useMemo(() => computeIncidentStats(incidents), [incidents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return incidents.filter((i) => {
      if (filterTab === "active" && i.status !== "active") return false;
      if (filterTab === "resolved" && i.status !== "resolved") return false;
      if (filterTab === "critical" && i.severity !== "critical") return false;
      if (filterTab === "warning" && i.severity !== "warning") return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        i.monitorName.toLowerCase().includes(q)
      );
    });
  }, [incidents, search, filterTab]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setSeverity("warning");
    setMonitorId(monitorOptions[0]?.id ?? "");
    setEditingId(null);
  }

  useEffect(() => {
    if (monitorOptions.length && !monitorId) {
      setMonitorId(monitorOptions[0].id);
    }
  }, [monitorOptions, monitorId]);

  function openCreate() {
    resetForm();
    setFormError(null);
    setCreateOpen(true);
  }

  function openEdit(i: IncidentListItem) {
    setEditingId(i.id);
    setTitle(i.title);
    setDescription(i.description ?? "");
    setSeverity(i.severity);
    setMonitorId(i.monitorId);
    setFormError(null);
    setEditOpen(true);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || !monitorId) return;
    setFormError(null);
    startTransition(async () => {
      try {
        await createIncidentAction({
          monitor_id: monitorId,
          title: t,
          description: description.trim() || null,
          severity,
        });
        setCreateOpen(false);
        resetForm();
        router.refresh();
        toast.success("Incident created.");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not create incident";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    const t = title.trim();
    if (!t || !monitorId) return;
    setFormError(null);
    startTransition(async () => {
      try {
        await updateIncidentAction(editingId, {
          title: t,
          description: description.trim() || null,
          severity,
          monitor_id: monitorId,
        });
        setEditOpen(false);
        resetForm();
        router.refresh();
        if (selectedId === editingId) void loadUpdates(editingId);
        toast.success("Incident updated.");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not update incident";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  function handleResolve(id: string) {
    setFormError(null);
    startTransition(async () => {
      try {
        await resolveIncident(id);
        router.refresh();
        if (selectedId === id) void loadUpdates(id);
        toast.success("Incident resolved.");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not resolve incident";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm("Delete this incident permanently?")) return;
    setFormError(null);
    startTransition(async () => {
      try {
        await deleteIncidentAction(id);
        if (selectedId === id) setSelectedId(null);
        router.refresh();
        toast.success("Incident deleted.");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not delete incident";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  function handleAddUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    const text = updateDraft.trim();
    if (!text) return;
    setFormError(null);
    startTransition(async () => {
      try {
        await addIncidentUpdateAction(selectedId, text);
        setUpdateDraft("");
        router.refresh();
        void loadUpdates(selectedId);
        toast.success("Update posted.");
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Could not add update";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  const filterTabs: {
    id: typeof filterTab;
    label: string;
  }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Active" },
    { id: "resolved", label: "Resolved" },
    { id: "critical", label: "Critical" },
    { id: "warning", label: "Warning" },
  ];

  const incidentFormFields = (
    <>
      <div className="space-y-2">
        <Label htmlFor="inc-title" className="text-[#e6edf3]">
          Title
        </Label>
        <Input
          id="inc-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border-[#21262d] bg-[#161b22] text-[#e6edf3]"
          placeholder="Short summary"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-[#e6edf3]">Affected monitor</Label>
        <Select value={monitorId} onValueChange={setMonitorId}>
          <SelectTrigger className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectValue placeholder="Select monitor" />
          </SelectTrigger>
          <SelectContent className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            {monitorOptions.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label className="text-[#e6edf3]">Severity</Label>
        <Select
          value={severity}
          onValueChange={(v) => setSeverity(v as IncidentSeverity)}
        >
          <SelectTrigger className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-[#21262d] bg-[#161b22] text-[#e6edf3]">
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inc-desc" className="text-[#e6edf3]">
          Description
        </Label>
        <textarea
          id="inc-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="w-full resize-none rounded-lg border border-[#21262d] bg-[#161b22] px-3 py-2 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]/40"
          placeholder="What happened?"
        />
      </div>
    </>
  );

  return (
    <div className="min-h-full bg-[#0d1117] pb-16">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold tracking-tight text-[#e6edf3]">
              Incidents
            </h1>
            <p className="mt-2 max-w-xl text-sm text-[#8b949e]">
              Track and resolve outages across your infrastructure
            </p>
          </div>
          <Button
            type="button"
            onClick={openCreate}
            disabled={isPending || monitorOptions.length === 0}
            className="h-11 shrink-0 gap-2 rounded-lg border-0 bg-[#22d3ee] px-6 text-sm font-semibold text-[#0d1117] shadow-lg shadow-[#22d3ee]/20 hover:bg-[#06b6d4]"
          >
            Create Incident
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
          aria-label="Incident statistics"
        >
          <StatCard
            label="Total Incidents"
            value={stats.total}
            valueClass="text-[#e6edf3]"
            topAccent="bg-[#22d3ee]"
            icon={AlertTriangle}
          />
          <StatCard
            label="Active Incidents"
            value={stats.active}
            valueClass="text-[#f85149]"
            topAccent="bg-[#f85149]"
            icon={AlertCircle}
          />
          <StatCard
            label="Resolved Today"
            value={stats.resolvedToday}
            valueClass="text-[#3fb950]"
            topAccent="bg-[#22d3ee]"
            icon={Info}
          />
          <StatCard
            label="Avg Resolution Time"
            value={
              stats.hasAvg ? formatDurationMs(stats.avgMs) : "—"
            }
            valueClass="text-[#22d3ee]"
            topAccent="bg-[#22d3ee]"
            icon={Clock}
          />
        </section>


        {incidents.length > 0 ? (
          <>
            <div className="mt-10 space-y-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#484f58]" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by title or service…"
                  className="h-11 border-[#21262d] bg-[#161b22] pl-10 text-[#e6edf3]"
                  aria-label="Search incidents"
                />
              </div>
              <div className="flex flex-wrap gap-1 border-b border-[#21262d]" role="tablist">
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

            <ul className="mt-6 space-y-3" aria-label="Incidents timeline">
              {filtered.length === 0 ? (
                <li className="rounded-xl border border-[#21262d] bg-[#161b22] px-6 py-12 text-center text-sm text-[#8b949e]">
                  No incidents match your search or filter.
                </li>
              ) : (
                filtered.map((i) => {
                  const end = i.resolvedAt ?? new Date();
                  const durMs = end.getTime() - i.startedAt.getTime();
                  const durationLabel = formatDurationMs(durMs);
                  return (
                    <li key={i.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedId(i.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setSelectedId(i.id);
                          }
                        }}
                        className={cn(
                          "flex cursor-pointer flex-col gap-4 rounded-xl border border-[#21262d] bg-[#161b22] p-4 transition-all hover:border-[#21262d]/80 hover:bg-[#161b22]/90 sm:flex-row sm:items-start sm:gap-5 sm:p-5",
                          selectedId === i.id && "ring-1 ring-[#22d3ee]/40"
                        )}
                      >
                        <SeverityIcon severity={i.severity} />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <SeverityBadge severity={i.severity} />
                            <StatusBadge status={i.status} />
                          </div>
                          <h3 className="font-bold text-[#e6edf3]">{i.title}</h3>
                          <p className="text-sm font-medium text-[#8b949e]">
                            {i.monitorName}
                          </p>
                          {i.description ? (
                            <p className="text-sm leading-relaxed text-[#484f58]">
                              {i.description}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-[#8b949e]">
                            <span>
                              Started{" "}
                              <span className="text-[#e6edf3]">
                                {formatRelativeTimeFriendly(i.startedAt)}
                              </span>
                            </span>
                            {i.resolvedAt ? (
                              <span>
                                Resolved{" "}
                                <span className="text-[#e6edf3]">
                                  {formatRelativeTimeFriendly(i.resolvedAt)}
                                </span>
                              </span>
                            ) : null}
                            <span>
                              Duration{" "}
                              <span className="font-medium text-[#22d3ee]">
                                {durationLabel}
                              </span>
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
                          {i.status === "active" ? (
                            <Button
                              type="button"
                              size="sm"
                              className="border-0 bg-[#3fb950] font-semibold text-[#0d1117] hover:bg-[#3fb950]/90"
                              disabled={isPending}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResolve(i.id);
                              }}
                            >
                              {isPending ? (
                                <>
                                  <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                                  Resolving…
                                </>
                              ) : (
                                "Resolve"
                              )}
                            </Button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 border-[#21262d] bg-[#0d1117] text-[#8b949e]"
                                onClick={(e) => e.stopPropagation()}
                                aria-label="Incident actions"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                              align="end"
                              className="border-[#21262d] bg-[#161b22]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <DropdownMenuItem
                                className="text-[#e6edf3] focus:bg-[#21262d]"
                                onClick={() => setSelectedId(i.id)}
                              >
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-[#e6edf3] focus:bg-[#21262d]"
                                onClick={() => openEdit(i)}
                              >
                                <Pencil className="mr-2 inline size-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#21262d]" />
                              <DropdownMenuItem
                                className="text-[#f85149] focus:bg-[#f85149]/10"
                                onClick={() => handleDelete(i.id)}
                              >
                                <Trash2 className="mr-2 inline size-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </>
        ) : (
          <div className="mt-16 flex flex-col items-center rounded-2xl border border-dashed border-[#21262d] bg-[#161b22]/40 px-6 py-20 text-center">
            <EmptyIllustration />
            <h2 className="mt-8 font-heading text-xl font-bold text-[#e6edf3]">
              No incidents reported
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[#8b949e]">
              Your infrastructure is running smoothly
            </p>
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
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-[#21262d] bg-[#161b22] shadow-2xl animate-in slide-in-from-right duration-300"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inc-panel-title"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[#21262d] p-5">
              <div className="min-w-0">
                <h2
                  id="inc-panel-title"
                  className="font-heading text-lg font-bold text-[#e6edf3]"
                >
                  {selected.title}
                </h2>
                <p className="mt-2 text-sm text-[#8b949e]">{selected.monitorName}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-[#8b949e] hover:bg-[#21262d] hover:text-[#e6edf3]"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <div className="flex flex-wrap gap-2">
                <SeverityBadge severity={selected.severity} />
                <StatusBadge status={selected.status} />
              </div>
              {selected.description ? (
                <p className="mt-4 text-sm leading-relaxed text-[#484f58]">
                  {selected.description}
                </p>
              ) : null}

              <h3 className="mt-8 text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
                Timeline
              </h3>
              <div className="relative mt-4 pl-6">
                <div className="absolute bottom-2 left-[7px] top-2 w-px bg-[#21262d]" aria-hidden />
                <ul className="space-y-6">
                  <li className="relative">
                    <span className="absolute -left-6 top-1 size-2 rounded-full bg-[#22d3ee]" />
                    <p className="text-xs font-medium text-[#8b949e]">Incident created</p>
                    <p className="text-sm text-[#e6edf3]">
                      {selected.startedAt.toLocaleString(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </li>
                  {panelLoading ? (
                    <li className="flex items-center gap-2 text-sm text-[#8b949e]">
                      <Loader2 className="size-4 animate-spin" />
                      Loading updates…
                    </li>
                  ) : (
                    panelUpdates.map((u) => (
                      <li key={u.id} className="relative">
                        <span className="absolute -left-6 top-1 size-2 rounded-full bg-[#8b949e]" />
                        <p className="text-xs font-medium text-[#8b949e]">
                          Update added
                        </p>
                        <p className="text-sm text-[#e6edf3]">{u.body}</p>
                        <p className="mt-1 text-xs text-[#484f58]">
                          {new Date(u.createdAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </li>
                    ))
                  )}
                  {selected.status === "resolved" && selected.resolvedAt ? (
                    <li className="relative">
                      <span className="absolute -left-6 top-1 size-2 rounded-full bg-[#3fb950]" />
                      <p className="text-xs font-medium text-[#3fb950]">
                        Incident resolved
                      </p>
                      <p className="text-sm text-[#e6edf3]">
                        {selected.resolvedAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </li>
                  ) : null}
                </ul>
              </div>

              <form onSubmit={handleAddUpdate} className="mt-8 space-y-3 border-t border-[#21262d] pt-6">
                <Label htmlFor="inc-update" className="text-[#e6edf3]">
                  Add update
                </Label>
                <textarea
                  id="inc-update"
                  value={updateDraft}
                  onChange={(e) => setUpdateDraft(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#21262d] bg-[#161b22] px-3 py-2 text-sm text-[#e6edf3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#22d3ee]/40"
                  placeholder="Status update for your team…"
                />
                <Button
                  type="submit"
                  disabled={isPending || !updateDraft.trim()}
                  className="border-0 bg-[#22d3ee] font-semibold text-[#0d1117] hover:bg-[#06b6d4]"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                      Posting…
                    </>
                  ) : (
                    "Post update"
                  )}
                </Button>
              </form>

              <div className="mt-6 flex flex-col gap-2">
                {selected.status === "active" ? (
                  <Button
                    type="button"
                    className="h-10 w-full border-0 bg-[#3fb950] font-semibold text-[#0d1117] hover:bg-[#3fb950]/90"
                    disabled={isPending}
                    onClick={() => handleResolve(selected.id)}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                        Resolving…
                      </>
                    ) : (
                      "Resolve incident"
                    )}
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full border-[#f85149]/50 font-semibold text-[#f85149] hover:bg-[#f85149]/10"
                  disabled={isPending}
                  onClick={() => {
                    handleDelete(selected.id);
                    setSelectedId(null);
                  }}
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-2 inline size-4 animate-spin" aria-hidden />
                      Deleting…
                    </>
                  ) : (
                    "Delete incident"
                  )}
                </Button>
              </div>
            </div>
          </aside>
        </>
      ) : null}

      <Dialog
        open={createOpen}
        onOpenChange={(o) => {
          setCreateOpen(o);
          if (!o) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#21262d] bg-[#161b22] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e6edf3]">Create incident</DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              Log a new incident linked to a monitor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            {formError && createOpen ? (
              <p className="text-sm text-[#f85149]" role="alert">
                {formError}
              </p>
            ) : null}
            {incidentFormFields}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#21262d] bg-transparent text-[#8b949e]"
                onClick={() => setCreateOpen(false)}
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
                  "Create"
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
        <DialogContent className="max-h-[90vh] overflow-y-auto border-[#21262d] bg-[#161b22] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#e6edf3]">Edit incident</DialogTitle>
            <DialogDescription className="text-[#8b949e]">
              Update incident fields.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            {formError && editOpen ? (
              <p className="text-sm text-[#f85149]" role="alert">
                {formError}
              </p>
            ) : null}
            {incidentFormFields}
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="border-[#21262d] bg-transparent text-[#8b949e]"
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
                  "Save"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
