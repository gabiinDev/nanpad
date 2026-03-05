/**
 * Hook de gestión de tema y modo High Performance.
 * Lee y persiste en el store de preferencias (DB); aplica clases en <html>.
 * Solo debe usarse dentro de AppProvider (depende de useApp).
 */

import { useCallback } from "react";
import { useApp } from "@app/AppContext.tsx";
import { useAppSettingsStore } from "@/store/useAppSettingsStore.ts";

export type Theme = "light" | "dark";

/** Valores y acciones expuestos por useTheme. */
export interface ThemeState {
  theme: Theme;
  highPerf: boolean;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  toggleHighPerf: () => void;
}

/**
 * Gestiona el tema claro/oscuro y el modo High Performance desde el store (persistido en DB).
 */
export function useTheme(): ThemeState {
  const uc = useApp();
  const theme = useAppSettingsStore((s) => s.theme);
  const highPerf = useAppSettingsStore((s) => s.high_performance);

  const setTheme = useCallback(
    (t: Theme) => {
      void useAppSettingsStore.getState().setTheme(uc, t);
    },
    [uc]
  );

  const toggleTheme = useCallback(() => {
    void useAppSettingsStore.getState().setTheme(uc, theme === "dark" ? "light" : "dark");
  }, [uc, theme]);

  const toggleHighPerf = useCallback(() => {
    void useAppSettingsStore.getState().setHighPerf(uc, !highPerf);
  }, [uc, highPerf]);

  return { theme, highPerf, setTheme, toggleTheme, toggleHighPerf };
}
