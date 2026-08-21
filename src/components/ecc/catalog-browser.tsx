"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  BookOpen,
  Terminal,
  Shield,
  FileText,
  Loader2,
  X,
  ArrowRight,
  GitCompare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CatalogItem, CatalogType } from "./types";

const TABS: { id: CatalogType; label: string; icon: React.ElementType }[] = [
  { id: "agents", label: "Agents", icon: Users },
  { id: "skills", label: "Skills", icon: BookOpen },
  { id: "commands", label: "Commands", icon: Terminal },
  { id: "rules", label: "Rules", icon: Shield },
];

interface CatalogBrowserProps {
  catalog: { agents: CatalogItem[]; skills: CatalogItem[]; commands: CatalogItem[]; rules: CatalogItem[] } | null;
  loading: boolean;
  onSelect?: (item: CatalogItem) => void;
  onCompare?: (item: CatalogItem) => void;
}

export function CatalogBrowser({ catalog, loading, onSelect, onCompare }: CatalogBrowserProps) {
  const [activeTab, setActiveTab] = React.useState<CatalogType>("agents");
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<CatalogItem | null>(null);

  const items = catalog ? catalog[activeTab] : [];
  const filtered = React.useMemo(() => {
    if (!query.trim()) return items;
    const q = query.toLowerCase();
    return items.filter(
      (it) =>
        it.name.toLowerCase().includes(q) ||
        it.description.toLowerCase().includes(q),
    );
  }, [items, query]);

  const handleSelect = (item: CatalogItem) => {
    setSelected(item);
    onSelect?.(item);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      {/* Left: tabs + search + list */}
      <div className="flex flex-col rounded-xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
          {TABS.map((t) => {
            const Icon = t.icon;
            const count = catalog ? catalog[t.id].length : null;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setActiveTab(t.id);
                  setSelected(null);
                  setQuery("");
                }}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {t.label}
                {count !== null && (
                  <span
                    className={cn(
                      "ml-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-semibold tabular-nums",
                      isActive ? "bg-primary-foreground/25" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="border-b border-border p-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${activeTab}…`}
              className="h-9 pl-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        <div className="ecc-scroll max-h-[28rem] overflow-y-auto p-1.5">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matches for “{query}”.
            </div>
          ) : (
            <ul className="space-y-0.5">
              {filtered.map((item) => {
                const tools = item.extra["tools"];
                const model = item.extra["model"];
                const isActive = selected?.slug === item.slug;
                return (
                  <li key={item.slug}>
                    <button
                      type="button"
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "group flex w-full flex-col gap-1 rounded-md px-3 py-2 text-left transition-colors",
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/60",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-mono text-sm font-medium">
                          {item.name}
                        </span>
                        {typeof model === "string" && (
                          <Badge variant="outline" className="shrink-0 font-mono text-[0.6rem]">
                            {model}
                          </Badge>
                        )}
                      </span>
                      {item.description && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {item.description}
                        </span>
                      )}
                      {typeof tools === "string" && tools && (
                        <span className="mt-0.5 inline-flex flex-wrap gap-1">
                          {tools
                            .split(",")
                            .map((t) => t.trim())
                            .slice(0, 5)
                            .map((t) => (
                              <span
                                key={t}
                                className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.6rem] text-secondary-foreground"
                              >
                                {t}
                              </span>
                            ))}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Right: preview panel (prompts deep-dive modal) */}
      <div className="min-h-[28rem] rounded-xl border border-border bg-card">
        <AnimatePresence mode="wait">
          {selected ? (
            <PreviewPanel
              key={selected.slug}
              item={selected}
              onOpen={() => onSelect?.(selected)}
              onCompare={onCompare ? () => onCompare(selected) : undefined}
            />
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex h-full min-h-[28rem] flex-col items-center justify-center gap-3 p-8 text-center"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="font-medium">Select an item to inspect</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Click any agent, skill, command, or rule to open the deep-dive modal.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function PreviewPanel({
  item,
  onOpen,
  onCompare,
}: {
  item: CatalogItem;
  onOpen: () => void;
  onCompare?: () => void;
}) {
  const fmEntries = Object.entries(item.extra).filter(
    ([k]) => k !== "name" && k !== "description",
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18 }}
      className="flex h-full flex-col"
    >
      <div className="border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <Badge variant="secondary" className="mb-1.5 capitalize">
              {item.type.replace(/s$/, "")}
            </Badge>
            <h3 className="truncate font-mono text-base font-semibold">{item.name}</h3>
            {item.description && (
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            )}
          </div>
        </div>
        {fmEntries.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {fmEntries.slice(0, 6).map(([k, v]) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-mono text-[0.65rem] text-muted-foreground"
              >
                <span className="text-foreground/70">{k}:</span>
                <span className="max-w-[10rem] truncate">
                  {Array.isArray(v) ? v.join(", ") : String(v)}
                </span>
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
          <FileText className="h-7 w-7" />
        </div>
        <div className="max-w-sm">
          <p className="text-sm font-medium">Deep-dive available</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Open the full detail modal for parsed “When to Use” + “How it Works” sections,
            code examples, a section index, and the complete source.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button onClick={onOpen} size="sm">
            Open deep-dive
            <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
          </Button>
          {onCompare && (
            <Button onClick={onCompare} variant="outline" size="sm">
              <GitCompare className="mr-1.5 h-3.5 w-3.5" /> Compare
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
