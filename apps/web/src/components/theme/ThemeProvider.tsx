"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark", "oled"]}
      disableTransitionOnChange
      storageKey="rgs-theme"
    >
      {children}
    </NextThemesProvider>
  );
}