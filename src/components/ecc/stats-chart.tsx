"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Cell,
  LabelList,
} from "recharts";
import { BarChart3 } from "lucide-react";
import type { Overview } from "./types";

interface StatsChartProps {
  overview: Overview | null;
}

const COLORS = ["#e07856", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

export function StatsChart({ overview }: StatsChartProps) {
  const data = React.useMemo(() => {
    if (!overview) return [];
    return [
      { name: "Skills", value: overview.counts.skills, fill: COLORS[0] },
      { name: "Commands", value: overview.counts.commands, fill: COLORS[1] },
      { name: "Agents", value: overview.counts.agents, fill: COLORS[2] },
      { name: "Rule Files", value: overview.counts.ruleFiles, fill: COLORS[3] },
      { name: "Rule Packs", value: overview.counts.rulePacks, fill: COLORS[4] },
      { name: "Hooks", value: overview.counts.hooks, fill: COLORS[5] },
      { name: "MCP Servers", value: overview.counts.mcpServers, fill: COLORS[6] },
      { name: "LLM Files", value: overview.counts.srcLlmFiles, fill: COLORS[7] },
      { name: "ecc2 Rust", value: overview.counts.ecc2RustFiles, fill: COLORS[0] },
    ];
  }, [overview]);

  if (!overview) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Assets by type</h3>
        </div>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {data.reduce((s, d) => s + d.value, 0)} total
        </span>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={92}
              tick={{ fill: "var(--foreground)", fontSize: 11, fontWeight: 500 }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", fillOpacity: 0.3 }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              formatter={(v: number) => [`${v} items`, "Count"]}
            />
            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{ fill: "var(--muted-foreground)", fontSize: 11, fontWeight: 600 }}
                formatter={(v: number) => v}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
