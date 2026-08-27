"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  id: string;
  title: string;
  eyebrow?: string;
  subtitle?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

const STORAGE_KEY = "ecc-sections-collapsed";

export function CollapsibleSection({
  id,
  title,
  eyebrow,
  subtitle,
  defaultOpen = true,
  children,
  className,
}: CollapsibleSectionProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  // Load persisted state
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const map = JSON.parse(stored) as Record<string, boolean>;
        if (id in map) setOpen(map[id]);
      }
    } catch {
      /* ignore */
    }
  }, [id]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const map = stored ? JSON.parse(stored) : {};
      map[id] = next;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* ignore */
    }
  };

  return (
    <section
      id={id}
      className={cn("scroll-mt-16 border-b border-border", className)}
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        {/* Header (clickable) */}
        <button
          type="button"
          onClick={toggle}
          className="group mb-2 flex w-full items-start justify-between gap-4 text-left"
          aria-expanded={open}
          aria-controls={`section-content-${id}`}
        >
          <div className="max-w-2xl">
            {eyebrow && (
              <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-wider text-primary">
                {eyebrow}
              </p>
            )}
            <h2 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              {title}
              <ChevronDown
                className={cn(
                  "h-5 w-5 text-muted-foreground transition-transform duration-200",
                  open ? "rotate-0" : "-rotate-90",
                )}
              />
            </h2>
            {subtitle && (
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
            )}
          </div>
        </button>

        {/* Content */}
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              id={`section-content-${id}`}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-6">{children}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed hint */}
        {!open && (
          <button
            type="button"
            onClick={toggle}
            className="mt-2 text-xs text-muted-foreground transition-colors hover:text-primary"
          >
            ▾ Expand section
          </button>
        )}
      </div>
    </section>
  );
}
