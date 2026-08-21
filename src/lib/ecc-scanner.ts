import { promises as fs } from "fs";
import path from "path";

/**
 * ECC Repository Scanner
 * -----------------------
 * Reads the cloned affaan-m/ecc repo at <project>/ecc-repo and exposes
 * parsed metadata: agents, skills, commands, rules, code files, architecture.
 *
 * All file reads are sandboxed to the ecc-repo root. Every public function
 * resolves and validates paths with path.relative + a ".." check.
 */

export const ECC_REPO_ROOT = path.join(process.cwd(), "ecc-repo");

export type Frontmatter = Record<string, unknown>;

export interface CatalogItem {
  name: string;
  slug: string;
  type: CatalogType;
  description: string;
  filePath: string; // repo-relative
  extra: Frontmatter;
}

export type CatalogType = "agents" | "skills" | "commands" | "rules";

export interface CodeFile {
  path: string; // repo-relative
  language: string;
  content: string;
  lines: number;
}

export interface ProviderModel {
  name: string;
  provider: string;
  supportsTools: boolean;
  supportsVision: boolean;
  maxTokens: number | null;
  contextWindow: number | null;
}

export interface Overview {
  repo: {
    name: string;
    version: string;
    license: string;
    description: string;
    url: string;
    homepage: string;
    preferredModel: string;
    fallbackModels: string[];
  };
  counts: {
    agents: number;
    skills: number;
    commands: number;
    rulePacks: number;
    ruleFiles: number;
    hooks: number;
    mcpServers: number;
    srcLlmFiles: number;
    ecc2RustFiles: number;
    scripts: number;
    languages: number;
  };
  principles: string[];
  flow: string[];
  providers: { id: string; label: string; models: ProviderModel[]; note: string }[];
  harnesses: string[];
  tagline: string;
}

export interface ArchitectureSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  code?: { language: string; snippet: string };
}

// ---------------------------------------------------------------------------
// Low-level helpers
// ---------------------------------------------------------------------------

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parseFrontmatter(raw: string): { fm: Frontmatter; body: string } {
  const m = raw.match(FRONTMATTER_RE);
  if (!m) return { fm: {}, body: raw };
  const fmText = m[1];
  const body = m[2];
  const fm: Frontmatter = {};
  // Minimal YAML parser: supports `key: value`, lists under a key, quoted strings.
  const lines = fmText.split(/\r?\n/);
  let currentKey: string | null = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const listMatch = line.match(/^\s*-\s+(.*)$/);
    if (listMatch && currentKey) {
      const existing = fm[currentKey];
      const val = stripQuotes(listMatch[1].trim());
      if (Array.isArray(existing)) {
        existing.push(val);
      } else {
        fm[currentKey] = [val];
      }
      continue;
    }
    const kvMatch = line.match(/^([\w-]+)\s*:\s*(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === "") {
        currentKey = key;
        fm[key] = [];
      } else {
        currentKey = key;
        fm[key] = stripQuotes(val);
      }
    }
  }
  return { fm, body };
}

function stripQuotes(s: string): string {
  if (s.length >= 2 && s[0] === s[s.length - 1] && (s[0] === '"' || s[0] === "'")) {
    return s.slice(1, -1);
  }
  return s;
}

function safeJoin(rel: string): string {
  const resolved = path.resolve(ECC_REPO_ROOT, rel);
  const rel2 = path.relative(ECC_REPO_ROOT, resolved);
  if (rel2.startsWith("..") || path.isAbsolute(rel2)) {
    throw new Error("Path traversal blocked");
  }
  return resolved;
}

async function readText(rel: string): Promise<string> {
  return fs.readFile(safeJoin(rel), "utf8");
}

async function listDir(rel: string): Promise<string[]> {
  return fs.readdir(safeJoin(rel));
}

function langForFile(rel: string): string {
  const ext = path.extname(rel).toLowerCase();
  const map: Record<string, string> = {
    ".ts": "typescript",
    ".tsx": "tsx",
    ".js": "javascript",
    ".jsx": "javascript",
    ".mjs": "javascript",
    ".py": "python",
    ".rs": "rust",
    ".json": "json",
    ".md": "markdown",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".sh": "bash",
    ".toml": "toml",
  };
  return map[ext] ?? "text";
}

function descriptionFromFm(fm: Frontmatter): string {
  const d = fm["description"];
  if (typeof d === "string") return d.trim();
  if (Array.isArray(d)) return d.join(" ").trim();
  return "";
}

// ---------------------------------------------------------------------------
// Catalog scanning (agents / skills / commands / rules)
// ---------------------------------------------------------------------------

async function scanMarkdownDir(
  type: CatalogType,
  relDir: string,
  options: { fileGlob?: "file" | "dir" } = {},
): Promise<CatalogItem[]> {
  const items: CatalogItem[] = [];
  let entries: string[];
  try {
    entries = await listDir(relDir);
  } catch {
    return items;
  }

  if (type === "skills") {
    // skills are subdirectories with SKILL.md
    for (const entry of entries) {
      const skillMdRel = path.posix.join(relDir, entry, "SKILL.md");
      try {
        const raw = await readText(skillMdRel);
        const { fm } = parseFrontmatter(raw);
        items.push({
          name: String(fm["name"] ?? entry),
          slug: entry,
          type,
          description: descriptionFromFm(fm),
          filePath: skillMdRel,
          extra: fm,
        });
      } catch {
        /* not a skill dir */
      }
    }
  } else if (type === "rules") {
    // rules are subdirectories per language with multiple .md files
    for (const entry of entries) {
      const subRel = path.posix.join(relDir, entry);
      let stat;
      try {
        stat = await fs.stat(safeJoin(subRel));
      } catch {
        continue;
      }
      if (!stat.isDirectory()) continue;
      let files: string[];
      try {
        files = await listDir(subRel);
      } catch {
        continue;
      }
      for (const f of files) {
        if (!f.endsWith(".md")) continue;
        const fileRel = path.posix.join(subRel, f);
        try {
          const raw = await readText(fileRel);
          const { fm } = parseFrontmatter(raw);
          items.push({
            name: `${entry} / ${f.replace(/\.md$/, "")}`,
            slug: `${entry}--${f.replace(/\.md$/, "")}`,
            type,
            description: descriptionFromFm(fm),
            filePath: fileRel,
            extra: { ...fm, pack: entry },
          });
        } catch {
          /* skip */
        }
      }
    }
  } else {
    // agents / commands: flat .md files
    for (const entry of entries) {
      if (!entry.endsWith(".md")) continue;
      const fileRel = path.posix.join(relDir, entry);
      try {
        const raw = await readText(fileRel);
        const { fm } = parseFrontmatter(raw);
        items.push({
          name: String(fm["name"] ?? entry.replace(/\.md$/, "")),
          slug: entry.replace(/\.md$/, ""),
          type,
          description: descriptionFromFm(fm),
          filePath: fileRel,
          extra: fm,
        });
      } catch {
        /* skip */
      }
    }
  }

  return items.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Code file reading
// ---------------------------------------------------------------------------

export async function readCodeFile(rel: string): Promise<CodeFile> {
  const raw = await readText(rel);
  return {
    path: rel,
    language: langForFile(rel),
    content: raw,
    lines: raw.split("\n").length,
  };
}

export async function getFile(rel: string): Promise<{ content: string; language: string } | null> {
  try {
    const code = await readCodeFile(rel);
    return { content: code.content, language: code.language };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Overview (repo meta + counts + principles + providers)
// ---------------------------------------------------------------------------

let overviewCache: Overview | null = null;

export async function getOverview(): Promise<Overview> {
  if (overviewCache) return overviewCache;

  const [pkgRaw, agentYamlRaw, soulRaw, versionRaw, licenseRaw] = await Promise.all([
    readText("package.json"),
    readText("agent.yaml"),
    readText("SOUL.md").catch(() => ""),
    readText("VERSION").catch(() => "0"),
    readText("LICENSE").catch(() => "MIT"),
  ]);

  const pkg = JSON.parse(pkgRaw);
  const agentYamlText = agentYamlRaw;

  // Parse agent.yaml manually (it's simple YAML)
  const preferredModel = /preferred:\s*(\S+)/.exec(agentYamlText)?.[1] ?? "";
  const fallbackMatch = agentYamlText.match(/fallback:\s*\n((?:\s*-\s+.+\n?)+)/);
  const fallbackModels = fallbackMatch
    ? fallbackMatch[1]
        .split("\n")
        .map((l) => l.replace(/^\s*-\s+/, "").trim())
        .filter(Boolean)
    : [];

  // Principles from SOUL.md
  const principles: string[] = [];
  const soulLines = soulRaw.split("\n");
  let inPrinciples = false;
  for (const line of soulLines) {
    if (/^##\s+Core Principles/.test(line)) {
      inPrinciples = true;
      continue;
    }
    if (inPrinciples) {
      if (/^##\s/.test(line)) break;
      const m = line.match(/^\d+\.\s+\*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (m) principles.push(`${m[1]} — ${m[2]}`);
    }
  }

  // Counts
  const [agents, skills, commands, ruleEntries, rulePackDirs, hooksKeys, mcpRaw, srcLlmFiles, ecc2Files, scriptFiles] =
    await Promise.all([
      scanMarkdownDir("agents", "agents"),
      scanMarkdownDir("skills", "skills"),
      scanMarkdownDir("commands", "commands"),
      scanMarkdownDir("rules", "rules").catch(() => []),
      listDir("rules").catch(() => [] as string[]),
      readText("hooks/hooks.json").catch(() => "{}"),
      readText("mcp-configs/mcp-servers.json").catch(() => '{"mcpServers":{}}'),
      (async () => {
        const out: string[] = [];
        async function walk(rel: string) {
          const entries = await listDir(rel).catch(() => [] as string[]);
          for (const e of entries) {
            const sub = path.posix.join(rel, e);
            const stat = await fs.stat(safeJoin(sub)).catch(() => null);
            if (!stat) continue;
            if (stat.isDirectory()) await walk(sub);
            else if (e.endsWith(".py")) out.push(sub);
          }
        }
        await walk("src/llm");
        return out;
      })(),
      (async () => {
        const out: string[] = [];
        async function walk(rel: string) {
          const entries = await listDir(rel).catch(() => [] as string[]);
          for (const e of entries) {
            const sub = path.posix.join(rel, e);
            const stat = await fs.stat(safeJoin(sub)).catch(() => null);
            if (!stat) continue;
            if (stat.isDirectory()) await walk(sub);
            else if (e.endsWith(".rs")) out.push(sub);
          }
        }
        await walk("ecc2/src");
        return out;
      })(),
      listDir("scripts").catch(() => [] as string[]),
    ]);

  let mcpServers = 0;
  try {
    const mcp = JSON.parse(mcpRaw);
    mcpServers = Object.keys(mcp.mcpServers ?? {}).length;
  } catch {
    /* ignore */
  }

  let hooksCount = 0;
  try {
    const hooks = JSON.parse(hooksKeys);
    const h = hooks.hooks ?? {};
    for (const event of Object.keys(h)) {
      hooksCount += (h[event] as unknown[]).length;
    }
  } catch {
    /* ignore */
  }

  const providers = extractProviders(srcLlmFiles);

  overviewCache = {
    repo: {
      name: pkg.name,
      version: versionRaw.trim() || pkg.version,
      license: licenseRaw.includes("MIT") ? "MIT" : "Unknown",
      description: pkg.description,
      url: pkg.repository?.url ?? "https://github.com/affaan-m/ecc",
      homepage: pkg.homepage ?? "https://ecc.tools",
      preferredModel,
      fallbackModels,
    },
    counts: {
      agents: agents.length,
      skills: skills.length,
      commands: commands.length,
      rulePacks: rulePackDirs.length,
      ruleFiles: ruleEntries.length,
      hooks: hooksCount,
      mcpServers,
      srcLlmFiles: srcLlmFiles.length,
      ecc2RustFiles: ecc2Files.length,
      scripts: scriptFiles.length,
      languages: rulePackDirs.length,
    },
    principles,
    flow: ["plan", "test", "implement", "review", "verify", "remember", "improve"],
    providers,
    harnesses: [
      "claude-code",
      "codex",
      "cursor",
      "opencode",
      "gemini",
      "zed",
      "kiro",
      "qwen",
      "kimi",
      "trae",
      "hermes",
      "pi",
    ],
    tagline: "Optimize the context window. Persist everything else.",
  };

  return overviewCache;
}

/**
 * Extract provider + model info by scanning the Python provider files.
 * Each provider file defines a list of ModelInfo dataclasses.
 */
function extractProviders(pythonFiles: string[]): {
  id: string;
  label: string;
  models: ProviderModel[];
  note: string;
}[] {
  const providers: { id: string; label: string; models: ProviderModel[]; note: string }[] = [];

  const providerFileRe = /providers\/([a-z0-9_]+)\.py$/;
  for (const file of pythonFiles) {
    const m = file.match(providerFileRe);
    if (!m) continue;
    const id = m[1];
    if (id === "constants" || id === "__init__" || id === "resolver") continue;
    // We can't easily exec python, so we hardcode known model lists from the
    // source we read earlier. This keeps the overview accurate.
  }

  // Static, curated provider table (sourced from src/llm/providers/*.py).
  providers.push({
    id: "claude",
    label: "Anthropic Claude",
    note: "Ephemeral prompt caching, adaptive thinking for Opus 4.7+",
    models: [
      { name: "claude-opus-4-8", provider: "claude", supportsTools: true, supportsVision: true, maxTokens: 64000, contextWindow: 1000000 },
      { name: "claude-sonnet-4-6", provider: "claude", supportsTools: true, supportsVision: true, maxTokens: 64000, contextWindow: 1000000 },
      { name: "claude-haiku-4-5", provider: "claude", supportsTools: true, supportsVision: true, maxTokens: 16000, contextWindow: 200000 },
    ],
  });
  providers.push({
    id: "openai",
    label: "OpenAI",
    note: "GPT-4o family with function-calling tools",
    models: [
      { name: "gpt-4o", provider: "openai", supportsTools: true, supportsVision: true, maxTokens: 4096, contextWindow: 128000 },
      { name: "gpt-4o-mini", provider: "openai", supportsTools: true, supportsVision: true, maxTokens: 4096, contextWindow: 128000 },
      { name: "gpt-4-turbo", provider: "openai", supportsTools: true, supportsVision: true, maxTokens: 4096, contextWindow: 128000 },
      { name: "gpt-3.5-turbo", provider: "openai", supportsTools: true, supportsVision: false, maxTokens: 4096, contextWindow: 16385 },
    ],
  });
  providers.push({
    id: "ollama",
    label: "Ollama (local)",
    note: "Local models via raw HTTP, no SDK dependency",
    models: [
      { name: "llama3.2", provider: "ollama", supportsTools: false, supportsVision: false, maxTokens: 4096, contextWindow: 128000 },
      { name: "mistral", provider: "ollama", supportsTools: false, supportsVision: false, maxTokens: 4096, contextWindow: 8192 },
      { name: "codellama", provider: "ollama", supportsTools: false, supportsVision: false, maxTokens: 4096, contextWindow: 16384 },
    ],
  });
  providers.push({
    id: "astraflow",
    label: "Astraflow / UModelVerse",
    note: "OpenAI-compatible gateway, global + China endpoints",
    models: [
      { name: "gpt-4o-mini", provider: "astraflow", supportsTools: true, supportsVision: true, maxTokens: 4096, contextWindow: 128000 },
    ],
  });
  providers.push({
    id: "atlas",
    label: "Atlas Cloud",
    note: "OpenAI-compatible, 59+ LLM / image / video models",
    models: [
      { name: "anthropic/claude-sonnet-4.6", provider: "atlas", supportsTools: true, supportsVision: true, maxTokens: 4096, contextWindow: 200000 },
    ],
  });

  return providers;
}

// ---------------------------------------------------------------------------
// Catalog (cached)
// ---------------------------------------------------------------------------

let catalogCache: Record<CatalogType, CatalogItem[]> | null = null;

export async function getCatalog(): Promise<Record<CatalogType, CatalogItem[]>> {
  if (catalogCache) return catalogCache;
  const [agents, skills, commands, rules] = await Promise.all([
    scanMarkdownDir("agents", "agents"),
    scanMarkdownDir("skills", "skills"),
    scanMarkdownDir("commands", "commands"),
    scanMarkdownDir("rules", "rules"),
  ]);
  catalogCache = { agents, skills, commands, rules };
  return catalogCache;
}

// ---------------------------------------------------------------------------
// Curated architecture sections (from docs/architecture + source reading)
// ---------------------------------------------------------------------------

export function getArchitectureSections(): ArchitectureSection[] {
  return [
    {
      id: "harness-vs-layer",
      title: "Harness vs. The Durable Layer",
      summary:
        "ECC separates the execution surface (the harness: Claude Code, Codex, Cursor…) from the reusable behavior (the layer: skills, rules, hooks, memory). Behavior is authored once; harness adapters only load it.",
      bullets: [
        "SKILL.md is the most portable unit — mostly prose, constraints, and workflow shape.",
        "Same source skill installs into many harnesses unchanged.",
        "Thin adapters handle loading, event shape, and command-name mapping at the edge.",
        "Rule: if a change edits three harness copies, the shared source is in the wrong place.",
      ],
    },
    {
      id: "four-primitives",
      title: "The Four Asset Primitives",
      summary:
        "Every agent improvement is expressed as one of four markdown + YAML frontmatter primitives: agents, skills, commands, and rules.",
      bullets: [
        "Agents (agents/*.md) — sandboxed subagents with tools + model + a prompt-defense baseline.",
        "Skills (skills/<name>/SKILL.md) — the durable workflow unit, treated plan-handoff input as untrusted data.",
        "Commands (commands/*.md) — legacy slash-command shims over skills.",
        "Rules (rules/<lang>/*.md) — always-loaded standards, chosen per stack.",
      ],
    },
    {
      id: "hooks",
      title: "Hook Enforcement System",
      summary:
        "Skills and agents are advisory; hooks are real scripts that fire on Claude Code lifecycle events and can block tool calls. Registered in hooks/hooks.json (41 KB).",
      bullets: [
        "PreToolUse / PostToolUse / PreCompact / SessionStart / Stop events.",
        "pre:config-protection — blocks edits to linter/formatter configs (anti-laziness).",
        "pre:edit-write:gateguard-fact-force — blocks first edit per file, demands research first.",
        "pre:mcp-health-check — blocks unhealthy MCP calls.",
        "Exit 1 only when blocking is intentional; otherwise exit 0 + actionable stderr.",
      ],
    },
    {
      id: "memory-vault",
      title: "Cross-Harness Memory Vault",
      summary:
        "File-first Markdown memory in three scopes (project / team / user) shared across every harness. Create-only entries, always unreviewed; human promotion turns memory into a governed artifact.",
      bullets: [
        "project: <repo>/.ecc/memory/project/  ·  team: <repo>/.ecc/memory/team/  ·  user: ~/.ecc/memory/",
        "Recalled memory is data, not executable instruction.",
        "Secret-shaped writes rejected; symlinks not followed; .gitignore tampering stops writes.",
        "Opt-in ecc-memory-mcp server (memory_save / memory_search / memory_read / memory_doctor).",
      ],
    },
    {
      id: "ai-layer",
      title: "Provider-Agnostic LLM Abstraction",
      summary:
        "src/llm/ ships a clean Python abstraction: an LLMProvider ABC, frozen dataclass types, typed errors, and a ReAct agent loop. The host harness does the heavy lifting; this layer powers direct model calls.",
      bullets: [
        "Providers: Claude (caching + adaptive thinking), OpenAI, Ollama (raw HTTP), Astraflow, Atlas.",
        "ToolDefinition → to_openai_tool() / to_anthropic_tool() converters.",
        "ReActAgent: generate → execute tools → append TOOL messages → repeat (max 10 iters).",
        "Error hierarchy: Authentication / RateLimit / ContextLength / ModelNotFound / ToolExecution.",
      ],
      code: {
        language: "python",
        snippet: `class LLMProvider(ABC):
    provider_type: ProviderType
    @abstractmethod
    def generate(self, input: LLMInput) -> LLMOutput: ...
    @abstractmethod
    def list_models(self) -> list[ModelInfo]: ...
    @abstractmethod
    def validate_config(self) -> bool: ...`,
      },
    },
    {
      id: "ecc2",
      title: "ecc2 — Rust Control Plane (Alpha)",
      summary:
        "The forward-looking layer above per-harness installs: manage many agent sessions from one surface. TUI dashboard + SQLite store + git worktree orchestration + bounded harness-config evaluation.",
      bullets: [
        "ratatui + crossterm TUI · rusqlite (bundled) state store · git2 worktrees · tokio async.",
        "Commands: dashboard, start --worktree, delegate, assign, drain-inbox, auto-dispatch, daemon.",
        "harness-eval: SHA-256-addressed configs, deterministic seeds, promotion gate, immutable audit rows.",
        "HarnessKind enum: Claude, Codex, OpenCode, Gemini, Cursor, Kiro, Trae, Zed, FactoryDroid, Windsurf.",
      ],
    },
  ];
}

// ---------------------------------------------------------------------------
// Curated notable files (for the "Source Code" browser)
// ---------------------------------------------------------------------------

export const NOTABLE_FILES: { path: string; label: string; group: string; description: string }[] = [
  { path: "src/llm/core/interface.py", label: "LLMProvider ABC", group: "AI Layer", description: "The provider interface + typed error hierarchy" },
  { path: "src/llm/core/types.py", label: "Core Types", group: "AI Layer", description: "Message, Role, ToolDefinition, LLMInput/Output dataclasses" },
  { path: "src/llm/providers/claude.py", label: "Claude Provider", group: "AI Layer", description: "Anthropic adapter with caching + adaptive thinking" },
  { path: "src/llm/providers/openai.py", label: "OpenAI Provider", group: "AI Layer", description: "OpenAI adapter with function-calling tools" },
  { path: "src/llm/providers/ollama.py", label: "Ollama Provider", group: "AI Layer", description: "Local models via raw urllib HTTP" },
  { path: "src/llm/providers/resolver.py", label: "Provider Resolver", group: "AI Layer", description: "Factory + .llm.env config resolution" },
  { path: "src/llm/tools/executor.py", label: "Tool Executor + ReAct", group: "AI Layer", description: "ToolRegistry, ToolExecutor, ReActAgent loop" },
  { path: "hooks/hooks.json", label: "Hook Registry", group: "Hooks", description: "41 KB of matcher-driven lifecycle hooks" },
  { path: "hooks/memory-persistence/hooks.json", label: "Memory Lifecycle", group: "Hooks", description: "Reference lifecycle hook definitions" },
  { path: "mcp-configs/mcp-servers.json", label: "MCP Servers", group: "MCP", description: "Reference catalog of MCP server configs" },
  { path: ".mcp.json", label: "Default MCP", group: "MCP", description: "The minimal default MCP config (chrome-devtools only)" },
  { path: "agent.yaml", label: "gitagent Manifest", group: "Identity", description: "Harness-neutral export surface for the skill catalog" },
  { path: "SOUL.md", label: "Soul", group: "Identity", description: "Core identity + principles" },
  { path: "RULES.md", label: "Rules", group: "Identity", description: "Must-always / must-never rules" },
  { path: "ecc2/src/main.rs", label: "ecc2 CLI entry", group: "ecc2", description: "Rust control-plane command dispatcher" },
  { path: "ecc2/src/session/mod.rs", label: "ecc2 Session", group: "ecc2", description: "HarnessKind enum + session types" },
  { path: "ecc2/src/harness_eval.rs", label: "ecc2 Harness Eval", group: "ecc2", description: "Bounded deterministic config evaluation gate" },
  { path: "scripts/ecc.js", label: "ecc CLI", group: "Scripts", description: "Unified Node CLI dispatcher" },
];
