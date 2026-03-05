/**
 * Hook de gestión de tema y modo High Performance.
 * Persiste la preferencia en localStorage y sincroniza clases en <html>.
 */

import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_THEME = "nanpad-theme";
const STORAGE_HIPERF = "nanpad-high-performance";

function readTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_THEME);
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readHighPerf(): boolean {
  return localStorage.getItem(STORAGE_HIPERF) === "true";
}

function applyTheme(theme: Theme, highPerf: boolean): void {
  const html = document.documentElement;
  // Aplicar ambas clases para que el CSS las detecte correctamente
  html.classList.toggle("dark", theme === "dark");
  html.classList.toggle("light", theme === "light");
  html.classList.toggle("high-performance", highPerf);
}

/** Valores y acciones expuestos por useTheme. */
export interface ThemeState {
  theme: Theme;
  highPerf: boolean;
  /** Alterna entre claro y oscuro. */
  toggleTheme: () => void;
  /** Activa un tema concreto. */
  setTheme: (t: Theme) => void;
  /** Alterna el modo High Performance. */
  toggleHighPerf: () => void;
}

/**
 * Gestiona el tema claro/oscuro y el modo High Performance.
 * Aplica clases CSS en `<html>` y persiste la preferencia.
 */
export function useTheme(): ThemeState {
  const [theme, setThemeState] = useState<Theme>(readTheme);
  const [highPerf, setHighPerf] = useState<boolean>(readHighPerf);

  // Aplicar clases al montar y cuando cambien los valores
  useEffect(() => {
    applyTheme(theme, highPerf);
    localStorage.setItem(STORAGE_THEME, theme);
  }, [theme, highPerf]);

  useEffect(() => {
    applyTheme(theme, highPerf);
    localStorage.setItem(STORAGE_HIPERF, String(highPerf));
  }, [highPerf, theme]);

  const toggleTheme = useCallback(() => {
    setThemeState((t) => (t === "dark" ? "light" : "dark"));
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleHighPerf = useCallback(() => {
    setHighPerf((v) => !v);
  }, []);

  return { theme, highPerf, toggleTheme, setTheme, toggleHighPerf };
}
