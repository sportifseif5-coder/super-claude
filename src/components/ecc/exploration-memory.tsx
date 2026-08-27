"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Clock, X, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CatalogItem, CatalogResponse } from "./types";

const STORAGE_KEY = "ecc-exploration-history";
const MAX_HISTORY = 20;

interface HistoryEntry {
  type: string;
  slug: string;
  name: string;
  description: string;
  filePath: string;
  category: string;
  timestamp: number;
}

function loadHistory(): HistoryEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveHistory(entries: HistoryEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
  } catch {
    /* ignore */
  }
}

function getCategory(item: CatalogItem): string {
  return item.slug.includes("-") ? item.slug.split("-")[0] : "general";
}

interface ExplorationMemoryProps {
  catalog: CatalogResponse | null;
  onOpen: (item: CatalogItem) => void;
}

export function ExplorationMemory({ catalog, onOpen }: ExplorationMemoryProps) {
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setHistory(loadHistory());
  }, []);

  // Listen for new views (dispatched via custom event from openItem)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as CatalogItem;
      if (!detail) return;
      const entry: HistoryEntry = {
        type: detail.type,
        slug: detail.slug,
        name: detail.name,
        description: detail.description,
        filePath: detail.filePath,
        category: getCategory(detail),
        timestamp: Date.now(),
      };
      setHistory((prev) => {
        const filtered = prev.filter((h) => h.slug !== entry.slug || h.type !== entry.type);
        const next = [entry, ...filtered].slice(0, MAX_HISTORY);
        saveHistory(next);
        return next;
      });
    };
    document.addEventListener("ecc:view-item", handler);
    return () => document.removeEventListener("ecc:view-item", handler);
  }, []);

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  // Build interest profile from history
  const interestProfile = React.useMemo(() => {
    if (history.length === 0) return [];
    const counts = new Map<string, number>();
    for (const h of history) {
      counts.set(h.category, (counts.get(h.category) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [history]);

  // Recommend items based on interests (from catalog, not yet viewed)
  const recommendations = React.useMemo(() => {
    if (!catalog || history.length === 0 || interestProfile.length === 0) return [];
    const viewedSlugs = new Set(history.map((h) => h.slug));
    const topCategory = interestProfile[0][0];
    // Find agents/skills in the top interest category not yet viewed
    const pool: CatalogItem[] = [
      ...catalog.agents,
      ...catalog.skills,
      ...catalog.commands,
    ];
    return pool
      .filter((item) => getCategory(item) === topCategory && !viewedSlugs.has(item.slug))
      .slice(0, 5);
  }, [catalog, history, interestProfile]);

  if (!mounted || history.length === 0) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Your exploration profile</h3>
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {history.length} items viewed
            </span>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-muted-foreground transition-colors hover:text-destructive"
          >
            Clear
          </button>
        </div>

        {/* Interest tags */}
        {interestProfile.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Top interests:</span>
            {interestProfile.map(([cat, count]) => (
              <span
                key={cat}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-mono text-[0.65rem] text-primary"
              >
                {cat}
                <span className="rounded-full bg-primary/20 px-1 tabular-nums">{count}</span>
              </span>
            ))}
          </div>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Recommended based on your interests:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {recommendations.map((rec) => (
                <button
                  key={`${rec.type}-${rec.slug}`}
                  type="button"
                  onClick={() => onOpen(rec)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <Badge variant="outline" className="text-[0.55rem] capitalize">
                    {rec.type.replace(/s$/, "")}
                  </Badge>
                  <span className="font-mono text-[0.7rem]">{rec.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Recent history */}
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <History className="h-3 w-3" /> Recently explored:
          </p>
          <div className="ecc-scroll flex gap-2 overflow-x-auto pb-1">
            {history.slice(0, 10).map((h, i) => (
              <button
                key={`${h.type}-${h.slug}-${i}`}
                type="button"
                onClick={() =>
                  onOpen({
                    name: h.name,
                    slug: h.slug,
                    type: h.type as CatalogItem["type"],
                    description: h.description,
                    filePath: h.filePath,
                    extra: {},
                  })
                }
                className="group flex shrink-0 flex-col gap-0.5 rounded-md border border-border bg-card p-2 text-left transition-colors hover:border-primary/40 hover:bg-accent"
                style={{ minWidth: 140 }}
              >
                <span className="flex items-center gap-1">
                  <Badge variant="secondary" className="text-[0.5rem] capitalize">
                    {h.type.replace(/s$/, "")}
                  </Badge>
                  <span className="truncate font-mono text-[0.65rem] font-medium">{h.name}</span>
                </span>
                <span className="line-clamp-1 text-[0.6rem] text-muted-foreground">
                  {h.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
