"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = theme === "dark" || theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px',
        borderRadius: '12px',
        width: '100%',
        border: '1.5px solid',
        borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#e2e8f0',
        background: isDark ? 'rgba(255,255,255,0.1)' : '#f1f5f9',
        color: isDark ? '#e2e8f0' : '#334155',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        fontFamily: 'inherit',
      }}
      aria-label="Toggle Dark Mode"
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '32px',
        height: '32px',
        borderRadius: '10px',
        background: isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.12)',
        color: isDark ? '#a5b4fc' : '#6366f1',
        flexShrink: 0,
      }}>
        {isDark ? (
          <Sun size={18} strokeWidth={2.5} />
        ) : (
          <Moon size={18} strokeWidth={2.5} />
        )}
      </div>
      <span style={{
        fontWeight: 700,
        fontSize: '0.88rem',
        color: isDark ? '#e2e8f0' : '#334155',
      }}>
        {isDark ? "Iftiin (Light)" : "Habeen (Dark)"}
      </span>
    </button>
  );
}
