/**
 * Store de preferencias de app (tema, high performance, vista por defecto tareas, icono ayuda).
 * Se hidrata desde DB al iniciar; los cambios se persisten en SQLite.
 */

import { create } from "zustand";
import type { AppUseCases } from "@app/composition.ts";
import type { AppSettingsDTO } from "@nanpad/core";
import { AppSettingsDefaults as DEFAULTS } from "@nanpad/core";

function applyThemeToDocument(
  theme: "light" | "dark",
  highPerf: boolean
): void {
  const html = document.documentElement;
  html.classList.toggle("dark", theme === "dark");
  html.classList.toggle("light", theme === "light");
  html.classList.toggle("high-performance", highPerf);
}

// Aplicar tema por defecto al cargar el módulo (evita flash antes de load desde DB)
applyThemeToDocument(DEFAULTS.theme, DEFAULTS.high_performance);

interface AppSettingsStore extends AppSettingsDTO {
  loaded: boolean;

  /** Carga preferencias desde DB y aplica tema. */
  load: (uc: AppUseCases) => Promise<void>;

  setTheme: (uc: AppUseCases, theme: "light" | "dark") => Promise<void>;
  setHighPerf: (uc: AppUseCases, value: boolean) => Promise<void>;
  setDefaultTaskView: (uc: AppUseCases, view: "list" | "kanban") => Promise<void>;
  setShowHelpIcon: (uc: AppUseCases, value: boolean) => Promise<void>;
}

export const useAppSettingsStore = create<AppSettingsStore>((set, get) => ({
  ...DEFAULTS,
  loaded: false,

  load: async (uc) => {
    try {
      const settings = await uc.loadAppSettings();
      set({ ...settings, loaded: true });
      applyThemeToDocument(settings.theme, settings.high_performance);
    } catch {
      set({ loaded: true });
      applyThemeToDocument(get().theme, get().high_performance);
    }
  },

  setTheme: async (uc, theme) => {
    set({ theme });
    applyThemeToDocument(theme, get().high_performance);
    await uc.saveAppSetting("theme", theme);
  },

  setHighPerf: async (uc, value) => {
    set({ high_performance: value });
    applyThemeToDocument(get().theme, value);
    await uc.saveAppSetting("high_performance", value);
  },

  setDefaultTaskView: async (uc, view) => {
    set({ default_task_view: view });
    await uc.saveAppSetting("default_task_view", view);
  },

  setShowHelpIcon: async (uc, value) => {
    set({ show_help_icon: value });
    await uc.saveAppSetting("show_help_icon", value);
  },
}));
