// Shared client-side types matching the API responses.

export interface OverviewRepo {
  name: string;
  version: string;
  license: string;
  description: string;
  url: string;
  homepage: string;
  preferredModel: string;
  fallbackModels: string[];
}

export interface OverviewCounts {
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
}

export interface ProviderModel {
  name: string;
  provider: string;
  supportsTools: boolean;
  supportsVision: boolean;
  maxTokens: number | null;
  contextWindow: number | null;
}

export interface ProviderInfo {
  id: string;
  label: string;
  models: ProviderModel[];
  note: string;
}

export interface Overview {
  repo: OverviewRepo;
  counts: OverviewCounts;
  principles: string[];
  flow: string[];
  providers: ProviderInfo[];
  harnesses: string[];
  tagline: string;
}

export type CatalogType = "agents" | "skills" | "commands" | "rules";

export interface CatalogItem {
  name: string;
  slug: string;
  type: CatalogType;
  description: string;
  filePath: string;
  extra: Record<string, unknown>;
}

export interface CatalogResponse {
  agents: CatalogItem[];
  skills: CatalogItem[];
  commands: CatalogItem[];
  rules: CatalogItem[];
}

export interface ArchitectureSection {
  id: string;
  title: string;
  summary: string;
  bullets: string[];
  code?: { language: string; snippet: string };
}

export interface NotableFile {
  path: string;
  label: string;
  group: string;
  description: string;
}

export interface FileResponse {
  content: string;
  language: string;
}

export interface FileIndexResponse {
  sections: ArchitectureSection[];
  notableFiles: NotableFile[];
}

/* Hooks */
export interface HookEntry {
  id: string;
  event: string;
  matcher: string;
  description: string;
  script: string;
  flags: string[];
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

/* MCP */
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

/* Search */
export interface SearchEntry {
  id: string;
  label: string;
  hint: string;
  type: "agent" | "skill" | "command" | "rule" | "file" | "section";
  target: string;
}

/* Item detail (deep-dive) */
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
  frontmatter: Record<string, unknown>;
  sections: MarkdownSection[];
  whenToUse: string | null;
  howItWorks: string | null;
  examples: string[];
  firstParagraph: string;
}

/* Random */
export interface RandomItem {
  type: CatalogType;
  slug: string;
  name: string;
  description: string;
  filePath: string;
}

/* Compare */
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

/* Graph */
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
