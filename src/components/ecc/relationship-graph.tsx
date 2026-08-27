"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Loader2, Network, Filter, PlusCircle, MinusCircle, RotateCcw as ResetIcon, Search as SearchIcon, X } from "lucide-react";
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

interface RelationshipGraphProps {
  onAgentClick?: (slug: string) => void;
}

export function RelationshipGraph({ onAgentClick }: RelationshipGraphProps) {
  const [data, setData] = React.useState<GraphData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [hovered, setHovered] = React.useState<string | null>(null);
  const [selectedType, setSelectedType] = React.useState<GraphNode["type"] | null>(null);
  const [activeTypes, setActiveTypes] = React.useState<Set<GraphNode["type"]>>(
    new Set(["agent", "model", "category"]),
  );
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const dragRef = React.useRef<{ x: number; y: number; px: number; py: number } | null>(null);

  const onWheel = React.useCallback((e: WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(2.5, z + (e.deltaY < 0 ? 0.15 : -0.15))));
  }, []);

  const onMouseDown = (e: React.MouseEvent) => {
    dragRef.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    setIsDragging(true);
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragRef.current) return;
    setPan({
      x: dragRef.current.px + (e.clientX - dragRef.current.x),
      y: dragRef.current.py + (e.clientY - dragRef.current.y),
    });
  };
  const onMouseUp = () => {
    dragRef.current = null;
    setIsDragging(false);
  };

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

  // Search matches: agent node IDs whose label contains the query
  const searchMatches = React.useMemo(() => {
    if (!search.trim()) return null;
    const q = search.toLowerCase();
    const ids = new Set<string>();
    for (const n of nodes) {
      if (n.type === "agent" && n.label.toLowerCase().includes(q)) {
        ids.add(n.id);
      }
    }
    return ids;
  }, [search, nodes]);

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
        <div className="flex flex-wrap items-center gap-2">
          {/* Node search */}
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find agent…"
              className="h-7 w-28 rounded-md border border-border bg-muted/40 pl-6 pr-2 text-xs outline-none transition-colors focus:border-primary/40 focus:bg-card sm:w-36"
              aria-label="Search agents in graph"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="h-3 w-3" />
              </button>
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
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Building graph…
          </div>
          {/* Skeleton */}
          <div className="relative h-[400px] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-muted/20">
            <div className="absolute left-1/2 top-1/2 h-32 w-32 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full bg-primary/5" />
            <div className="absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-primary/10" />
            <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-primary/5" />
          </div>
        </div>
      ) : (
        <div className="relative">
          {/* Zoom controls */}
          <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.2))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Zoom in"
              title="Zoom in"
            >
              <PlusCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.5, z - 0.2))}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Zoom out"
              title="Zoom out"
            >
              <MinusCircle className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: 0, y: 0 });
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-border bg-card/80 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground"
              aria-label="Reset view"
              title="Reset view"
            >
              <ResetIcon className="h-3.5 w-3.5" />
            </button>
            <span className="mt-0.5 rounded-md border border-border bg-card/80 px-1 py-0.5 text-center font-mono text-[0.55rem] text-muted-foreground backdrop-blur">
              {Math.round(zoom * 100)}%
            </span>
          </div>
          <div
            className="ecc-scroll overflow-hidden"
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
          <svg
            viewBox="0 0 800 560"
            className="mx-auto h-[480px] w-full max-w-3xl select-none"
            style={{ minWidth: 600 }}
          >
            {/* Zoom/pan transform group */}
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
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
              {nodes.map((n, idx) => {
                const isHovered = hovered === n.id;
                const isConnected = connectedIds?.has(n.id);
                const isSearchMatch = searchMatches?.has(n.id);
                const isSearchDimmed = searchMatches && n.type === "agent" && !isSearchMatch;
                const isDimmed = (hovered && !isConnected) || isSearchDimmed;
                const isSearchHighlight = isSearchMatch && n.type === "agent";
                const color = TYPE_COLORS[n.type];
                const isClickable = n.type === "agent" && onAgentClick;
                return (
                  <motion.g
                    key={n.id}
                    transform={`translate(${n.x},${n.y})`}
                    className={isClickable ? "cursor-pointer" : "cursor-default"}
                    style={{ opacity: isDimmed ? 0.15 : 1 }}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: isDimmed ? 0.15 : 1, scale: 1 }}
                    transition={{
                      duration: 0.3,
                      delay: Math.min(idx * 0.004, 0.6),
                      ease: "easeOut",
                    }}
                    onMouseEnter={() => setHovered(n.id)}
                    onMouseLeave={() => setHovered(null)}
                    onClick={() => {
                      if (n.type === "agent" && onAgentClick) {
                        onAgentClick(n.label);
                      } else if (n.type === "model" || n.type === "tool" || n.type === "category") {
                        setSelectedType((t) => (t === n.type ? null : n.type));
                      }
                    }}
                  >
                    <circle
                      r={isHovered || isSearchHighlight ? n.r + 3 : n.r}
                      fill={color}
                      fillOpacity={isHovered || isSearchHighlight ? 1 : selectedType === n.type ? 0.9 : 0.7}
                      stroke={isSearchHighlight ? "#fbbf24" : color}
                      strokeWidth={isHovered ? 2 : isSearchHighlight ? 2.5 : selectedType === n.type ? 1.5 : 0}
                      className="transition-all duration-150"
                    />
                    {(n.type === "model" || n.type === "category" || isHovered || isSearchHighlight) && (
                      <text
                        x={0}
                        y={n.r + 12}
                        textAnchor="middle"
                        className={cn("pointer-events-none fill-foreground font-mono", isSearchHighlight && "fill-amber-400")}
                        style={{ fontSize: n.type === "model" ? 11 : 9, fontWeight: n.type === "model" || isSearchHighlight ? 600 : 400 }}
                      >
                        {n.label}
                      </text>
                    )}
                    {isClickable && (
                      <circle
                        r={n.r + 6}
                        fill="none"
                        stroke={color}
                        strokeWidth={1}
                        strokeOpacity={isHovered ? 0.4 : 0}
                        className="pointer-events-none transition-opacity duration-150"
                      />
                    )}
                  </motion.g>
                );
              })}
            </g>
            </g>
            {/* End zoom/pan group */}
          </svg>
          </div>
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
            {hovered.startsWith("agent:") && onAgentClick && (
              <span className="ml-2 text-primary">· click to open</span>
            )}
            {(hovered.startsWith("model:") || hovered.startsWith("tool:") || hovered.startsWith("cat:")) && (
              <span className="ml-2 text-primary">· click to highlight type</span>
            )}
          </span>
        ) : (
          <span>
            {searchMatches ? (
              <span>
                <span className="text-primary font-medium">{searchMatches.size}</span> agent{searchMatches.size !== 1 ? "s" : ""} match “{search}”
                {searchMatches.size > 0 && onAgentClick && (
                  <span className="ml-2 text-primary">· click a highlighted node to open</span>
                )}
              </span>
            ) : (
              <>
                Hover a node to highlight connections.{" "}
                {onAgentClick && <span className="text-primary">Click an agent to open its detail.</span>}{" "}
                Toggle node types above.
                {selectedType && (
                  <button
                    type="button"
                    onClick={() => setSelectedType(null)}
                    className="ml-2 text-primary underline hover:no-underline"
                  >
                    Clear {selectedType} filter
                  </button>
                )}
              </>
            )}
          </span>
        )}
      </div>
    </div>
  );
}
