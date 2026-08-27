"use client";

import * as React from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { Cpu, Eye, Wrench, Maximize2, Hash } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProviderInfo } from "./types";

interface ProviderChartProps {
  providers: ProviderInfo[];
}

const AXES = [
  { key: "tools", label: "Tools", icon: Wrench, max: 1 },
  { key: "vision", label: "Vision", icon: Eye, max: 1 },
  { key: "context", label: "Context", icon: Maximize2, max: 1 },
  { key: "output", label: "Output", icon: Hash, max: 1 },
  { key: "count", label: "Models", icon: Cpu, max: 1 },
];

const COLORS = ["#e07856", "#3b82f6", "#10b981", "#a855f7", "#f59e0b"];

function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(value / max, 1);
}

export function ProviderChart({ providers }: ProviderChartProps) {
  const [active, setActive] = React.useState<Set<string>>(new Set(providers.map((p) => p.id)));

  // Compute maxima for normalization
  const maxContext = Math.max(...providers.flatMap((p) => p.models.map((m) => m.contextWindow ?? 0)), 1);
  const maxOutput = Math.max(...providers.flatMap((p) => p.models.map((m) => m.maxTokens ?? 0)), 1);
  const maxModels = Math.max(...providers.map((p) => p.models.length), 1);

  const data = React.useMemo(() => {
    return AXES.map((axis) => {
      const row: Record<string, string | number> = { axis: axis.label };
      for (const p of providers) {
        if (!active.has(p.id)) continue;
        let val = 0;
        if (axis.key === "tools") {
          val = p.models.filter((m) => m.supportsTools).length / Math.max(p.models.length, 1);
        } else if (axis.key === "vision") {
          val = p.models.filter((m) => m.supportsVision).length / Math.max(p.models.length, 1);
        } else if (axis.key === "context") {
          const best = Math.max(...p.models.map((m) => m.contextWindow ?? 0), 0);
          val = normalize(best, maxContext);
        } else if (axis.key === "output") {
          const best = Math.max(...p.models.map((m) => m.maxTokens ?? 0), 0);
          val = normalize(best, maxOutput);
        } else if (axis.key === "count") {
          val = normalize(p.models.length, maxModels);
        }
        row[p.id] = Math.round(val * 100);
      }
      return row;
    });
  }, [providers, active, maxContext, maxOutput, maxModels]);

  const toggle = (id: string) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.4fr]">
      {/* Legend / toggles */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Compare providers
        </p>
        <p className="text-sm text-muted-foreground">
          Toggle providers to compare their capabilities across five normalized axes
          (0–100). Each axis is scaled to the best value in the dataset.
        </p>
        <div className="mt-3 space-y-1.5">
          {providers.map((p, i) => {
            const isOn = active.has(p.id);
            const color = COLORS[i % COLORS.length];
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => toggle(p.id)}
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-all",
                  isOn ? "border-border bg-card" : "border-dashed border-border/60 bg-transparent opacity-50",
                )}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.label}</p>
                  <p className="truncate text-[0.7rem] text-muted-foreground">
                    {p.models.length} model{p.models.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[0.65rem] text-muted-foreground">
          {AXES.map((a) => {
            const Icon = a.icon;
            return (
              <span key={a.key} className="inline-flex items-center gap-1">
                <Icon className="h-2.5 w-2.5" /> {a.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Radar chart */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="h-[340px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
              <PolarGrid stroke="var(--border)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: "var(--foreground)", fontSize: 13, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                stroke="var(--border)"
                axisLine={false}
              />
              {providers.map((p, i) =>
                active.has(p.id) ? (
                  <Radar
                    key={p.id}
                    name={p.label}
                    dataKey={p.id}
                    stroke={COLORS[i % COLORS.length]}
                    fill={COLORS[i % COLORS.length]}
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                ) : null,
              )}
              <Legend
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                iconType="square"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                formatter={(v: number) => `${v}/100`}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
