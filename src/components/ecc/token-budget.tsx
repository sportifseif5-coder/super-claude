"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Gauge, AlertTriangle, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TokenEstimate } from "./types";

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function TokenBudget() {
  const [data, setData] = React.useState<TokenEstimate | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch("/api/ecc/tokens")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Estimating token costs…
      </div>
    );
  }

  if (!data) return null;

  const pct = Math.min(data.percentUsed, 100);
  const barColor =
    pct > 75 ? "#ef4444" : pct > 50 ? "#f59e0b" : "#10b981";

  const tip =
    data.totalMcp > 15000
      ? `35 MCP servers cost ~${formatTokens(data.totalMcp)} tokens. Consider disabling unused MCPs to reclaim context.`
      : data.totalSkills > 100000
        ? `286 skills total ~${formatTokens(data.totalSkills)} tokens — but only loaded skills count. You're fine.`
        : "Your context budget looks healthy. Loading all assets would still fit in a 200k window.";

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Context budget</h3>
        </div>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {formatTokens(data.grandTotal)} / {formatTokens(data.contextWindow)} tokens
        </span>
      </div>

      {/* Budget bar */}
      <div className="mb-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="text-muted-foreground">
            If you loaded <span className="font-medium text-foreground">everything</span>:
          </span>
          <span className="font-mono font-medium" style={{ color: barColor }}>
            {pct}% used
          </span>
        </div>
        <div className="mt-1.5 h-3 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: `${pct}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full"
            style={{ backgroundColor: barColor }}
          />
        </div>
        <p className="mt-1 text-[0.6rem] text-muted-foreground">
          Based on 1 token ≈ 4 chars. Actual usage varies by model tokenizer.
        </p>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-3 gap-2">
        {[
          {
            label: "Agents",
            value: data.totalAgents,
            count: 68,
            color: "#e07856",
          },
          {
            label: "Skills",
            value: data.totalSkills,
            count: 286,
            color: "#10b981",
          },
          {
            label: "MCP Servers",
            value: data.totalMcp,
            count: 35,
            color: "#a855f7",
          },
        ].map((seg) => (
          <div
            key={seg.label}
            className="rounded-lg border border-border bg-muted/20 p-2.5"
          >
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: seg.color }} />
              <span className="text-[0.65rem] font-medium text-muted-foreground">{seg.label}</span>
            </div>
            <p className="mt-1 font-mono text-sm font-bold tabular-nums">
              {formatTokens(seg.value)}
            </p>
            <p className="text-[0.6rem] text-muted-foreground">{seg.count} items</p>
          </div>
        ))}
      </div>

      {/* Optimization tip */}
      <div
        className={cn(
          "mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs",
          pct > 50
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-300"
            : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        )}
      >
        {pct > 50 ? (
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        ) : (
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        )}
        <span>{tip}</span>
      </div>

      {/* Top 5 token-heavy agents */}
      {data.agents.length > 0 && (
        <details className="mt-3 group">
          <summary className="cursor-pointer text-[0.7rem] font-medium text-muted-foreground transition-colors hover:text-foreground">
            Top 5 heaviest agents ▾
          </summary>
          <div className="mt-2 space-y-1">
            {data.agents.slice(0, 5).map((a) => (
              <div key={a.name} className="flex items-center justify-between text-xs">
                <span className="truncate font-mono text-muted-foreground">{a.name}</span>
                <span className="ml-2 font-mono tabular-nums">{formatTokens(a.tokens)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
