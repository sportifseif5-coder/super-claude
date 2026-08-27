"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Trophy, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { SkillScore } from "./types";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
  B: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
  C: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/30",
  D: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30",
};

export function SkillScores() {
  const [scores, setScores] = React.useState<SkillScore[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [expanded, setExpanded] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/ecc/scores")
      .then((r) => r.json())
      .then((d) => {
        setScores(d.scores ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const top10 = scores.slice(0, 10);
  const gradeCounts = {
    A: scores.filter((s) => s.grade === "A").length,
    B: scores.filter((s) => s.grade === "B").length,
    C: scores.filter((s) => s.grade === "C").length,
    D: scores.filter((s) => s.grade === "D").length,
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Skill effectiveness scores</h3>
        </div>
        {!loading && (
          <div className="flex items-center gap-1.5">
            {["A", "B", "C", "D"].map((g) => (
              <span
                key={g}
                className={cn(
                  "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.6rem] font-medium",
                  GRADE_COLORS[g],
                )}
              >
                {g}: {gradeCounts[g as keyof typeof gradeCounts]}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Scoring 286 skills…
        </div>
      ) : (
        <div className="space-y-1">
          {top10.map((s, i) => (
            <motion.div
              key={s.slug}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <button
                type="button"
                onClick={() => setExpanded(expanded === s.slug ? null : s.slug)}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-accent/40"
              >
                <span className="w-5 text-center font-mono text-xs text-muted-foreground">
                  {i + 1}
                </span>
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-xs font-bold",
                    GRADE_COLORS[s.grade],
                  )}
                >
                  {s.grade}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-mono text-xs font-medium">{s.name}</span>
                  <span className="mt-0.5 block h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <span
                      className="block h-full rounded-full transition-all"
                      style={{
                        width: `${s.score}%`,
                        backgroundColor:
                          s.grade === "A"
                            ? "#10b981"
                            : s.grade === "B"
                              ? "#f59e0b"
                              : s.grade === "C"
                                ? "#f97316"
                                : "#ef4444",
                      }}
                    />
                  </span>
                </span>
                <span className="w-8 text-right font-mono text-xs tabular-nums">{s.score}</span>
              </button>
              {expanded === s.slug && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="ml-10 mb-1 overflow-hidden"
                >
                  <div className="grid gap-0.5 rounded-md bg-muted/30 p-2 text-[0.65rem]">
                    {s.breakdown.map((b) => (
                      <div key={b.label} className="flex items-center justify-between">
                        <span className="text-muted-foreground">{b.label}</span>
                        <span
                          className={cn(
                            "font-mono font-medium",
                            b.points > 0 ? "text-emerald-500" : "text-muted-foreground/50",
                          )}
                        >
                          +{b.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {!loading && (
        <p className="mt-3 flex items-center gap-1 text-[0.65rem] text-muted-foreground">
          <TrendingUp className="h-3 w-3" />
          Top 10 of {scores.length} skills. Scores: "When to Use" (+20), "How it Works" (+20),
          examples (+20), argument-hint (+10), rich description (+10), first-party (+10), depth (+10).
        </p>
      )}
    </div>
  );
}
