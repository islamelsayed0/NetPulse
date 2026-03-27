"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { UptimeDayPoint } from "@/lib/data/monitors";

const chartTooltipStyle = {
  backgroundColor: "#161b22",
  border: "1px solid #21262d",
  borderRadius: 8,
  color: "#e6edf3",
};

export function DashboardUptimeChart({ data }: { data: UptimeDayPoint[] }) {
  return (
    <div className="h-[240px] w-full min-w-0 sm:h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#21262d"
            vertical={false}
          />
          <XAxis
            dataKey="day"
            tick={{ fill: "#8b949e", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#21262d" }}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fill: "#8b949e", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "#21262d" }}
            width={44}
          />
          <Tooltip
            contentStyle={chartTooltipStyle}
            labelStyle={{ color: "#8b949e", fontSize: 12 }}
            formatter={(value) => [`${Number(value).toFixed(2)}%`, "Uptime"]}
          />
          <Bar
            dataKey="uptimePct"
            fill="#22d3ee"
            radius={[4, 4, 0, 0]}
            maxBarSize={48}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
