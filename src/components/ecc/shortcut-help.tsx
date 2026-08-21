"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Keyboard, Command } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShortcutHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS: { keys: string[]; label: string; group: string }[] = [
  { keys: ["⌘", "K"], label: "Open command palette", group: "Global" },
  { keys: ["?"], label: "Toggle this shortcut help", group: "Global" },
  { keys: ["Esc"], label: "Close any modal / overlay", group: "Global" },
  { keys: ["↑", "↓"], label: "Navigate palette items", group: "Palette" },
  { keys: ["↵"], label: "Select palette item", group: "Palette" },
  { keys: ["G", "A"], label: "Jump to Agents", group: "Jump" },
  { keys: ["G", "S"], label: "Jump to Skills", group: "Jump" },
  { keys: ["G", "H"], label: "Jump to Hooks", group: "Jump" },
  { keys: ["G", "M"], label: "Jump to MCP", group: "Jump" },
  { keys: ["G", "C"], label: "Jump to Catalog", group: "Jump" },
  { keys: ["G", "O"], label: "Jump to Source", group: "Jump" },
  { keys: ["D"], label: "Discover random item", group: "Action" },
  { keys: ["T"], label: "Toggle theme", group: "Action" },
];

export function ShortcutHelp({ open, onOpenChange }: ShortcutHelpProps) {
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  const groups = React.useMemo(() => {
    const m = new Map<string, typeof SHORTCUTS>();
    for (const s of SHORTCUTS) {
      if (!m.has(s.group)) m.set(s.group, []);
      m.get(s.group)!.push(s);
    }
    return Array.from(m.entries());
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => onOpenChange(false)}
          className="fixed inset-0 z-[85] flex items-start justify-center bg-black/60 p-4 pt-[12vh] backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.16 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-popover shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold">Keyboard shortcuts</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="ecc-scroll max-h-[60vh] overflow-y-auto p-3">
              {groups.map(([group, items]) => (
                <div key={group} className="mb-3 last:mb-0">
                  <p className="mb-1.5 px-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group}
                  </p>
                  <ul className="space-y-0.5">
                    {items.map((s) => (
                      <li
                        key={s.label}
                        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-accent/40"
                      >
                        <span className="text-sm text-foreground/90">{s.label}</span>
                        <span className="flex items-center gap-1">
                          {s.keys.map((k, i) => (
                            <kbd
                              key={i}
                              className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-[0.65rem] font-medium text-foreground"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-center gap-1.5 border-t border-border bg-muted/30 px-4 py-2 text-[0.7rem] text-muted-foreground">
              <Command className="h-3 w-3" />
              Press <kbd className="rounded border border-border bg-background px-1 font-mono">?</kbd> anytime to open this
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
