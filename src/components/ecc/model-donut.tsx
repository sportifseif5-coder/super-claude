"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Loader2, PieChart as PieIcon } from "lucide-react";
import type { ModelDistribution } from "./types";

export function ModelDonut() {
  const [data, setData] = React.useState<ModelDistribution[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hovered, setHovered] = React.useState<number | null>(null);

  React.useEffect(() => {
    fetch("/api/ecc/models")
      .then((r) => r.json())
      .then((d) => {
        setData(d.distribution ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const total = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <PieIcon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Model distribution</h3>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {total} agents
        </span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center">
          {/* Donut */}
          <div className="relative h-[180px] w-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="count"
                  nameKey="model"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={3}
                  onMouseEnter={(_, i) => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {data.map((d, i) => (
                    <Cell
                      key={i}
                      fill={d.color}
                      stroke="var(--card)"
                      strokeWidth={2}
                      opacity={hovered === null || hovered === i ? 1 : 0.4}
                      style={{ transition: "opacity 0.15s" }}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                  formatter={(v: number, _name, entry) => {
                    const pct = total > 0 ? Math.round((v / total) * 100) : 0;
                    return [`${v} agents (${pct}%)`, entry?.payload?.model ?? ""];
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">
                {hovered !== null ? data[hovered]?.count : total}
              </span>
              <span className="text-[0.65rem] text-muted-foreground">
                {hovered !== null ? data[hovered]?.model : "total"}
              </span>
            </div>
          </div>
          {/* Legend */}
          <div className="flex flex-col gap-2">
            {data.map((d, i) => (
              <button
                key={d.model}
                type="button"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                className="flex items-center gap-2 rounded-md px-2 py-1 text-left transition-colors hover:bg-accent/40"
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{
                    backgroundColor: d.color,
                    opacity: hovered === null || hovered === i ? 1 : 0.4,
                  }}
                />
                <span className="font-mono text-sm font-medium">{d.model}</span>
                <span className="text-xs text-muted-foreground">
                  {d.count} · {total > 0 ? Math.round((d.count / total) * 100) : 0}%
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
