"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  GitCompare,
  Lightbulb,
  Cog,
  Check,
  Minus,
  ArrowLeftRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { CatalogItem, CatalogResponse, CompareResult, CompareItem } from "./types";

interface CompareModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalog: CatalogResponse | null;
  initialA?: CatalogItem | null;
  initialB?: CatalogItem | null;
}

export function CompareModal({
  open,
  onOpenChange,
  catalog,
  initialA,
  initialB,
}: CompareModalProps) {
  const [itemA, setItemA] = React.useState<CatalogItem | null>(initialA ?? null);
  const [itemB, setItemB] = React.useState<CatalogItem | null>(initialB ?? null);
  const [result, setResult] = React.useState<CompareResult | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setItemA(initialA ?? null);
      setItemB(initialB ?? null);
    }
  }, [open, initialA, initialB]);

  React.useEffect(() => {
    if (!open || !itemA || !itemB) {
      setResult(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setResult(null);
    fetch(
      `/api/ecc/compare?a=${encodeURIComponent(itemA.filePath)}&b=${encodeURIComponent(itemB.filePath)}`,
    )
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setResult(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, itemA, itemB]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-[75] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="ecc-scroll my-4 w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 p-5 backdrop-blur">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <GitCompare className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-semibold">Compare two items</h2>
                  <p className="text-xs text-muted-foreground">
                    Side-by-side comparison of When to Use, How it Works, and metadata.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Selectors */}
            <div className="grid gap-3 border-b border-border p-5 sm:grid-cols-2">
              <ItemPicker
                label="Item A"
                catalog={catalog}
                value={itemA}
                onChange={setItemA}
                accent="amber"
              />
              <ItemPicker
                label="Item B"
                catalog={catalog}
                value={itemB}
                onChange={setItemB}
                accent="emerald"
              />
            </div>

            {/* Body */}
            <div className="p-5">
              {!itemA || !itemB ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <ArrowLeftRight className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">
                    Pick two items above to compare them.
                  </p>
                </div>
              ) : loading ? (
                <div className="space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="h-32 animate-pulse rounded bg-muted" />
                    <div className="h-32 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ) : result?.a && result.b ? (
                <CompareBody a={result.a} b={result.b} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Could not load comparison.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ItemPicker({
  label,
  catalog,
  value,
  onChange,
  accent,
}: {
  label: string;
  catalog: CatalogResponse | null;
  value: CatalogItem | null;
  onChange: (item: CatalogItem | null) => void;
  accent: "amber" | "emerald";
}) {
  const [query, setQuery] = React.useState("");
  const all = React.useMemo(() => {
    if (!catalog) return [];
    return [...catalog.agents, ...catalog.skills, ...catalog.commands].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [catalog]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return all.slice(0, 50);
    const q = query.toLowerCase();
    return all
      .filter(
        (it) => it.name.toLowerCase().includes(q) || it.description.toLowerCase().includes(q),
      )
      .slice(0, 50);
  }, [all, query]);

  const accentRing =
    accent === "amber" ? "ring-amber-500/40" : "ring-emerald-500/40";
  const accentBadge =
    accent === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";

  return (
    <div className={cn("rounded-lg border border-border p-3", value && `ring-1 ${accentRing}`)}>
      <div className="mb-2 flex items-center justify-between">
        <span className={cn("rounded border px-1.5 py-0.5 text-[0.6rem] font-semibold uppercase", accentBadge)}>
          {label}
        </span>
        {value && (
          <span className="font-mono text-xs font-medium">{value.name}</span>
        )}
      </div>
      {value ? (
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 text-xs text-muted-foreground">{value.description}</p>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 shrink-0 px-2 text-xs"
            onClick={() => onChange(null)}
          >
            Change
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search agents, skills, commands…"
            className="h-8 text-xs"
            autoFocus
          />
          <div className="ecc-scroll max-h-48 overflow-y-auto">
            <ul className="space-y-0.5">
              {filtered.map((it) => (
                <li key={`${it.type}-${it.slug}`}>
                  <button
                    type="button"
                    onClick={() => onChange(it)}
                    className="flex w-full flex-col gap-0.5 rounded px-2 py-1 text-left text-xs hover:bg-accent/50"
                  >
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline" className="text-[0.55rem] capitalize">
                        {it.type.replace(/s$/, "")}
                      </Badge>
                      <span className="font-mono font-medium">{it.name}</span>
                    </span>
                    <span className="line-clamp-1 text-muted-foreground">{it.description}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CompareBody({ a, b }: { a: CompareItem; b: CompareItem }) {
  return (
    <div className="space-y-4">
      {/* Headers */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { item: a, accent: "amber" as const },
          { item: b, accent: "emerald" as const },
        ].map(({ item, accent }) => (
          <div
            key={item.filePath}
            className={cn(
              "rounded-lg border p-4",
              accent === "amber" ? "border-amber-500/25 bg-amber-500/5" : "border-emerald-500/25 bg-emerald-500/5",
            )}
          >
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {item.type.replace(/s$/, "")}
              </Badge>
              <a
                href={`https://github.com/affaan-m/ecc/blob/main/${item.filePath}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-muted-foreground hover:text-primary"
                aria-label="Open on GitHub"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
            <h3 className="mt-1.5 font-mono text-base font-bold">{item.name}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
            <p className="mt-1 font-mono text-[0.65rem] text-muted-foreground">{item.filePath}</p>
          </div>
        ))}
      </div>

      {/* When to Use comparison */}
      <CompareRow
        icon={Lightbulb}
        label="When to Use"
        a={a.whenToUse}
        b={b.whenToUse}
      />

      {/* How it Works comparison */}
      <CompareRow
        icon={Cog}
        label="How it Works"
        a={a.howItWorks}
        b={b.howItWorks}
      />

      {/* Frontmatter comparison */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeftRight className="h-4 w-4 text-primary" /> Frontmatter
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <FrontmatterTable fm={a.frontmatter} />
          <FrontmatterTable fm={b.frontmatter} />
        </div>
      </div>

      {/* Section count comparison */}
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeftRight className="h-4 w-4 text-primary" /> At a glance
        </h4>
        <div className="grid gap-3 sm:grid-cols-2">
          <StatLine label="Sections" a={a.sections.length} b={b.sections.length} />
          <StatLine label="Code examples" a={a.examples.length} b={b.examples.length} />
          <StatLine label="Source lines" a={a.content.split("\n").length} b={b.content.split("\n").length} />
          <StatLine label="Has 'When to Use'" a={a.whenToUse ? 1 : 0} b={b.whenToUse ? 1 : 0} binary />
        </div>
      </div>
    </div>
  );
}

function CompareRow({
  icon: Icon,
  label,
  a,
  b,
}: {
  icon: React.ElementType;
  label: string;
  a: string | null;
  b: string | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <h4 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
        <Icon className="h-4 w-4 text-primary" /> {label}
      </h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <CompareText text={a} accent="amber" />
        <CompareText text={b} accent="emerald" />
      </div>
    </div>
  );
}

function CompareText({ text, accent }: { text: string | null; accent: "amber" | "emerald" }) {
  const borderClass = accent === "amber" ? "border-l-amber-500/50" : "border-l-emerald-500/50";
  if (!text) {
    return (
      <div className={cn("rounded-r-md border-l-2 bg-card p-3", borderClass)}>
        <p className="text-xs italic text-muted-foreground/70">Not present.</p>
      </div>
    );
  }
  return (
    <div className={cn("rounded-r-md border-l-2 bg-card p-3", borderClass)}>
      <p className="text-xs leading-relaxed text-foreground/90">{text}</p>
    </div>
  );
}

function FrontmatterTable({ fm }: { fm: Record<string, unknown> }) {
  const entries = Object.entries(fm).filter(([k]) => k !== "name" && k !== "description");
  if (entries.length === 0) {
    return <p className="text-xs italic text-muted-foreground/70">No frontmatter.</p>;
  }
  return (
    <div className="space-y-1">
      {entries.slice(0, 8).map(([k, v]) => (
        <div key={k} className="flex items-baseline gap-2 text-xs">
          <span className="font-mono text-muted-foreground">{k}:</span>
          <span className="truncate font-mono">
            {Array.isArray(v) ? v.join(", ") : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatLine({
  label,
  a,
  b,
  binary,
}: {
  label: string;
  a: number;
  b: number;
  binary?: boolean;
}) {
  const aWins = a > b;
  const bWins = b > a;
  return (
    <div className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        {binary ? (
          <>
            <span className={cn("font-mono text-sm", a ? "text-amber-500" : "text-muted-foreground")}>
              {a ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            </span>
            <span className={cn("font-mono text-sm", b ? "text-emerald-500" : "text-muted-foreground")}>
              {b ? <Check className="h-3.5 w-3.5" /> : <Minus className="h-3.5 w-3.5" />}
            </span>
          </>
        ) : (
          <>
            <span className={cn("font-mono text-sm tabular-nums", aWins ? "text-amber-500 font-bold" : "")}>
              {a}
            </span>
            <span className="text-muted-foreground">vs</span>
            <span className={cn("font-mono text-sm tabular-nums", bWins ? "text-emerald-500 font-bold" : "")}>
              {b}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
