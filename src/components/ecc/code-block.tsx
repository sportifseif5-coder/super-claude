"use client";

import * as React from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  code: string;
  language: string;
  className?: string;
  maxHeight?: number;
  showHeader?: boolean;
  label?: string;
}

export function CodeBlock({
  code,
  language,
  className,
  maxHeight,
  showHeader = true,
  label,
}: CodeBlockProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted ? theme === "dark" : true;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
            <span className="ml-2 font-mono text-xs text-muted-foreground">
              {label ?? language}
            </span>
          </div>
          <button
            type="button"
            onClick={copy}
            aria-label="Copy code"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" /> Copy
              </>
            )}
          </button>
        </div>
      )}
      <div className="ecc-scroll overflow-auto" style={maxHeight ? { maxHeight } : undefined}>
        {mounted ? (
          <SyntaxHighlighter
            language={language}
            style={isDark ? oneDark : oneLight}
            customStyle={{
              margin: 0,
              padding: "1rem",
              background: "transparent",
              fontSize: "0.8125rem",
              lineHeight: 1.6,
            }}
            codeTagProps={{ style: { fontFamily: "var(--font-geist-mono), monospace" } }}
          >
            {code}
          </SyntaxHighlighter>
        ) : (
          <pre className="p-4 font-mono text-xs">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
}
