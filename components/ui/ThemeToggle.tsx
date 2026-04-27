'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const iconClassName = 'h-5 w-5';

  return (
    <button
      type="button"
      onClick={() => void toggleTheme()}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      data-tour="theme-toggle"
      className="inline-flex items-center justify-center rounded-md border border-secondary/40 p-2 transition-colors hover:bg-secondary/20"
    >
      {isDark ? (
        <Sun className={iconClassName} />
      ) : (
        <Moon className={iconClassName} />
      )}
    </button>
  );
}
