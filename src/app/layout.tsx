import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ECC Explorer — Everything Claude Code",
  description:
    "An interactive dive into affaan-m/ecc: the MIT-licensed agent harness operating system. Explore 68 agents, 286 skills, the provider-agnostic LLM layer, hooks, the memory vault, and the Rust control plane.",
  keywords: [
    "ECC",
    "Everything Claude Code",
    "agent harness",
    "Claude Code",
    "Codex",
    "Cursor",
    "MCP",
    "skills",
    "agents",
    "AI engineering",
  ],
  authors: [{ name: "Built on affaan-m/ecc (MIT)" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "ECC Explorer — Everything Claude Code",
    description:
      "Interactive exploration of the agent harness operating system: agents, skills, hooks, memory, AI layer, and the Rust control plane.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
