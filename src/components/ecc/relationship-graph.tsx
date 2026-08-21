"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Network, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GraphData, GraphNode } from "./types";

const TYPE_COLORS: Record<GraphNode["type"], string> = {
  agent: "var(--primary)",
  model: "#3b82f6",
  tool: "#10b981",
  category: "#a855f7",
};

const TYPE_LABELS: Record<GraphNode["type"], string> = {
  agent: "Agent",
  model: "Model",
  tool: "Tool",
  category: "Category",
};

interface PositionedNode extends GraphNode {
  x: number;
  y: number;
  r: number;
}

interface PositionedLink {
  source: PositionedNode;
  target: PositionedNode;
  key: string;
}

export function RelationshipGraph() {
  const [data, setData] = React.useState<GraphData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [activeTypes, setActiveTypes] = React.useState<Set<GraphNode["type"]>>(
    new Set(["agent", "model", "category"]),
  );

  React.useEffect(() => {
    fetch("/api/ecc/graph")
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const { nodes, links } = React.useMemo(() => {
    if (!data) return { nodes: [] as PositionedNode[], links: [] as PositionedLink[] };
    const W = 800;
    const H = 560;
    const cx = W / 2;
    const cy = H / 2;

    // Filter nodes by active types
    const filteredNodes = data.nodes.filter((n) => activeTypes.has(n.type));

    // Group by type
    const byType: Record<string, GraphNode[]> = {};
    for (const n of filteredNodes) {
      if (!byType[n.type]) byType[n.type] = [];
      byType[n.type].push(n);
    }

    // Layout: categories in center cluster, agents in middle ring, models+tools outer
    const positioned: PositionedNode[] = [];
    const nodeMap = new Map<string, PositionedNode>();

    const ringRadius: Record<string, number> = {
      category: 0,
      agent: 180,
      model: 280,
      tool: 280,
    };
    const nodeRadius: Record<string, number> = {
      category: 8,
      agent: 5,
      model: 10,
      tool: 7,
    };

    for (const type of ["category", "agent", "model", "tool"]) {
      const arr = byType[type] ?? [];
      const r = ringRadius[type];
      const count = arr.length;
      if (count === 0) continue;
      // Category: place in small center cluster
      if (type === "category") {
        arr.forEach((n, i) => {
          const angle = (i / count) * Math.PI * 2;
          const dist = count > 1 ? 60 : 0;
          const x = cx + Math.cos(angle) * dist;
          const y = cy + Math.sin(angle) * dist;
          const pn = { ...n, x, y, r: nodeRadius[type] };
          positioned.push(pn);
          nodeMap.set(n.id, pn);
        });
      } else {
        // Ring layout for agents/models/tools
        arr.forEach((n, i) => {
          const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
          const x = cx + Math.cos(angle) * r;
          const y = cy + Math.sin(angle) * r;
          const pn = { ...n, x, y, r: nodeRadius[type] };
          positioned.push(pn);
          nodeMap.set(n.id, pn);
        });
      }
    }

    // Build links
    const positionedLinks: PositionedLink[] = [];
    for (const link of data.links) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (s && t) {
        positionedLinks.push({ source: s, target: t, key: `${link.source}→${link.target}` });
      }
    }

    return { nodes: positioned, links: positionedLinks };
  }, [data, activeTypes]);

  const connectedIds = React.useMemo(() => {
    if (!hovered) return null;
    const ids = new Set<string>([hovered]);
    for (const link of links) {
      if (link.source.id === hovered) ids.add(link.target.id);
      if (link.target.id === hovered) ids.add(link.source.id);
    }
    return ids;
  }, [hovered, links]);

  const toggleType = (type: GraphNode["type"]) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Network className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Agent relationship graph</h3>
          {data && (
            <span className="font-mono text-[0.65rem] text-muted-foreground">
              {data.stats.totalAgents} agents · {data.stats.categories} categories · {data.stats.models} models
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-muted-foreground" />
          {(["category", "agent", "model", "tool"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleType(t)}
              className={cn(
                "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[0.6rem] font-medium transition-colors",
                activeTypes.has(t)
                  ? "border-border bg-card text-foreground"
                  : "border-dashed border-border/50 text-muted-foreground/60",
              )}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[t] }}
              />
              {TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Building graph…
        </div>
      ) : (
        <div className="ecc-scroll overflow-x-auto">
          <svg
            viewBox="0 0 800 560"
            className="mx-auto h-[480px] w-full max-w-3xl"
            style={{ minWidth: 600 }}
          >
            {/* Links */}
            <g>
              {links.map((link) => {
                const isHighlighted =
                  connectedIds &&
                  connectedIds.has(link.source.id) &&
                  connectedIds.has(link.target.id);
                const isDimmed = hovered && !isHighlighted;
                return (
                  <line
                    key={link.key}
                    x1={link.source.x}
                    y1={link.source.y}
                    x2={link.target.x}
                    y2={link.target.y}
                    stroke="var(--muted-foreground)"
                    strokeWidth={isHighlighted ? 1.2 : 0.4}
                    strokeOpacity={isHighlighted ? 0.6 : isDimmed ? 0.05 : 0.12}
                    className="transition-all duration-150"
                  />
                );
              })}
            </g>
            {/* Nodes */}
            <g>
              {nodes.map((n) => {
                const isHovered = hovered === n.id;
                const isConnected = connectedIds?.has(n.id);
                const isDimmed = hovered && !isConnected;
                const color = TYPE_COLORS[n.type];
                return (
                  <g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    className="cursor-pointer transition-opacity"
                    style={{ opacity: isDimmed ? 0.2 : 1 }}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <circle
                      r={isHovered ? n.r + 3 : n.r}
                      fill={color}
                      fillOpacity={isHovered ? 1 : 0.7}
                      stroke={color}
                      strokeWidth={isHovered ? 2 : 0}
                      className="transition-all duration-150"
                    />
                    {(n.type === "model" || n.type === "category" || isHovered) && (
                      <text
                        x={0}
                        y={n.r + 12}
                        textAnchor="middle"
                        className="pointer-events-none fill-foreground font-mono"
                        style={{ fontSize: n.type === "model" ? 11 : 9, fontWeight: n.type === "model" ? 600 : 400 }}
                      >
                        {n.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      )}

      {/* Hover detail */}
      <div className="mt-2 min-h-[2rem] rounded-md bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
        {hovered ? (
          <span>
            <Badge variant="outline" className="mr-1.5 text-[0.6rem] capitalize">
              {hovered.split(":")[0]}
            </Badge>
            <span className="font-mono text-foreground">{hovered.split(":")[1]}</span>
            {connectedIds && (
              <span className="ml-2">
                · {connectedIds.size - 1} connection{connectedIds.size - 1 !== 1 ? "s" : ""}
              </span>
            )}
          </span>
        ) : (
          <span>Hover a node to highlight its connections. Toggle node types above.</span>
        )}
      </div>
    </div>
  );
}
