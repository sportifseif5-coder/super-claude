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
