import { useCallback, useEffect } from 'react';
import { useTheme as useNextTheme } from 'next-themes';
import { themeService, type ThemePreference } from '@/services/themeService';

export function useTheme() {
  const { theme, resolvedTheme, setTheme } = useNextTheme();

  useEffect(() => {
    let isMounted = true;

    const loadThemePreference = async () => {
      try {
        const data = await themeService.getThemePreference();
        if (!isMounted) {
          return;
        }
        setTheme(data.theme);
      } catch {
        // Keep next-themes default behavior (system) on failures.
      }
    };

    void loadThemePreference();

    return () => {
      isMounted = false;
    };
  }, [setTheme]);

  const updateTheme = useCallback(
    async (nextTheme: ThemePreference): Promise<void> => {
      setTheme(nextTheme);

      try {
        await themeService.saveThemePreference(nextTheme);
      } catch {
        // Persist failure should not block UI theme switch.
      }
    },
    [setTheme]
  );

  const toggleTheme = useCallback(async (): Promise<void> => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    await updateTheme(nextTheme);
  }, [resolvedTheme, updateTheme]);

  return {
    theme,
    resolvedTheme,
    setTheme: updateTheme,
    toggleTheme,
  };
}
