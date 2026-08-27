"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Grid3x3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CatalogResponse } from "./types";

export function ToolMatrix({ catalog }: { catalog: CatalogResponse | null }) {
  const [hovered, setHovered] = React.useState<{ row: string; col: string } | null>(null);

  const { agents, tools, matrix } = React.useMemo(() => {
    if (!catalog) return { agents: [], tools: [], matrix: new Map<string, Set<string>>() };
    const agentList = catalog.agents.slice(0, 30); // top 30 for readability
    const toolSet = new Set<string>();
    const m = new Map<string, Set<string>>();
    for (const a of agentList) {
      const toolsStr = typeof a.extra["tools"] === "string" ? a.extra["tools"] : "";
      const agentTools = new Set(
        toolsStr.split(",").map((t) => t.trim()).filter(Boolean),
      );
      m.set(a.slug, agentTools);
      for (const t of agentTools) toolSet.add(t);
    }
    const toolList = Array.from(toolSet).sort();
    return { agents: agentList, tools: toolList, matrix: m };
  }, [catalog]);

  if (!catalog) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading tool matrix…
      </div>
    );
  }

  const isHighlighted = (agent: string, tool: string) => {
    if (!hovered) return false;
    return hovered.row === agent || hovered.col === tool;
  };

  const isDimmed = (agent: string, tool: string) => {
    if (!hovered) return false;
    if (hovered.row === agent && hovered.col === tool) return false;
    if (hovered.row === agent) return false;
    if (hovered.col === tool) return false;
    return true;
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <Grid3x3 className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">Agent × Tool matrix</h3>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {agents.length} agents × {tools.length} tools
        </span>
      </div>
      <div className="ecc-scroll overflow-x-auto">
        <div className="min-w-[500px]">
          {/* Header row: tools */}
          <div className="flex border-b border-border">
            <div className="sticky left-0 z-10 w-32 shrink-0 bg-card p-2 text-[0.6rem] font-medium uppercase tracking-wider text-muted-foreground">
              Agent
            </div>
            {tools.map((tool) => (
              <div
                key={tool}
                onMouseEnter={() => setHovered({ row: "", col: tool })}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "flex w-12 shrink-0 items-center justify-center p-2 text-center font-mono text-[0.55rem] transition-colors",
                  hovered?.col === tool
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent/40",
                )}
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
                title={tool}
              >
                {tool}
              </div>
            ))}
          </div>
          {/* Body: agents */}
          {agents.map((agent, i) => (
            <motion.div
              key={agent.slug}
              initial={{ opacity: 0, x: -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.01, 0.3) }}
              className="flex border-b border-border/50 hover:bg-accent/20"
            >
              <div
                onMouseEnter={() => setHovered({ row: agent.slug, col: "" })}
                onMouseLeave={() => setHovered(null)}
                className={cn(
                  "sticky left-0 z-10 w-32 shrink-0 bg-card p-2 font-mono text-[0.65rem]",
                  hovered?.row === agent.slug ? "text-primary font-medium" : "text-foreground",
                )}
                title={agent.name}
              >
                <span className="truncate">{agent.slug}</span>
              </div>
              {tools.map((tool) => {
                const has = matrix.get(agent.slug)?.has(tool);
                return (
                  <div
                    key={tool}
                    onMouseEnter={() => setHovered({ row: agent.slug, col: tool })}
                    onMouseLeave={() => setHovered(null)}
                    className={cn(
                      "flex h-8 w-12 shrink-0 items-center justify-center transition-all",
                      isDimmed(agent.slug, tool) && "opacity-20",
                    )}
                  >
                    {has ? (
                      <span
                        className={cn(
                          "h-3 w-3 rounded-sm transition-all",
                          isHighlighted(agent.slug, tool)
                            ? "bg-primary scale-125 shadow-sm"
                            : "bg-primary/60 hover:bg-primary",
                        )}
                        title={`${agent.slug} uses ${tool}`}
                      />
                    ) : (
                      <span className="h-1 w-1 rounded-full bg-muted-foreground/20" />
                    )}
                  </div>
                );
              })}
            </motion.div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-[0.65rem] text-muted-foreground">
        Hover a row or column to highlight. Filled squares = agent has that tool. Showing top 30
        agents for readability.
      </p>
    </div>
  );
}
