"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Plug,
  Boxes,
  FolderGit2,
  ArrowDown,
  Layers,
  Shield,
  BookOpen,
  Webhook,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LAYERS = [
  {
    id: "harness",
    label: "Harness",
    subtitle: "Execution surface",
    icon: Monitor,
    color: "sky",
    items: [
      "Claude Code",
      "Codex",
      "Cursor",
      "OpenCode",
      "Gemini",
      "Zed",
      "Kiro",
      "Qwen",
    ],
    desc: "The IDE/CLI that runs the model. Each has its own config + hook format.",
  },
  {
    id: "adapter",
    label: "Harness Adapter",
    subtitle: "Thin edge layer",
    icon: Plug,
    color: "violet",
    items: [".claude/", ".codex/", ".cursor/", ".opencode/", ".gemini/"],
    desc: "Loads the shared assets. Adapts event shape + command names at the edge.",
  },
  {
    id: "layer",
    label: "ECC Durable Layer",
    subtitle: "Authored once",
    icon: Layers,
    color: "amber",
    items: [
      { name: "skills/", icon: BookOpen, count: 286 },
      { name: "agents/", icon: Shield, count: 68 },
      { name: "hooks/", icon: Webhook, count: 23 },
      { name: "rules/", icon: Shield, count: 121 },
      { name: "memory/", icon: Database, count: 3 },
    ],
    desc: "The reusable behavior — skills, agents, hooks, rules, memory. Harness-neutral.",
  },
  {
    id: "repo",
    label: "Source Repo",
    subtitle: "affaan-m/ecc",
    icon: FolderGit2,
    color: "emerald",
    items: ["MIT licensed", "v2.2.0", "1 repo → many harnesses"],
    desc: "The single source of truth. Adapters pull from here; nothing is duplicated.",
  },
];

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  sky: {
    bg: "bg-sky-500/5",
    border: "border-sky-500/25",
    text: "text-sky-600 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  violet: {
    bg: "bg-violet-500/5",
    border: "border-violet-500/25",
    text: "text-violet-600 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  amber: {
    bg: "bg-amber-500/5",
    border: "border-amber-500/25",
    text: "text-amber-600 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  emerald: {
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/25",
    text: "text-emerald-600 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
};

export function ArchitectureDiagram() {
  const [active, setActive] = React.useState<string>("layer");

  return (
    <div className="rounded-xl border border-border bg-card p-4 sm:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold">The layering</h3>
          <p className="text-xs text-muted-foreground">
            Hover or tap a layer to see what lives there.
          </p>
        </div>
        <p className="font-mono text-[0.65rem] text-muted-foreground">
          authored once → loaded by many harnesses
        </p>
      </div>

      <div className="space-y-1.5">
        {LAYERS.map((layer, i) => {
          const colors = COLOR_MAP[layer.color];
          const isActive = active === layer.id;
          return (
            <div key={layer.id}>
              <motion.button
                type="button"
                onClick={() => setActive(layer.id)}
                onMouseEnter={() => setActive(layer.id)}
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.995 }}
                className={cn(
                  "group relative w-full overflow-hidden rounded-lg border p-4 text-left transition-all",
                  isActive ? cn(colors.bg, colors.border, "shadow-sm") : "border-border bg-muted/20 hover:bg-muted/40",
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
                      isActive ? cn(colors.bg, colors.border, colors.text) : "border-border bg-card text-muted-foreground",
                    )}
                  >
                    <layer.icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className={cn("text-sm font-semibold", isActive ? colors.text : "text-foreground")}>
                        {layer.label}
                      </span>
                      <span className="font-mono text-[0.65rem] text-muted-foreground">
                        {layer.subtitle}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{layer.desc}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {layer.items.map((it) => {
                        const name = typeof it === "string" ? it : it.name;
                        const Icon = typeof it === "string" ? null : it.icon;
                        const count = typeof it === "string" ? null : it.count;
                        return (
                          <span
                            key={name}
                            className={cn(
                              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-mono text-[0.65rem] transition-colors",
                              isActive
                                ? cn(colors.border, colors.bg, colors.text)
                                : "border-border bg-card text-muted-foreground",
                            )}
                          >
                            {Icon && <Icon className="h-2.5 w-2.5" />}
                            {name}
                            {count !== null && (
                              <span className="rounded bg-foreground/10 px-1 tabular-nums">{count}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </motion.button>
              {i < LAYERS.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowDown className="h-3 w-3 text-muted-foreground/50" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 rounded-md bg-accent/30 p-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">The golden rule:</span>{" "}
        if a change requires editing three harness copies of the same workflow, the shared
        source is in the wrong place. Put the workflow back in <code className="font-mono">skills/</code>,
        then adapt only loading at the edge.
      </p>
    </div>
  );
}
