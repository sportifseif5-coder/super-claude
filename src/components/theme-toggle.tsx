"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="h-9 w-9 rounded-full"
    >
      {mounted && isDark ? (
        <Sun className="h-[1.15rem] w-[1.15rem]" />
      ) : (
        <Moon className="h-[1.15rem] w-[1.15rem]" />
      )}
    </Button>
  );
}
