"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Webhook,
  Search,
  Loader2,
  X,
  Shield,
  Zap,
  Clock,
  ArrowRight,
  Filter,
  FileJson,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "./code-block";
import type { HookEntry, HooksData } from "./types";

const PHASE_COLORS: Record<string, string> = {
  lifecycle: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  preflight: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  postflight: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  other: "bg-muted text-muted-foreground border-border",
};

const EVENT_ORDER = [
  "SessionStart",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "PreCompact",
  "Stop",
  "SessionEnd",
];

export function HooksExplorer() {
  const [data, setData] = React.useState<HooksData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [activeEvent, setActiveEvent] = React.useState<string | "all">("all");
  const [activePhase, setActivePhase] = React.useState<string | "all">("all");
  const [selected, setSelected] = React.useState<HookEntry | null>(null);
  const [view, setView] = React.useState<"cards" | "raw">("cards");
  const [rawContent, setRawContent] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/ecc/hooks")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    if (view === "raw" && rawContent === null) {
      fetch("/api/ecc/hooks-raw")
        .then((r) => r.json())
        .then((d) => setRawContent(d.content ?? ""))
        .catch(() => setRawContent(""));
    }
  }, [view, rawContent]);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    return data.hooks.filter((h) => {
      if (activeEvent !== "all" && h.event !== activeEvent) return false;
      const phase = data.events.find((e) => e.event === h.event)?.phase ?? "other";
      if (activePhase !== "all" && phase !== activePhase) return false;
      if (query.trim()) {
        const q = query.toLowerCase();
        return (
          h.id.toLowerCase().includes(q) ||
          h.description.toLowerCase().includes(q) ||
          h.matcher.toLowerCase().includes(q) ||
          h.script.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [data, query, activeEvent, activePhase]);

  const phases = React.useMemo(() => {
    if (!data) return [];
    const seen = new Map<string, number>();
    for (const e of data.events) {
      seen.set(e.phase, (seen.get(e.phase) ?? 0) + e.count);
    }
    return Array.from(seen.entries());
  }, [data]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={activeEvent === "all" ? "default" : "outline"}
            onClick={() => setActiveEvent("all")}
            className="h-7"
          >
            All events
            <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 text-[0.65rem] tabular-nums">
              {data?.totalHooks ?? "—"}
            </span>
          </Button>
          {data &&
            EVENT_ORDER.filter((e) => data.events.some((ev) => ev.event === e)).map((e) => {
              const ev = data.events.find((x) => x.event === e)!;
              const isActive = activeEvent === e;
              return (
                <Button
                  key={e}
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  onClick={() => setActiveEvent(isActive ? "all" : e)}
                  className="h-7 font-mono text-xs"
                >
                  {e}
                  <span className="ml-1.5 rounded-full bg-primary-foreground/20 px-1.5 text-[0.65rem] tabular-nums">
                    {ev.count}
                  </span>
                </Button>
              );
            })}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 lg:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter hooks…"
              className="h-9 pl-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="hidden items-center gap-1 sm:flex">
            <Filter className="h-3.5 w-3.5 text-muted-foreground" />
            <Button
              size="sm"
              variant={activePhase === "all" ? "ghost" : "secondary"}
              onClick={() => setActivePhase("all")}
              className="h-7 text-xs"
            >
              all
            </Button>
            {phases.map(([phase, count]) => (
              <Button
                key={phase}
                size="sm"
                variant={activePhase === phase ? "secondary" : "ghost"}
                onClick={() => setActivePhase(activePhase === phase ? "all" : phase)}
                className="h-7 text-xs"
              >
                {phase}
                <span className="ml-1 text-[0.6rem] text-muted-foreground">{count}</span>
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5">
            <button
              type="button"
              onClick={() => setView("cards")}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                view === "cards" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setView("raw")}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                view === "raw" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              Raw JSON
            </button>
          </div>
        </div>
      </div>

      {/* Hook grid OR raw JSON */}
      {view === "raw" ? (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <div className="flex items-center gap-2">
              <FileJson className="h-4 w-4 text-primary" />
              <span className="font-mono text-xs text-muted-foreground">hooks/hooks.json</span>
            </div>
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {rawContent ? `${rawContent.split("\n").length} lines` : "loading…"}
            </span>
          </div>
          <div className="p-3">
            {rawContent === null ? (
              <div className="flex items-center justify-center py-12 text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading raw JSON…
              </div>
            ) : (
              <CodeBlock code={rawContent} language="json" label="hooks/hooks.json" maxHeight={600} showHeader={false} />
            )}
          </div>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Parsing hooks.json…
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((h) => {
              const phase = data?.events.find((e) => e.event === h.event)?.phase ?? "other";
              return (
                <motion.button
                  key={h.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  onClick={() => setSelected(h)}
                  className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-foreground">
                      {h.id}
                    </span>
                    {h.blocking ? (
                      <Shield className="h-3.5 w-3.5 shrink-0 text-destructive" />
                    ) : (
                      <Zap className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    )}
                  </div>
                  <p className="line-clamp-2 text-xs text-muted-foreground">
                    {h.description || "No description."}
                  </p>
                  <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                    <span className={cn("rounded border px-1.5 py-0.5 text-[0.6rem] font-medium", PHASE_COLORS[phase])}>
                      {phase}
                    </span>
                    <Badge variant="outline" className="font-mono text-[0.6rem]">
                      {h.matcher}
                    </Badge>
                    {h.async && (
                      <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
                        <Zap className="h-2.5 w-2.5" /> async
                      </span>
                    )}
                    {h.timeout !== null && (
                      <span className="inline-flex items-center gap-0.5 text-[0.6rem] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" /> {h.timeout}s
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No hooks match your filters.
            </div>
          )}
        </div>
      )}

      {/* Detail dialog */}
      <AnimatePresence>
        {selected && (
          <HookDetailDialog hook={selected} onClose={() => setSelected(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

function HookDetailDialog({ hook, onClose }: { hook: HookEntry; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="ecc-scroll max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Webhook className="h-4 w-4 text-primary" />
              <span className="font-mono text-sm font-semibold">{hook.id}</span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{hook.description}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 text-xs">
          <DetailRow label="Event" value={hook.event} mono />
          <DetailRow label="Matcher" value={hook.matcher} mono />
          <DetailRow
            label="Behavior"
            value={hook.blocking ? "Blocking (exit 1)" : "Observe (exit 0)"}
            tone={hook.blocking ? "destructive" : "default"}
          />
          <DetailRow
            label="Async"
            value={hook.async ? "Yes" : "No"}
          />
          {hook.timeout !== null && (
            <DetailRow label="Timeout" value={`${hook.timeout}s`} mono />
          )}
          {hook.flags.length > 0 && (
            <DetailRow label="Flags" value={hook.flags.join(", ")} mono />
          )}
        </div>

        {hook.script && (
          <div className="mt-5">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Script
            </p>
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-3 py-2">
              <code className="truncate font-mono text-xs">{hook.script}</code>
              <ArrowRight className="ml-2 h-3 w-3 shrink-0 text-muted-foreground" />
            </div>
            <p className="mt-2 text-[0.7rem] text-muted-foreground">
              The hook command bootstraps the ECC plugin root (resolving multiple install paths)
              then dispatches to this script.
            </p>
          </div>
        )}

        <div className="mt-5 rounded-md bg-accent/50 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Convention:</span>{" "}
          Exit <code className="font-mono">1</code> only when blocking is intentional;
          otherwise exit <code className="font-mono">0</code> with an actionable message to stderr.
        </div>
      </motion.div>
    </motion.div>
  );
}

function DetailRow({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "default" | "destructive";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 px-3 py-2">
      <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-sm",
          mono && "font-mono text-xs",
          tone === "destructive" && "text-destructive font-medium",
        )}
      >
        {value}
      </p>
    </div>
  );
}
