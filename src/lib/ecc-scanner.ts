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

export const ECC_REPO_ROOT = path.join(process.cwd(), "super-claude-repo");

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

// ---------------------------------------------------------------------------
// Hooks (structured parse of hooks/hooks.json)
// ---------------------------------------------------------------------------

export interface HookEntry {
  id: string;
  event: string;
  matcher: string;
  description: string;
  script: string; // extracted script path, e.g. scripts/hooks/pre-bash-dispatcher.js
  flags: string[]; // e.g. ["standard", "strict"]
  async: boolean;
  timeout: number | null;
  blocking: boolean;
}

export interface HooksData {
  totalHooks: number;
  events: { event: string; count: number; description: string; phase: string }[];
  hooks: HookEntry[];
  matchers: { matcher: string; count: number }[];
}

const EVENT_META: Record<string, { phase: string; description: string }> = {
  SessionStart: { phase: "lifecycle", description: "Fires when a session begins — load prior context, detect project state." },
  PreToolUse: { phase: "preflight", description: "Before a tool executes — validation, gating, reminders." },
  PostToolUse: { phase: "postflight", description: "After a tool finishes — formatting, feedback loops, observations." },
  PostToolUseFailure: { phase: "postflight", description: "After a tool fails — error capture, retry hints." },
  PreCompact: { phase: "lifecycle", description: "Before context compaction — save state." },
  Stop: { phase: "lifecycle", description: "When the agent finishes — batch quality gates." },
  SessionEnd: { phase: "lifecycle", description: "When a session ends — persist summaries." },
};

function extractScriptFromCommand(command: string): { script: string; flags: string[] } {
  // Commands look like: node -e "..." node scripts/hooks/run-with-flags.js <flag> <script.js> ...
  // or: node -e "..." node scripts/hooks/pre-bash-dispatcher.js
  // Try to find the actual .js script and any flags passed to run-with-flags.
  const flags: string[] = [];
  const runWithFlagsMatch = command.match(/run-with-flags\.js\s+([\w:-]+)\s+(scripts\/hooks\/[\w-]+\.js)(?:\s+([\w,-]+))?/);
  if (runWithFlagsMatch) {
    const flag = runWithFlagsMatch[1];
    const script = runWithFlagsMatch[2];
    const moreFlags = runWithFlagsMatch[3];
    if (flag) flags.push(flag);
    if (moreFlags) flags.push(...moreFlags.split(",").filter(Boolean));
    return { script, flags };
  }
  // Direct script invocation
  const directMatch = command.match(/(scripts\/hooks\/[\w-]+\.js)/);
  if (directMatch) {
    return { script: directMatch[1], flags };
  }
  return { script: "", flags };
}

let hooksCache: HooksData | null = null;

export async function getHooks(): Promise<HooksData> {
  if (hooksCache) return hooksCache;
  const raw = await readText("hooks/hooks.json").catch(() => '{"hooks":{}}');
  let parsed: { hooks: Record<string, unknown[]> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { hooks: {} };
  }
  const hooksByEvent = parsed.hooks ?? {};
  const hooks: HookEntry[] = [];
  const events: HooksData["events"] = [];
  const matcherCounts: Record<string, number> = {};

  for (const event of Object.keys(hooksByEvent)) {
    const entries = hooksByEvent[event] as Array<Record<string, unknown>>;
    events.push({
      event,
      count: entries.length,
      description: EVENT_META[event]?.description ?? "",
      phase: EVENT_META[event]?.phase ?? "other",
    });
    for (const entry of entries) {
      const matcher = String(entry.matcher ?? "*");
      const id = String(entry.id ?? `${event}:${matcher}`);
      const description = String(entry.description ?? "");
      const hookArr = entry.hooks as Array<Record<string, unknown>> | undefined;
      const firstHook = hookArr?.[0] ?? {};
      const command = String(firstHook.command ?? "");
      const { script, flags } = extractScriptFromCommand(command);
      const asyncFlag = Boolean(firstHook.async);
      const timeout = typeof firstHook.timeout === "number" ? firstHook.timeout : null;
      // Heuristic: Stop + PreToolUse hooks with config-protection/gateguard/mcp-health are blocking
      const blockingIds = ["config-protection", "gateguard", "mcp-health", "format-typecheck", "check-console", "pre-bash"];
      const blocking = blockingIds.some((b) => id.includes(b)) || event === "Stop";

      hooks.push({
        id,
        event,
        matcher,
        description,
        script,
        flags,
        async: asyncFlag,
        timeout,
        blocking,
      });
      matcherCounts[matcher] = (matcherCounts[matcher] ?? 0) + 1;
    }
  }

  const matchers = Object.entries(matcherCounts)
    .map(([matcher, count]) => ({ matcher, count }))
    .sort((a, b) => b.count - a.count);

  hooksCache = {
    totalHooks: hooks.length,
    events: events.sort((a, b) => a.event.localeCompare(b.event)),
    hooks: hooks.sort((a, b) => a.event.localeCompare(b.event) || a.id.localeCompare(b.id)),
    matchers,
  };
  return hooksCache;
}

let hooksRawCache: string | null = null;

export async function getHooksRaw(): Promise<string> {
  if (hooksRawCache) return hooksRawCache;
  const raw = await readText("hooks/hooks.json").catch(() => "{}");
  // Pretty-print if not already
  try {
    const parsed = JSON.parse(raw);
    hooksRawCache = JSON.stringify(parsed, null, 2);
  } catch {
    hooksRawCache = raw;
  }
  return hooksRawCache;
}

// ---------------------------------------------------------------------------
// MCP catalog (structured parse of mcp-configs/mcp-servers.json)
// ---------------------------------------------------------------------------

export interface McpServer {
  name: string;
  command: string;
  args: string[];
  description: string;
  hasEnv: boolean;
  transport: "stdio" | "http" | "unknown";
}

export interface McpData {
  total: number;
  servers: McpServer[];
}

let mcpCache: McpData | null = null;

export async function getMcp(): Promise<McpData> {
  if (mcpCache) return mcpCache;
  const raw = await readText("mcp-configs/mcp-servers.json").catch(() => '{"mcpServers":{}}');
  let parsed: { mcpServers: Record<string, Record<string, unknown>> };
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { mcpServers: {} };
  }
  const servers: McpServer[] = [];
  for (const [name, cfg] of Object.entries(parsed.mcpServers ?? {})) {
    const c = cfg as Record<string, unknown>;
    servers.push({
      name,
      command: String(c.command ?? ""),
      args: Array.isArray(c.args) ? (c.args as string[]) : [],
      description: String(c.description ?? ""),
      hasEnv: Boolean(c.env && Object.keys(c.env as object).length > 0),
      transport: c.type === "http" ? "http" : c.command ? "stdio" : "unknown",
    });
  }
  mcpCache = {
    total: servers.length,
    servers: servers.sort((a, b) => a.name.localeCompare(b.name)),
  };
  return mcpCache;
}

// ---------------------------------------------------------------------------
// Searchable command index (for the command palette)
// ---------------------------------------------------------------------------

export interface SearchEntry {
  id: string;
  label: string;
  hint: string;
  type: "agent" | "skill" | "command" | "rule" | "file" | "section";
  target: string; // href or action
}

let searchCache: SearchEntry[] | null = null;

export async function getSearchIndex(): Promise<SearchEntry[]> {
  if (searchCache) return searchCache;
  const [catalog, notableFiles] = await Promise.all([getCatalog(), Promise.resolve(NOTABLE_FILES)]);
  const entries: SearchEntry[] = [];

  for (const a of catalog.agents.slice(0, 200)) {
    entries.push({
      id: `agent-${a.slug}`,
      label: a.name,
      hint: a.description.slice(0, 80) || "agent",
      type: "agent",
      target: `#catalog`,
    });
  }
  for (const s of catalog.skills.slice(0, 200)) {
    entries.push({
      id: `skill-${s.slug}`,
      label: s.name,
      hint: s.description.slice(0, 80) || "skill",
      type: "skill",
      target: `#catalog`,
    });
  }
  for (const c of catalog.commands.slice(0, 100)) {
    entries.push({
      id: `cmd-${c.slug}`,
      label: `/${c.slug}`,
      hint: c.description.slice(0, 80) || "command",
      type: "command",
      target: `#catalog`,
    });
  }
  for (const f of notableFiles) {
    entries.push({
      id: `file-${f.path}`,
      label: f.label,
      hint: f.description,
      type: "file",
      target: `#source`,
    });
  }
  for (const sec of [
    ["architecture", "Architecture"],
    ["catalog", "Catalog"],
    ["ai", "AI Integration"],
    ["hooks", "Hooks & Memory"],
    ["source", "Source Code"],
    ["hooks-explorer", "Hooks Explorer"],
    ["mcp", "MCP Catalog"],
  ]) {
    entries.push({
      id: `section-${sec[0]}`,
      label: sec[1],
      hint: "Jump to section",
      type: "section",
      target: `#${sec[0]}`,
    });
  }

  searchCache = entries;
  return entries;
}

// ---------------------------------------------------------------------------
// Skill / agent deep-dive: parse a markdown body into structured sections
// ---------------------------------------------------------------------------

export interface MarkdownSection {
  heading: string;
  level: number;
  body: string;
  bullets: string[];
}

export interface ItemDetail {
  filePath: string;
  language: string;
  content: string;
  frontmatter: Frontmatter;
  sections: MarkdownSection[];
  whenToUse: string | null;
  howItWorks: string | null;
  examples: string[];
  firstParagraph: string;
}

export async function getItemDetail(rel: string): Promise<ItemDetail | null> {
  let raw: string;
  try {
    raw = await readText(rel);
  } catch {
    return null;
  }
  const { fm, body } = parseFrontmatter(raw);
  const sections = parseMarkdownSections(body);
  const whenToUse = findSection(sections, ["when to use", "when to activate", "when to activate this skill"]);
  const howItWorks = findSection(sections, ["how it works", "how this works", "core principles", "review process"]);
  const examples = findCodeBlocks(body).slice(0, 3);
  const firstParagraph = extractFirstParagraph(body);
  return {
    filePath: rel,
    language: langForFile(rel),
    content: raw,
    frontmatter: fm,
    sections,
    whenToUse: whenToUse ? whenToUse.body.trim() : null,
    howItWorks: howItWorks ? howItWorks.body.trim() : null,
    examples,
    firstParagraph,
  };
}

function parseMarkdownSections(body: string): MarkdownSection[] {
  const lines = body.split("\n");
  const sections: MarkdownSection[] = [];
  let current: MarkdownSection | null = null;
  let bodyBuf: string[] = [];
  let bullets: string[] = [];

  const flush = () => {
    if (current) {
      current.body = bodyBuf.join("\n").trim();
      current.bullets = bullets;
      sections.push(current);
    }
  };

  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      flush();
      current = {
        heading: h[2].trim(),
        level: h[1].length,
        body: "",
        bullets: [],
      };
      bodyBuf = [];
      bullets = [];
      continue;
    }
    if (!current) continue;
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (bullet) {
      bullets.push(bullet[1].trim());
    }
    bodyBuf.push(line);
  }
  flush();
  return sections;
}

function findSection(sections: MarkdownSection[], names: string[]): MarkdownSection | null {
  for (const s of sections) {
    if (names.some((n) => s.heading.toLowerCase().includes(n))) return s;
  }
  return null;
}

function findCodeBlocks(body: string): string[] {
  const blocks: string[] = [];
  const re = /```[\s\S]*?```/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    blocks.push(m[0]);
  }
  return blocks;
}

function extractFirstParagraph(body: string): string {
  const lines = body.split("\n");
  for (const line of lines) {
    const t = line.trim();
    if (!t || t.startsWith("#") || t.startsWith("---") || t.startsWith("```")) continue;
    if (t.startsWith("|") || t.match(/^\s*[-*]\s+/)) continue;
    return t;
  }
  return "";
}

// ---------------------------------------------------------------------------
// Random item (for the "discover" button)
// ---------------------------------------------------------------------------

export interface RandomItem {
  type: CatalogType;
  slug: string;
  name: string;
  description: string;
  filePath: string;
}

export async function getRandomItem(): Promise<RandomItem | null> {
  const catalog = await getCatalog();
  const pool: { type: CatalogType; items: CatalogItem[] }[] = [
    { type: "agents", items: catalog.agents },
    { type: "skills", items: catalog.skills },
    { type: "commands", items: catalog.commands },
  ];
  const weighted = pool.find((p) => p.items.length > 0);
  if (!weighted) return null;
  const item = weighted.items[Math.floor(Math.random() * weighted.items.length)];
  return {
    type: weighted.type,
    slug: item.slug,
    name: item.name,
    description: item.description,
    filePath: item.filePath,
  };
}

// ---------------------------------------------------------------------------
// Comparison: structured detail for two items, side by side
// ---------------------------------------------------------------------------

export interface CompareItem extends ItemDetail {
  name: string;
  type: CatalogType;
  slug: string;
  description: string;
}

export interface CompareResult {
  a: CompareItem | null;
  b: CompareItem | null;
}

export async function getCompare(
  pathA: string,
  pathB: string,
): Promise<CompareResult> {
  const [a, b] = await Promise.all([
    getItemDetail(pathA).then((d) => (d ? { ...d, name: pathA, type: "agents" as CatalogType, slug: pathA, description: "" } : null)),
    getItemDetail(pathB).then((d) => (d ? { ...d, name: pathB, type: "agents" as CatalogType, slug: pathB, description: "" } : null)),
  ]);
  // Enrich with catalog metadata
  const catalog = await getCatalog();
  const enrich = (item: CompareItem | null): CompareItem | null => {
    if (!item) return null;
    const all = [...catalog.agents, ...catalog.skills, ...catalog.commands, ...catalog.rules];
    const found = all.find((c) => c.filePath === item.filePath);
    if (found) {
      return {
        ...item,
        name: found.name,
        type: found.type,
        slug: found.slug,
        description: found.description,
      };
    }
    return item;
  };
  return { a: enrich(a), b: enrich(b) };
}

// ---------------------------------------------------------------------------
// Agent relationship graph data
// ---------------------------------------------------------------------------

export interface GraphNode {
  id: string;
  label: string;
  type: "agent" | "model" | "tool" | "category";
  weight: number;
  meta?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  stats: {
    totalAgents: number;
    categories: number;
    models: number;
    tools: number;
  };
}

let graphCache: GraphData | null = null;

export async function getGraphData(): Promise<GraphData> {
  if (graphCache) return graphCache;
  const catalog = await getCatalog();
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const nodeSet = new Set<string>();
  const linkMap = new Map<string, number>();

  const addNode = (n: GraphNode) => {
    if (!nodeSet.has(n.id)) {
      nodes.push(n);
      nodeSet.add(n.id);
    }
  };
  const addLink = (source: string, target: string) => {
    const key = `${source}→${target}`;
    linkMap.set(key, (linkMap.get(key) ?? 0) + 1);
  };

  const categories = new Set<string>();
  const models = new Set<string>();
  const tools = new Set<string>();

  for (const agent of catalog.agents) {
    // Agent node
    addNode({
      id: `agent:${agent.slug}`,
      label: agent.slug,
      type: "agent",
      weight: 1,
    });

    // Category (filename prefix before first hyphen)
    const category = agent.slug.includes("-")
      ? agent.slug.split("-")[0]
      : "general";
    categories.add(category);
    addNode({
      id: `cat:${category}`,
      label: category,
      type: "category",
      weight: 0,
      meta: "category",
    });
    addLink(`cat:${category}`, `agent:${agent.slug}`);

    // Model
    const model = typeof agent.extra["model"] === "string" ? agent.extra["model"] : "sonnet";
    models.add(model);
    addNode({
      id: `model:${model}`,
      label: model,
      type: "model",
      weight: 0,
      meta: "model",
    });
    addLink(`agent:${agent.slug}`, `model:${model}`);

    // Tools
    const toolsStr = typeof agent.extra["tools"] === "string" ? agent.extra["tools"] : "";
    if (toolsStr) {
      for (const tool of toolsStr.split(",").map((t) => t.trim()).filter(Boolean)) {
        tools.add(tool);
        addNode({
          id: `tool:${tool}`,
          label: tool,
          type: "tool",
          weight: 0,
          meta: "tool",
        });
        addLink(`agent:${agent.slug}`, `tool:${tool}`);
      }
    }
  }

  for (const [key, value] of linkMap.entries()) {
    const [source, target] = key.split("→");
    links.push({ source, target, value });
  }

  graphCache = {
    nodes,
    links,
    stats: {
      totalAgents: catalog.agents.length,
      categories: categories.size,
      models: models.size,
      tools: tools.size,
    },
  };
  return graphCache;
}

// ---------------------------------------------------------------------------
// Model distribution (for donut chart)
// ---------------------------------------------------------------------------

export interface ModelDistribution {
  model: string;
  count: number;
  color: string;
}

let modelDistCache: ModelDistribution[] | null = null;

const MODEL_COLORS: Record<string, string> = {
  sonnet: "#e07856",
  haiku: "#10b981",
  opus: "#a855f7",
};

export async function getModelDistribution(): Promise<ModelDistribution[]> {
  if (modelDistCache) return modelDistCache;
  const catalog = await getCatalog();
  const counts = new Map<string, number>();
  for (const agent of catalog.agents) {
    const model = typeof agent.extra["model"] === "string" ? agent.extra["model"] : "sonnet";
    counts.set(model, (counts.get(model) ?? 0) + 1);
  }
  modelDistCache = Array.from(counts.entries())
    .map(([model, count]) => ({
      model,
      count,
      color: MODEL_COLORS[model] ?? "#6b7280",
    }))
    .sort((a, b) => b.count - a.count);
  return modelDistCache;
}

// ---------------------------------------------------------------------------
// Skill effectiveness scoring (0-100)
// ---------------------------------------------------------------------------

export interface SkillScore {
  slug: string;
  name: string;
  score: number;
  grade: "A" | "B" | "C" | "D";
  breakdown: { label: string; points: number }[];
}

let scoreCache: SkillScore[] | null = null;

export async function getSkillScores(): Promise<SkillScore[]> {
  if (scoreCache) return scoreCache;
  const catalog = await getCatalog();
  const scores: SkillScore[] = [];

  for (const skill of catalog.skills) {
    const detail = await getItemDetail(skill.filePath);
    const breakdown: { label: string; points: number }[] = [];
    let score = 0;

    // Has "When to Use" section
    const hasWhenToUse = Boolean(detail?.whenToUse);
    breakdown.push({ label: "Has 'When to Use'", points: hasWhenToUse ? 20 : 0 });
    score += hasWhenToUse ? 20 : 0;

    // Has "How it Works" section
    const hasHowItWorks = Boolean(detail?.howItWorks);
    breakdown.push({ label: "Has 'How it Works'", points: hasHowItWorks ? 20 : 0 });
    score += hasHowItWorks ? 20 : 0;

    // Has code examples
    const examples = detail?.examples.length ?? 0;
    breakdown.push({ label: "Has code examples", points: examples > 0 ? 20 : 0 });
    score += examples > 0 ? 20 : 0;

    // Has argument-hint
    const hasArgHint = Boolean(skill.extra["argument-hint"]);
    breakdown.push({ label: "Has argument-hint", points: hasArgHint ? 10 : 0 });
    score += hasArgHint ? 10 : 0;

    // Description length > 100 chars
    const descLen = skill.description.length;
    breakdown.push({ label: "Rich description (>100 chars)", points: descLen > 100 ? 10 : 0 });
    score += descLen > 100 ? 10 : 0;

    // Origin: ECC (first-party)
    const isECC = skill.extra["origin"] === "ECC";
    breakdown.push({ label: "First-party (origin: ECC)", points: isECC ? 10 : 0 });
    score += isECC ? 10 : 0;

    // Number of sections (completeness)
    const sectionCount = detail?.sections.length ?? 0;
    const sectionsPoints = Math.min(10, Math.floor(sectionCount / 3));
    breakdown.push({ label: `Section depth (${sectionCount} sections)`, points: sectionsPoints });
    score += sectionsPoints;

    const grade: SkillScore["grade"] =
      score >= 80 ? "A" : score >= 60 ? "B" : score >= 40 ? "C" : "D";

    scores.push({ slug: skill.slug, name: skill.name, score, grade, breakdown });
  }

  scoreCache = scores.sort((a, b) => b.score - a.score);
  return scoreCache;
}

// ---------------------------------------------------------------------------
// Token estimation + context budget
// ---------------------------------------------------------------------------

export interface TokenEstimate {
  agents: { name: string; tokens: number }[];
  skills: { name: string; tokens: number }[];
  mcpServers: { name: string; tokens: number; toolCount: number }[];
  totalAgents: number;
  totalSkills: number;
  totalMcp: number;
  grandTotal: number;
  contextWindow: number;
  percentUsed: number;
}

let tokenCache: TokenEstimate | null = null;

function estimateTokens(text: string): number {
  // Rough: 1 token ≈ 4 chars
  return Math.ceil(text.length / 4);
}

export async function getTokenEstimate(): Promise<TokenEstimate> {
  if (tokenCache) return tokenCache;
  const catalog = await getCatalog();
  const mcp = await getMcp();

  const agentTokens: { name: string; tokens: number }[] = [];
  for (const a of catalog.agents) {
    const detail = await getItemDetail(a.filePath);
    // Token cost = frontmatter + body (the agent prompt loaded into context)
    const tokens = estimateTokens(detail?.content ?? a.description);
    agentTokens.push({ name: a.name, tokens });
  }

  const skillTokens: { name: string; tokens: number }[] = [];
  for (const s of catalog.skills) {
    const detail = await getItemDetail(s.filePath);
    const tokens = estimateTokens(detail?.content ?? s.description);
    skillTokens.push({ name: s.name, tokens });
  }

  // MCP token cost: each tool definition is ~200-400 tokens of JSON schema
  const mcpTokens = mcp.servers.map((s) => ({
    name: s.name,
    tokens: 300, // average tool schema cost
    toolCount: 1, // simplified
  }));

  const totalAgents = agentTokens.reduce((s, a) => s + a.tokens, 0);
  const totalSkills = skillTokens.reduce((s, a) => s + a.tokens, 0);
  const totalMcp = mcpTokens.reduce((s, a) => s + a.tokens, 0);
  const grandTotal = totalAgents + totalSkills + totalMcp;
  const contextWindow = 200000; // Claude default

  tokenCache = {
    agents: agentTokens.sort((a, b) => b.tokens - a.tokens).slice(0, 10),
    skills: skillTokens.sort((a, b) => b.tokens - a.tokens).slice(0, 10),
    mcpServers: mcpTokens.slice(0, 10),
    totalAgents,
    totalSkills,
    totalMcp,
    grandTotal,
    contextWindow,
    percentUsed: Math.round((grandTotal / contextWindow) * 100),
  };
  return tokenCache;
}
