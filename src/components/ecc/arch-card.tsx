"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ChevronDown, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CodeBlock } from "./code-block";
import type { ArchitectureSection } from "./types";

interface ArchCardProps {
  section: ArchitectureSection;
  index: number;
  icon: React.ElementType;
  defaultOpen?: boolean;
}

export function ArchCard({ section, index, icon: Icon, defaultOpen = false }: ArchCardProps) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.35, delay: (index % 2) * 0.08 }}
    >
      <Card className="group h-full overflow-hidden transition-all hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5">
        <CardHeader className="pb-3">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex w-full items-center gap-2.5 text-left"
            aria-expanded={open}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Icon className="h-4.5 w-4.5" />
            </div>
            <CardTitle className="flex-1 text-base">{section.title}</CardTitle>
            <span
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground transition-all",
                open && "rotate-180 bg-primary/10 text-primary",
              )}
            >
              <ChevronDown className="h-4 w-4" />
            </span>
          </button>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">{section.summary}</p>

          <AnimatePresence initial={false}>
            {open && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <ul className="mt-3 space-y-1.5">
                  {section.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                {section.code && (
                  <div className="mt-3">
                    <CodeBlock
                      code={section.code.snippet}
                      language={section.code.language}
                      maxHeight={200}
                      showHeader={false}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {!open && section.bullets.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-2 inline-flex items-center gap-1 text-xs text-primary transition-opacity hover:opacity-80"
            >
              <Plus className="h-3 w-3" />
              {section.bullets.length} detail{section.bullets.length !== 1 ? "s" : ""}
              {section.code ? " + code" : ""}
            </button>
          )}
          {open && (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Minus className="h-3 w-3" /> Collapse
            </button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
