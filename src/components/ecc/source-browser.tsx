"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileCode2, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "./code-block";
import type { FileResponse, NotableFile } from "./types";

interface SourceBrowserProps {
  notableFiles: NotableFile[];
}

const GROUP_ORDER = ["AI Layer", "Hooks", "MCP", "Identity", "ecc2", "Scripts"];

export function SourceBrowser({ notableFiles }: SourceBrowserProps) {
  const [active, setActive] = React.useState<NotableFile>(notableFiles[0]);
  const [file, setFile] = React.useState<FileResponse | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    setFile(null);
    fetch(`/api/ecc/file?path=${encodeURIComponent(active.path)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setFile(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  const grouped = React.useMemo(() => {
    const m = new Map<string, NotableFile[]>();
    for (const f of notableFiles) {
      if (!m.has(f.group)) m.set(f.group, []);
      m.get(f.group)!.push(f);
    }
    return GROUP_ORDER.filter((g) => m.has(g)).map((g) => ({ group: g, files: m.get(g)! }));
  }, [notableFiles]);

  if (!active) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <div className="ecc-scroll max-h-[34rem] overflow-y-auto rounded-xl border border-border bg-card p-2">
        {grouped.map(({ group, files }) => (
          <div key={group} className="mb-3 last:mb-0">
            <p className="px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground">
              {group}
            </p>
            <ul className="space-y-0.5">
              {files.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => setActive(f)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-1.5 text-left transition-colors",
                      active?.path === f.path
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/60",
                    )}
                  >
                    <span className="flex items-center gap-1.5 font-mono text-xs font-medium">
                      <FileCode2 className="h-3.5 w-3.5 shrink-0 text-primary" />
                      {f.label}
                    </span>
                    <span className="line-clamp-1 pl-5 text-[0.7rem] text-muted-foreground">
                      {f.description}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="min-h-[34rem] rounded-xl border border-border bg-card">
        <AnimatePresence mode="wait">
          <motion.div
            key={active.path}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.16 }}
            className="flex h-full flex-col"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div className="flex min-w-0 items-center gap-2">
                <FileCode2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="truncate font-mono text-xs text-muted-foreground">
                  {active.path}
                </span>
              </div>
              <a
                href={`https://github.com/affaan-m/ecc/blob/main/${active.path}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-primary"
              >
                GitHub <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="ecc-scroll min-h-0 flex-1 overflow-auto p-3">
              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Reading source…
                </div>
              ) : file ? (
                <CodeBlock
                  code={file.content}
                  language={file.language}
                  label={active.path}
                  showHeader={false}
                  maxHeight={560}
                />
              ) : (
                <p className="py-16 text-center text-sm text-muted-foreground">
                  Could not read file.
                </p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
