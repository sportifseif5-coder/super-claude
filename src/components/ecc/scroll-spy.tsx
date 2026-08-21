"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { id: "top", label: "Top" },
  { id: "architecture", label: "Architecture" },
  { id: "catalog", label: "Catalog" },
  { id: "ai", label: "AI Layer" },
  { id: "hooks-explorer", label: "Hooks" },
  { id: "hooks", label: "Memory" },
  { id: "mcp", label: "MCP" },
  { id: "source", label: "Source" },
];

export function ScrollSpy() {
  const [active, setActive] = React.useState("top");
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => {
      // Show after scrolling past hero
      setVisible(window.scrollY > 600);
      // Find the active section
      let current = "top";
      for (const s of SECTIONS) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= 120) current = s.id;
      }
      setActive(current);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <nav
      aria-label="On this page"
      className="fixed left-4 top-1/2 z-40 hidden -translate-y-1/2 xl:block"
    >
      <ul className="flex flex-col gap-1">
        {SECTIONS.map((s) => {
          const isActive = active === s.id;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className={cn(
                  "group flex items-center gap-2 py-1 text-xs transition-colors",
                  isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "h-px transition-all",
                    isActive
                      ? "w-6 bg-primary"
                      : "w-3 bg-muted-foreground/40 group-hover:w-5 group-hover:bg-muted-foreground",
                  )}
                />
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
