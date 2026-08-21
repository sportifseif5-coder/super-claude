"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Users,
  BookOpen,
  Terminal,
  FileCode2,
  Layers,
  CornerDownLeft,
  Command,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SearchEntry } from "./types";

const TYPE_ICON: Record<SearchEntry["type"], React.ElementType> = {
  agent: Users,
  skill: BookOpen,
  command: Terminal,
  rule: BookOpen,
  file: FileCode2,
  section: Layers,
};

const TYPE_LABEL: Record<SearchEntry["type"], string> = {
  agent: "Agent",
  skill: "Skill",
  command: "Command",
  rule: "Rule",
  file: "File",
  section: "Section",
};

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [entries, setEntries] = React.useState<SearchEntry[]>([]);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (open) {
      fetch("/api/ecc/search")
        .then((r) => r.json())
        .then((d) => setEntries(d.entries ?? []))
        .catch(() => {});
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = React.useMemo(() => {
    if (!query.trim()) return entries.slice(0, 50);
    const q = query.toLowerCase();
    const scored = entries
      .map((e) => {
        const labelMatch = e.label.toLowerCase().includes(q);
        const hintMatch = e.hint.toLowerCase().includes(q);
        const score = (labelMatch ? 2 : 0) + (hintMatch ? 1 : 0) + (e.type === "section" ? 0.5 : 0);
        return { e, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 50);
    return scored.map((x) => x.e);
  }, [entries, query]);

  React.useEffect(() => {
    setActive(0);
  }, [query]);

  React.useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const go = (entry: SearchEntry) => {
    if (entry.target.startsWith("#")) {
      const el = document.querySelector(entry.target);
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    onOpenChange(false);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filtered[active]) go(filtered[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] flex items-start justify-center bg-black/60 p-4 pt-[15vh] backdrop-blur-sm"
          onClick={() => onOpenChange(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search agents, skills, commands, files…"
                className="h-12 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.6rem] text-muted-foreground sm:inline">
                ESC
              </kbd>
            </div>
            <div ref={listRef} className="ecc-scroll max-h-[50vh] overflow-y-auto p-1.5">
              {filtered.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  No results for “{query}”.
                </div>
              ) : (
                filtered.map((entry, i) => {
                  const Icon = TYPE_ICON[entry.type];
                  const isActive = i === active;
                  return (
                    <button
                      key={entry.id}
                      data-idx={i}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(entry)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                        isActive ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{entry.label}</p>
                        <p className="truncate text-xs text-muted-foreground">{entry.hint}</p>
                      </div>
                      <span className="shrink-0 rounded bg-secondary px-1.5 py-0.5 font-mono text-[0.6rem] text-secondary-foreground">
                        {TYPE_LABEL[entry.type]}
                      </span>
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[0.7rem] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Command className="h-3 w-3" /> + K to toggle
              </span>
              <span className="flex items-center gap-2">
                <kbd className="rounded border border-border bg-background px-1 font-mono">↑↓</kbd>
                navigate
                <kbd className="rounded border border-border bg-background px-1 font-mono">↵</kbd>
                select
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
