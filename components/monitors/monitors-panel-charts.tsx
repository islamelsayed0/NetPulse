"use client";

import { Loader2 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyChartPoint } from "@/lib/dashboard-utils";

const chartTooltip = {
  backgroundColor: "#161b22",
  border: "1px solid #21262d",
  borderRadius: 8,
  color: "#e6edf3",
};

export function MonitorsPanelCharts({
  panelHourly,
  panelLoading,
  panelError,
}: {
  panelHourly: HourlyChartPoint[];
  panelLoading: boolean;
  panelError: string | null;
}) {
  return (
    <>
      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
          Uptime (24h)
        </p>
        <div className="mt-3 h-[180px] w-full">
          {panelLoading ? (
            <div className="flex h-full items-center justify-center text-[#8b949e]">
              <Loader2 className="size-6 animate-spin" aria-hidden />
            </div>
          ) : panelError ? (
            <p className="text-sm text-[#f85149]">{panelError}</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={panelHourly}
                margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#21262d"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#484f58", fontSize: 9 }}
                  tickLine={false}
                  axisLine={{ stroke: "#21262d" }}
                  interval={3}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v) => `${v}%`}
                  tick={{ fill: "#484f58", fontSize: 10 }}
                  width={36}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(v) => [`${Number(v).toFixed(1)}%`, "Uptime"]}
                />
                <Bar
                  dataKey="uptimePct"
                  fill="#22d3ee"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={14}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="mt-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-[#8b949e]">
          Response time (24h)
        </p>
        <div className="mt-3 h-[180px] w-full">
          {!panelLoading && !panelError ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={panelHourly}
                margin={{ top: 8, right: 4, left: -18, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#21262d"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: "#484f58", fontSize: 9 }}
                  interval={3}
                  tickLine={false}
                  axisLine={{ stroke: "#21262d" }}
                />
                <YAxis
                  tick={{ fill: "#484f58", fontSize: 10 }}
                  width={36}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={chartTooltip}
                  formatter={(v) => [
                    v != null ? `${v} ms` : "—",
                    "Avg response",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="avgResponseMs"
                  stroke="#3fb950"
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>
    </>
  );
}
