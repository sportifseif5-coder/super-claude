"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Boxes,
  Users,
  BookOpen,
  Terminal,
  Shield,
  GitBranch,
  Webhook,
  BrainCircuit,
  Database,
  Layers,
  Github,
  ExternalLink,
  ArrowRight,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Zap,
  Command as CommandIcon,
  Search as SearchIcon,
  GitCompare,
  Keyboard as KeyboardIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { CatalogBrowser } from "@/components/ecc/catalog-browser";
import { SourceBrowser } from "@/components/ecc/source-browser";
import { CodeBlock } from "@/components/ecc/code-block";
import { HooksExplorer } from "@/components/ecc/hooks-explorer";
import { McpCatalog } from "@/components/ecc/mcp-catalog";
import { CommandPalette } from "@/components/ecc/command-palette";
import { ProviderChart } from "@/components/ecc/provider-chart";
import { ItemDetailModal, DiscoverButton } from "@/components/ecc/item-detail-modal";
import { ArchitectureDiagram } from "@/components/ecc/architecture-diagram";
import { ScrollSpy } from "@/components/ecc/scroll-spy";
import { CompareModal } from "@/components/ecc/compare-modal";
import { ShortcutHelp } from "@/components/ecc/shortcut-help";
import { StatsChart } from "@/components/ecc/stats-chart";
import { ArchCard } from "@/components/ecc/arch-card";
import { ReadingProgress } from "@/components/ecc/reading-progress";
import { RelationshipGraph } from "@/components/ecc/relationship-graph";
import type {
  Overview,
  CatalogResponse,
  ArchitectureSection,
  NotableFile,
  CatalogItem,
} from "@/components/ecc/types";

export default function Home() {
  const [overview, setOverview] = React.useState<Overview | null>(null);
  const [catalog, setCatalog] = React.useState<CatalogResponse | null>(null);
  const [sections, setSections] = React.useState<ArchitectureSection[]>([]);
  const [notableFiles, setNotableFiles] = React.useState<NotableFile[]>([]);
  const [catalogLoading, setCatalogLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [detailItem, setDetailItem] = React.useState<CatalogItem | null>(null);
  const [compareOpen, setCompareOpen] = React.useState(false);
  const [compareA, setCompareA] = React.useState<CatalogItem | null>(null);
  const [compareB, setCompareB] = React.useState<CatalogItem | null>(null);
  const [helpOpen, setHelpOpen] = React.useState(false);

  React.useEffect(() => {
    Promise.all([
      fetch("/api/ecc/overview").then((r) => r.json()),
      fetch("/api/ecc/catalog").then((r) => r.json()),
      fetch("/api/ecc/file").then((r) => r.json()),
    ])
      .then(([ov, cat, fileIdx]) => {
        if (ov.error) throw new Error(ov.error);
        setOverview(ov);
        setCatalog(cat);
        setSections(fileIdx.sections ?? []);
        setNotableFiles(fileIdx.notableFiles ?? []);
        setCatalogLoading(false);
        // Handle deep links: #agent/<slug>, #skill/<slug>, #command/<slug>
        const hash = window.location.hash.slice(1);
        const m = hash.match(/^(agent|skill|command|rule)\/(.+)$/);
        if (m) {
          const type = `${m[1]}s` as "agents" | "skills" | "commands" | "rules";
          const slug = decodeURIComponent(m[2]);
          const items = (cat[type] as CatalogItem[]) ?? [];
          const found = items.find((it) => it.slug === slug);
          if (found) {
            // Defer to next tick to ensure state is ready
            setTimeout(() => setDetailItem(found), 0);
          }
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  // Global keyboard shortcuts
  React.useEffect(() => {
    let lastG = 0;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Cmd+K / Ctrl+K — always
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      if (typing) return;
      // Don't trigger single-key shortcuts when a modal/overlay is open
      const anyOpen = paletteOpen || detailItem || compareOpen || helpOpen;
      if (anyOpen) return;

      // ? → help
      if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setHelpOpen((o) => !o);
        return;
      }
      // d → discover
      if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("ecc:discover"));
        return;
      }
      // t → toggle theme
      if (e.key.toLowerCase() === "t") {
        e.preventDefault();
        document.dispatchEvent(new CustomEvent("ecc:toggle-theme"));
        return;
      }
      // c → compare
      if (e.key.toLowerCase() === "c") {
        e.preventDefault();
        setCompareOpen(true);
        return;
      }
      // g followed by letter → jump
      if (e.key.toLowerCase() === "g") {
        lastG = Date.now();
        return;
      }
      if (lastG && Date.now() - lastG < 800) {
        const map: Record<string, string> = {
          a: "catalog",
          s: "catalog",
          h: "hooks-explorer",
          m: "mcp",
          c: "catalog",
          o: "source",
          r: "architecture",
        };
        const id = map[e.key.toLowerCase()];
        if (id) {
          e.preventDefault();
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        lastG = 0;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, detailItem, compareOpen, helpOpen]);

  // Listen for discover events (from keyboard + button)
  React.useEffect(() => {
    const handler = async () => {
      try {
        const r = await fetch("/api/ecc/random");
        const d = await r.json();
        if (d.filePath) {
          setDetailItem({
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
      }
    };
    document.addEventListener("ecc:discover", handler);
    return () => document.removeEventListener("ecc:discover", handler);
  }, []);

  // Listen for theme toggle events
  React.useEffect(() => {
    const handler = () => {
      document.documentElement.classList.toggle("dark");
    };
    document.addEventListener("ecc:toggle-theme", handler);
    return () => document.removeEventListener("ecc:toggle-theme", handler);
  }, []);

  const openCompare = (a?: CatalogItem, b?: CatalogItem) => {
    setCompareA(a ?? null);
    setCompareB(b ?? null);
    setCompareOpen(true);
  };

  // Update URL hash when detail modal opens (shareable deep links)
  React.useEffect(() => {
    if (detailItem) {
      const type = detailItem.type.replace(/s$/, "");
      const url = `#${type}/${detailItem.slug}`;
      if (window.location.hash !== url) {
        history.replaceState(null, "", url);
      }
    }
  }, [detailItem]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ReadingProgress />
      <ScrollSpy />
      <Header
        overview={overview}
        onOpenPalette={() => setPaletteOpen(true)}
        onOpenCompare={() => openCompare()}
        onOpenHelp={() => setHelpOpen(true)}
      />
      <main className="flex-1">
        <Hero
          overview={overview}
          onOpenPalette={() => setPaletteOpen(true)}
          onDiscover={(item) => setDetailItem(item)}
        />
        <Stats overview={overview} />
        <Architecture sections={sections} overview={overview} />
        <RelationshipGraphSection />
        <Catalog
          catalog={catalog}
          loading={catalogLoading}
          onSelect={(item) => setDetailItem(item)}
          onCompare={(item) => openCompare(item)}
        />
        <AIIntegration overview={overview} />
        <HooksExplorerSection />
        <HooksMemory overview={overview} sections={sections} />
        <McpCatalogSection />
        <SourceCode notableFiles={notableFiles} />
        {error && (
          <section className="border-t border-border py-8">
            <div className="mx-auto max-w-5xl px-4">
              <p className="text-sm text-destructive">Error: {error}</p>
            </div>
          </section>
        )}
      </main>
      <Footer overview={overview} onOpenHelp={() => setHelpOpen(true)} />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
      <ItemDetailModal item={detailItem} onClose={() => setDetailItem(null)} />
      <CompareModal
        open={compareOpen}
        onOpenChange={setCompareOpen}
        catalog={catalog}
        initialA={compareA}
        initialB={compareB}
      />
      <ShortcutHelp open={helpOpen} onOpenChange={setHelpOpen} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function Header({
  overview,
  onOpenPalette,
  onOpenCompare,
  onOpenHelp,
}: {
  overview: Overview | null;
  onOpenPalette: () => void;
  onOpenCompare: () => void;
  onOpenHelp: () => void;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <a href="#top" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div className="leading-none">
            <span className="block text-sm font-semibold">ECC Explorer</span>
            <span className="block font-mono text-[0.65rem] text-muted-foreground">
              {overview ? `v${overview.repo.version}` : "loading…"}
            </span>
          </div>
        </a>
        <nav className="hidden items-center gap-1 lg:flex">
          {[
            ["Architecture", "#architecture"],
            ["Graph", "#graph"],
            ["Catalog", "#catalog"],
            ["AI Layer", "#ai"],
            ["Hooks", "#hooks-explorer"],
            ["MCP", "#mcp"],
            ["Source", "#source"],
          ].map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenPalette}
            className="hidden items-center gap-2 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground sm:inline-flex"
            aria-label="Open command palette"
          >
            <SearchIcon className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search…</span>
            <kbd className="inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[0.6rem]">
              <CommandIcon className="h-2.5 w-2.5" />K
            </kbd>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenCompare}
            className="hidden h-8 px-2 text-xs md:inline-flex"
            aria-label="Compare two items"
          >
            <GitCompare className="mr-1 h-3.5 w-3.5" /> Compare
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onOpenHelp}
            aria-label="Keyboard shortcuts"
          >
            <KeyboardIcon className="h-4 w-4" />
          </Button>
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <a
              href="https://github.com/affaan-m/ecc"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="mr-1.5 h-4 w-4" /> Repo
            </a>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */
function Hero({
  overview,
  onOpenPalette,
  onDiscover,
}: {
  overview: Overview | null;
  onOpenPalette: () => void;
  onDiscover: (item: CatalogItem) => void;
}) {
  return (
    <section id="top" className="relative overflow-hidden border-b border-border">
      <div className="ecc-hero-grid absolute inset-0 -z-10" />
      <div
        aria-hidden
        className="ecc-mesh-bg absolute inset-0 -z-10 opacity-60"
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 70%)",
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1 border-primary/40 text-primary">
              <Boxes className="h-3 w-3" /> Agent Harness OS
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3 w-3" /> MIT Licensed
            </Badge>
            {overview && (
              <Badge variant="outline" className="font-mono">
                v{overview.repo.version}
              </Badge>
            )}
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Everything{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Claude Code
            </span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            {overview?.tagline ?? "Optimize the context window. Persist everything else."}
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            An interactive dive into{" "}
            <a
              href="https://github.com/affaan-m/ecc"
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-foreground underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
            >
              affaan-m/ecc
            </a>{" "}
            — the cross-harness agent operating system that gives your AI coding agent a
            coordinated engineering system: plan, test, review, verify, remember, improve.
          </p>
          <div className="mt-7 flex flex-wrap gap-2">
            <Button asChild>
              <a href="#architecture">
                Explore the architecture <ArrowRight className="ml-1.5 h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="#catalog">
                Browse {overview ? overview.counts.agents + overview.counts.skills : "the"} assets
              </a>
            </Button>
            <Button variant="ghost" size="sm" onClick={onOpenPalette} className="hidden sm:inline-flex">
              <SearchIcon className="mr-1.5 h-4 w-4" /> Search
              <kbd className="ml-2 inline-flex items-center gap-0.5 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[0.6rem]">
                <CommandIcon className="h-2.5 w-2.5" />K
              </kbd>
            </Button>
            <DiscoverButton onPick={onDiscover} />
          </div>
        </motion.div>

        {/* The flow */}
        {overview && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="mt-12 flex flex-wrap items-center gap-2 sm:gap-3"
          >
            {overview.flow.map((step, i) => (
              <React.Fragment key={step}>
                <div
                  className="ecc-flow-step flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2"
                  style={{ animationDelay: `${i * 0.25}s` }}
                >
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 font-mono text-[0.65rem] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span className="font-mono text-sm">{step}</span>
                </div>
                {i < overview.flow.length - 1 && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground/60" />
                )}
              </React.Fragment>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Stats                                                               */
/* ------------------------------------------------------------------ */
function Stats({ overview }: { overview: Overview | null }) {
  const stats = overview
    ? [
        { label: "Agents", value: overview.counts.agents, icon: Users, hint: "sandboxed subagents" },
        { label: "Skills", value: overview.counts.skills, icon: BookOpen, hint: "durable workflows" },
        { label: "Commands", value: overview.counts.commands, icon: Terminal, hint: "slash shims" },
        { label: "Rule Packs", value: overview.counts.rulePacks, icon: Shield, hint: `${overview.counts.ruleFiles} files` },
        { label: "Hooks", value: overview.counts.hooks, icon: Webhook, hint: "lifecycle enforcers" },
        { label: "MCP Servers", value: overview.counts.mcpServers, icon: Boxes, hint: "reference catalog" },
        { label: "LLM Layer Files", value: overview.counts.srcLlmFiles, icon: BrainCircuit, hint: "Python providers" },
        { label: "ecc2 Rust Files", value: overview.counts.ecc2RustFiles, icon: Cpu, hint: "control plane" },
      ]
    : [];

  return (
    <section className="border-b border-border">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {(overview ? stats : Array.from({ length: 8 })).map((s, i) => {
            const loaded = s as { label: string; value: number; icon: React.ElementType; hint: string } | undefined;
            const Icon = loaded?.icon ?? Boxes;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.96 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.3, delay: i * 0.04 }}
              >
                <Card className="overflow-hidden">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-bold tabular-nums">
                          {loaded ? loaded.value : "—"}
                        </span>
                        <span className="text-xs text-muted-foreground">{loaded?.label}</span>
                      </div>
                      <p className="truncate text-[0.7rem] text-muted-foreground">
                        {loaded?.hint ?? "loading"}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        {/* Assets-by-type bar chart */}
        <div className="mt-6">
          <StatsChart overview={overview} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Architecture                                                        */
/* ------------------------------------------------------------------ */
function Architecture({
  sections,
  overview,
}: {
  sections: ArchitectureSection[];
  overview: Overview | null;
}) {
  const sectionIcons: Record<string, React.ElementType> = {
    "harness-vs-layer": Layers,
    "four-primitives": Boxes,
    hooks: Webhook,
    "memory-vault": Database,
    "ai-layer": BrainCircuit,
    ecc2: Cpu,
  };

  return (
    <section id="architecture" className="scroll-mt-16 border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Architecture"
          title="Harness vs. the durable layer"
          subtitle="ECC separates the execution surface from the reusable behavior. Skills, rules, hooks, and memory are authored once — thin harness adapters only load them."
        />

        {/* Harness strip */}
        {overview && (
          <div className="mt-8 mb-10">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Supported harnesses
            </p>
            <div className="flex flex-wrap gap-1.5">
              {overview.harnesses.map((h) => (
                <Badge key={h} variant="secondary" className="font-mono text-xs">
                  {h}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Principles */}
        {overview && overview.principles.length > 0 && (
          <div className="mb-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {overview.principles.map((p, i) => {
              const [name, ...rest] = p.split("—");
              return (
                <Card key={i} className="bg-card">
                  <CardContent className="p-4">
                    <p className="font-mono text-[0.65rem] text-primary">P{i + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{name.trim()}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{rest.join("—").trim()}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Architecture cards (progressive disclosure) */}
        <div className="grid gap-4 lg:grid-cols-2">
          {sections.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48 animate-pulse bg-muted/30" />
              ))
            : sections.map((s, i) => {
                const Icon = sectionIcons[s.id] ?? Layers;
                return (
                  <ArchCard
                    key={s.id}
                    section={s}
                    index={i}
                    icon={Icon}
                    defaultOpen={i < 2}
                  />
                );
              })}
        </div>

        {/* Interactive layered diagram */}
        <div className="mt-8">
          <ArchitectureDiagram />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Catalog                                                             */
/* ------------------------------------------------------------------ */
function Catalog({
  catalog,
  loading,
  onSelect,
  onCompare,
}: {
  catalog: CatalogResponse | null;
  loading: boolean;
  onSelect: (item: CatalogItem) => void;
  onCompare: (item: CatalogItem) => void;
}) {
  return (
    <section id="catalog" className="scroll-mt-16 border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="The Catalog"
          title="68 agents · 286 skills · 94 commands"
          subtitle="Every asset is a markdown file with YAML frontmatter. Browse, search, and click any item to open a deep-dive modal with parsed “When to Use”, examples, a section index, and the full source."
        />
        <div className="mt-8">
          <CatalogBrowser catalog={catalog} loading={loading} onSelect={onSelect} onCompare={onCompare} />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* AI Integration                                                      */
/* ------------------------------------------------------------------ */
function AIIntegration({ overview }: { overview: Overview | null }) {
  const providers = overview?.providers ?? [];

  return (
    <section id="ai" className="scroll-mt-16 border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="AI Integration"
          title="A provider-agnostic LLM layer"
          subtitle="src/llm/ ships a clean Python abstraction: an LLMProvider ABC, frozen dataclass types, typed errors, and a ReAct agent loop. The host harness does the heavy lifting; this layer powers direct model calls."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Providers */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Cpu className="h-4 w-4 text-primary" /> Providers & models
            </h3>
            {providers.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="h-20 animate-pulse bg-muted/30" />
                ))
              : providers.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{p.label}</p>
                          <p className="text-xs text-muted-foreground">{p.note}</p>
                        </div>
                        <Badge variant="outline" className="font-mono text-[0.65rem]">
                          {p.models.length} model{p.models.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {p.models.map((m) => (
                          <span
                            key={m.name}
                            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 font-mono text-[0.65rem]"
                            title={`${m.contextWindow?.toLocaleString() ?? "?"} ctx · tools:${m.supportsTools} vision:${m.supportsVision}`}
                          >
                            <span className="text-foreground">{m.name}</span>
                            <span className="text-muted-foreground">
                              {(m.contextWindow ?? 0) >= 1_000_000
                                ? `${(m.contextWindow ?? 0) / 1_000_000}M`
                                : `${Math.round((m.contextWindow ?? 0) / 1000)}k`}
                            </span>
                            {m.supportsVision && (
                              <span className="text-primary" title="vision">◉</span>
                            )}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>

          {/* ReAct loop visualization */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Zap className="h-4 w-4 text-primary" /> The ReAct agent loop
            </h3>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-mono text-foreground">ReActAgent</span> in{" "}
                  <span className="font-mono text-foreground">src/llm/tools/executor.py</span> runs a
                  reason → act loop until the model stops requesting tools.
                </p>
                <div className="mt-4 flex flex-col gap-2">
                  {[
                    { label: "generate(input)", icon: BrainCircuit, tone: "primary" },
                    { label: "tool_calls?", icon: GitBranch, tone: "muted" },
                    { label: "execute_all(tool_calls)", icon: Terminal, tone: "primary" },
                    { label: "append TOOL messages", icon: ArrowRight, tone: "muted" },
                    { label: "repeat (max 10)", icon: Zap, tone: "primary" },
                  ].map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted font-mono text-[0.65rem]">
                          {i + 1}
                        </span>
                        <div className="flex flex-1 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5">
                          <Icon
                            className={cn(
                              "h-3.5 w-3.5",
                              step.tone === "primary" ? "text-primary" : "text-muted-foreground",
                            )}
                          />
                          <span className="font-mono text-xs">{step.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-4">
                  <CodeBlock
                    language="python"
                    showHeader={false}
                    maxHeight={180}
                    code={`class ReActAgent:
    def __init__(self, provider, executor, max_iterations=10):
        self.provider = provider
        self.executor = executor
        self.max_iterations = max_iterations

    async def run(self, input: LLMInput) -> LLMOutput:
        messages = list(input.messages)
        for _ in range(self.max_iterations):
            output = self.provider.generate(input_copy)
            if not output.has_tool_calls:
                return output
            results = self.executor.execute_all(output.tool_calls)
            # append assistant + TOOL messages, repeat`}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Provider comparison radar */}
        {providers.length > 0 && (
          <div className="mt-6">
            <ProviderChart providers={providers} />
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Relationship Graph                                                  */
/* ------------------------------------------------------------------ */
function RelationshipGraphSection() {
  return (
    <section
      id="graph"
      className="ecc-section-accent scroll-mt-16 border-b border-border py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Network"
          title="Agent relationship graph"
          subtitle="A radial visualization of how all 68 agents cluster by category, which models they use (sonnet/haiku/opus), and which tools they're granted. Hover any node to highlight its connections."
        />
        <div className="mt-8">
          <RelationshipGraph />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Hooks Explorer (interactive)                                        */
/* ------------------------------------------------------------------ */
function HooksExplorerSection() {
  return (
    <section
      id="hooks-explorer"
      className="ecc-section-accent scroll-mt-16 border-b border-border py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Interactive"
          title="Hooks Explorer"
          subtitle="Every hook registered in hooks/hooks.json, parsed into structured cards. Filter by event or phase, search by id/matcher/script, and click any hook for full detail including the extracted script path and flags."
        />
        <div className="mt-8">
          <HooksExplorer />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* MCP Catalog                                                         */
/* ------------------------------------------------------------------ */
function McpCatalogSection() {
  return (
    <section
      id="mcp"
      className="ecc-section-accent scroll-mt-16 border-b border-border py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Integrations"
          title="MCP server catalog"
          subtitle="The reference catalog of Model Context Protocol servers from mcp-configs/mcp-servers.json. 35 servers spanning databases, deployment platforms, memory, search, and browser automation."
        />
        <div className="mt-8">
          <McpCatalog />
        </div>
      </div>
    </section>
  );
}
function HooksMemory({
  overview,
  sections,
}: {
  overview: Overview | null;
  sections: ArchitectureSection[];
}) {
  const hooksSection = sections.find((s) => s.id === "hooks");
  const memorySection = sections.find((s) => s.id === "memory-vault");

  const hookEvents = [
    { event: "SessionStart", id: "session:start", blocking: false, purpose: "Load bounded prior context" },
    { event: "PreToolUse", id: "pre:config-protection", blocking: true, purpose: "Block edits to linter configs" },
    { event: "PreToolUse", id: "pre:gateguard-fact-force", blocking: true, purpose: "Force research before first edit" },
    { event: "PreToolUse", id: "pre:mcp-health-check", blocking: true, purpose: "Block unhealthy MCP calls" },
    { event: "PreCompact", id: "pre:compact", blocking: false, purpose: "Save state before compaction" },
    { event: "Stop", id: "stop:format-typecheck", blocking: true, purpose: "Quality gate after edits" },
  ];

  const memoryScopes = [
    { scope: "project", path: "<repo>/.ecc/memory/project/", icon: GitBranch },
    { scope: "team", path: "<repo>/.ecc/memory/team/", icon: Users },
    { scope: "user", path: "~/.ecc/memory/", icon: Database },
  ];

  const trustBoundaries = [
    { text: "Create-only entries, always unreviewed", icon: Lock },
    { text: "Recalled memory is data, not instruction", icon: Shield },
    { text: "Secret-shaped writes rejected", icon: AlertTriangle },
    { text: "Symlinks not followed", icon: AlertTriangle },
    { text: ".gitignore tampering stops writes", icon: AlertTriangle },
    { text: "Human promotion → governed artifact", icon: CheckCircle2 },
  ];

  return (
    <section id="hooks" className="scroll-mt-16 border-b border-border py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Enforcement & Memory"
          title="Hooks enforce; memory persists"
          subtitle="Skills and agents are advisory. Hooks are real scripts that fire on lifecycle events and can block tool calls. The memory vault is the cross-harness, file-first knowledge-transfer surface."
        />

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          {/* Hooks */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Webhook className="h-4.5 w-4.5 text-primary" /> Hook lifecycle
                </CardTitle>
                <Badge variant="outline" className="font-mono text-xs">
                  {overview?.counts.hooks ?? "—"} registered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-3 text-sm text-muted-foreground">{hooksSection?.summary}</p>
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Event</th>
                      <th className="px-3 py-2 font-medium">Hook</th>
                      <th className="px-3 py-2 font-medium">Block</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {hookEvents.map((h) => (
                      <tr key={h.id} className="hover:bg-accent/40">
                        <td className="px-3 py-2 font-mono text-[0.7rem] text-muted-foreground">
                          {h.event}
                        </td>
                        <td className="px-3 py-2">
                          <span className="font-mono text-xs">{h.id}</span>
                          <span className="block text-[0.7rem] text-muted-foreground">{h.purpose}</span>
                        </td>
                        <td className="px-3 py-2">
                          {h.blocking ? (
                            <Badge variant="destructive" className="text-[0.6rem]">
                              blocks
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[0.6rem]">
                              observe
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Memory */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-4.5 w-4.5 text-primary" /> Memory vault
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="mb-3 text-sm text-muted-foreground">{memorySection?.summary}</p>
              <div className="space-y-1.5">
                {memoryScopes.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.scope}
                      className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2"
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="w-12 font-mono text-xs font-medium">{s.scope}</span>
                      <span className="font-mono text-[0.7rem] text-muted-foreground">{s.path}</span>
                    </div>
                  );
                })}
              </div>
              <p className="mb-2 mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trust boundary
              </p>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {trustBoundaries.map((t, i) => {
                  const Icon = t.icon;
                  return (
                    <li key={i} className="flex items-center gap-1.5 text-xs">
                      <Icon className="h-3 w-3 shrink-0 text-primary/70" />
                      <span>{t.text}</span>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Source code browser                                                  */
/* ------------------------------------------------------------------ */
function SourceCode({ notableFiles }: { notableFiles: NotableFile[] }) {
  return (
    <section id="source" className="scroll-mt-16 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <SectionHeading
          eyebrow="Source Code"
          title="Read the actual implementation"
          subtitle="Curated files from the cloned repo — the Python LLM layer, the Rust control plane, the hook registry, and the identity docs. Pulled live, syntax-highlighted."
        />
        <div className="mt-8">
          {notableFiles.length > 0 ? (
            <SourceBrowser notableFiles={notableFiles} />
          ) : (
            <Card className="h-64 animate-pulse bg-muted/30" />
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Shared: section heading                                             */
/* ------------------------------------------------------------------ */
function SectionHeading({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.4 }}
      className="max-w-2xl"
    >
      <p className="mb-1.5 font-mono text-xs font-medium uppercase tracking-wider text-primary">
        {eyebrow}
      </p>
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground sm:text-base">{subtitle}</p>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */
function Footer({ overview, onOpenHelp }: { overview: Overview | null; onOpenHelp: () => void }) {
  return (
    <footer className="mt-auto border-t border-border bg-card/50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">ECC Explorer</p>
              <p className="font-mono text-[0.65rem] text-muted-foreground">
                {overview
                  ? `${overview.repo.name} · v${overview.repo.version} · ${overview.repo.license}`
                  : "affaan-m/ecc"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <button
              type="button"
              onClick={onOpenHelp}
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <KeyboardIcon className="h-3 w-3" /> Shortcuts
              <kbd className="rounded border border-border bg-muted px-1 font-mono text-[0.6rem]">?</kbd>
            </button>
            <span>
              Source:{" "}
              <a
                href="https://github.com/affaan-m/ecc"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-foreground underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
              >
                affaan-m/ecc
              </a>
            </span>
            <a
              href="https://ecc.tools"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              ecc.tools <ExternalLink className="h-3 w-3" />
            </a>
            <span className="font-mono">MIT</span>
          </div>
        </div>
        <p className="mt-4 max-w-3xl text-[0.7rem] leading-relaxed text-muted-foreground">
          This is an independent interactive visualization of the MIT-licensed affaan-m/ecc
          repository, built with Next.js 16. All repository content (agents, skills, commands,
          rules, source code) is read live from a local clone and remains the property of its
          contributors under the MIT license.
        </p>
      </div>
    </footer>
  );
}
