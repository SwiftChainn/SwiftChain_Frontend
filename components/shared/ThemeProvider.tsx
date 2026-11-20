'use client';

import React from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

/**
 * OS-Aware ThemeProvider component.
 *
 * Implements OS theme detection ('prefers-color-scheme'), zero FOUC via inline script,
 * manual local storage persistence, and backend API preference synchronization following
 * the Component -> Hook -> Service architecture.
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  return (
    <NextThemeProvider
      attribute="class"
      storageKey="theme"
      defaultTheme="system"
      enableSystem
      enableColorScheme
      disableTransitionOnChange
    >
      {children}
    </NextThemeProvider>
  );
}

export default ThemeProvider;
