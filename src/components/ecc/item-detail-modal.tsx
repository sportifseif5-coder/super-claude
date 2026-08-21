"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Loader2,
  Sparkles,
  CheckCircle2,
  FileText,
  Lightbulb,
  Cog,
  Code2,
  Hash,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./code-block";
import type { CatalogItem, ItemDetail as ItemDetailType } from "./types";

interface ItemDetailModalProps {
  item: CatalogItem | null;
  onClose: () => void;
}

export function ItemDetailModal({ item, onClose }: ItemDetailModalProps) {
  const [detail, setDetail] = React.useState<ItemDetailType | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!item) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setDetail(null);
    fetch(`/api/ecc/detail?path=${encodeURIComponent(item.filePath)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setDetail(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [item]);

  // Esc to close
  React.useEffect(() => {
    if (!item) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [item, onClose]);

  return (
    <AnimatePresence>
      {item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:p-8"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="ecc-scroll my-4 w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-card/95 p-5 backdrop-blur">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="capitalize">
                    {item.type.replace(/s$/, "")}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">{item.filePath}</span>
                </div>
                <h2 className="mt-1.5 truncate font-mono text-xl font-bold">{item.name}</h2>
                {item.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={onClose}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-5">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-16 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-1/4 animate-pulse rounded bg-muted" />
                  <div className="h-32 w-full animate-pulse rounded bg-muted" />
                </div>
              ) : detail ? (
                <DetailBody detail={detail} item={item} />
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  Could not load detail.
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function DetailBody({ detail, item }: { detail: ItemDetailType; item: CatalogItem }) {
  const fm = detail.frontmatter;
  const fmEntries = Object.entries(fm).filter(
    ([k]) => k !== "name" && k !== "description",
  );

  return (
    <div className="space-y-5">
      {/* Frontmatter chips */}
      {fmEntries.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {fmEntries.slice(0, 10).map(([k, v]) => (
            <span
              key={k}
              className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-[0.65rem]"
            >
              <Tag className="h-2.5 w-2.5 text-primary" />
              <span className="text-foreground/70">{k}:</span>
              <span className="max-w-[14rem] truncate">
                {Array.isArray(v) ? v.join(", ") : String(v)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* First paragraph (summary) */}
      {detail.firstParagraph && (
        <p className="border-l-2 border-primary/40 pl-3 text-sm leading-relaxed text-foreground/90">
          {detail.firstParagraph}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {/* When to Use */}
        <DetailCard
          icon={Lightbulb}
          label="When to Use"
          accent="amber"
        >
          {detail.whenToUse ? (
            <p className="text-sm text-muted-foreground">{detail.whenToUse}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground/70">
              No explicit “When to Use” section in this file.
            </p>
          )}
        </DetailCard>

        {/* How it Works */}
        <DetailCard
          icon={Cog}
          label="How it Works"
          accent="emerald"
        >
          {detail.howItWorks ? (
            <p className="text-sm text-muted-foreground">{detail.howItWorks}</p>
          ) : (
            <p className="text-xs italic text-muted-foreground/70">
              No explicit “How it Works” section — see full source below.
            </p>
          )}
        </DetailCard>
      </div>

      {/* Examples (first code block) */}
      {detail.examples.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Code2 className="h-4 w-4 text-primary" /> Example
          </h3>
          <CodeBlock
            code={detail.examples[0]}
            language="bash"
            showHeader={false}
            maxHeight={220}
          />
        </div>
      )}

      {/* Section index */}
      {detail.sections.length > 0 && (
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
            <Hash className="h-4 w-4 text-primary" /> Section index
            <span className="font-normal text-muted-foreground">
              ({detail.sections.length} sections)
            </span>
          </h3>
          <div className="ecc-scroll max-h-48 overflow-y-auto rounded-lg border border-border bg-muted/30 p-2">
            <ul className="space-y-0.5">
              {detail.sections.map((s, i) => (
                <li
                  key={i}
                  className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-accent/50"
                >
                  <span
                    className="font-mono text-[0.6rem] text-muted-foreground"
                    style={{ paddingLeft: `${(s.level - 1) * 8}px` }}
                  >
                    {"#".repeat(s.level)}
                  </span>
                  <span className="truncate">{s.heading}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Full source (collapsible) */}
      <details className="group rounded-lg border border-border">
        <summary className="flex cursor-pointer items-center justify-between gap-2 px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/40">
          <span className="flex items-center gap-1.5">
            <FileText className="h-4 w-4 text-primary" /> Full source
            <span className="font-normal text-muted-foreground">
              ({detail.content.split("\n").length} lines)
            </span>
          </span>
          <span className="text-xs text-muted-foreground transition-transform group-open:rotate-180">
            ▾
          </span>
        </summary>
        <div className="border-t border-border p-3">
          <CodeBlock
            code={detail.content}
            language={detail.language}
            label={item.filePath}
            maxHeight={480}
            showHeader={false}
          />
        </div>
      </details>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  accent,
  children,
}: {
  icon: React.ElementType;
  label: string;
  accent: "amber" | "emerald";
  children: React.ReactNode;
}) {
  const accentClass =
    accent === "amber"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
      : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <span className={cn("flex h-7 w-7 items-center justify-center rounded-md border", accentClass)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <h4 className="text-sm font-semibold">{label}</h4>
      </div>
      {children}
    </div>
  );
}

/* Discover button — fetches a random item and opens the modal */
export function DiscoverButton({
  onPick,
  className,
}: {
  onPick: (item: CatalogItem) => void;
  className?: string;
}) {
  const [loading, setLoading] = React.useState(false);

  const discover = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ecc/random");
      const d = await r.json();
      if (d.filePath) {
        onPick({
          name: d.name,
          slug: d.slug,
          type: d.type,
          description: d.description,
          filePath: d.filePath,
          extra: {},
        });
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={discover}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="mr-1.5 h-4 w-4 text-primary" />
      )}
      Discover
    </Button>
  );
}
