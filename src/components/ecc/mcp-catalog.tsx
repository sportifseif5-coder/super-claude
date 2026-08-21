"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Search, Loader2, X, Boxes, KeyRound, Terminal, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { McpData, McpServer } from "./types";

export function McpCatalog() {
  const [data, setData] = React.useState<McpData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    fetch("/api/ecc/mcp")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = React.useMemo(() => {
    if (!data) return [];
    if (!query.trim()) return data.servers;
    const q = query.toLowerCase();
    return data.servers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.command.toLowerCase().includes(q),
    );
  }, [data, query]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${data?.total ?? ""} MCP servers…`}
          className="pl-8"
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

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading MCP catalog…
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((s, i) => (
            <McpCard key={s.name} server={s} index={i} />
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center text-sm text-muted-foreground">
              No MCP servers match “{query}”.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function McpCard({ server, index }: { server: McpServer; index: number }) {
  const TransportIcon = server.transport === "http" ? Globe : Terminal;
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
      className="group flex flex-col gap-2 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Boxes className="h-4 w-4" />
          </div>
          <span className="font-mono text-sm font-medium">{server.name}</span>
        </div>
        <TransportIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </div>
      <p className="line-clamp-3 text-xs text-muted-foreground">{server.description}</p>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        {server.transport === "http" ? (
          <Badge variant="outline" className="gap-1 text-[0.6rem]">
            <Globe className="h-2.5 w-2.5" /> http
          </Badge>
        ) : (
          <Badge variant="outline" className="gap-1 font-mono text-[0.6rem]">
            <Terminal className="h-2.5 w-2.5" /> {server.command || "stdio"}
          </Badge>
        )}
        {server.hasEnv && (
          <Badge variant="outline" className="gap-1 text-[0.6rem] text-amber-600 dark:text-amber-400">
            <KeyRound className="h-2.5 w-2.5" /> env
          </Badge>
        )}
        {server.args.length > 0 && (
          <span className="font-mono text-[0.6rem] text-muted-foreground">
            +{server.args.length} arg{server.args.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>
    </motion.div>
  );
}
