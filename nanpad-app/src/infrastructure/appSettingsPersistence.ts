/**
 * Persistencia de preferencias de app en SQLite (tabla app_settings).
 * Claves: theme, high_performance, default_task_view, show_help_icon.
 */

import type { IDatabase } from "@nanpad/core";

export type AppSettingsKey =
  | "theme"
  | "high_performance"
  | "default_task_view"
  | "show_help_icon";

export interface AppSettings {
  theme: "light" | "dark";
  high_performance: boolean;
  default_task_view: "list" | "kanban";
  show_help_icon: boolean;
}

const DEFAULTS: AppSettings = {
  theme: "dark",
  high_performance: false,
  default_task_view: "kanban",
  show_help_icon: true,
};

const KEYS: AppSettingsKey[] = [
  "theme",
  "high_performance",
  "default_task_view",
  "show_help_icon",
];

/**
 * Carga las preferencias desde la base de datos.
 * Si no hay filas, devuelve valores por defecto.
 */
export async function loadAppSettingsFromDb(
  db: IDatabase
): Promise<AppSettings> {
  const rows = await db.select<{ key: string; value: string }[]>(
    "SELECT key, value FROM app_settings WHERE key IN (?, ?, ?, ?)",
    KEYS as unknown as string[]
  );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    theme: (map.get("theme") === "light" ? "light" : "dark") as AppSettings["theme"],
    high_performance: map.get("high_performance") === "true",
    default_task_view:
      map.get("default_task_view") === "list" ? "list" : "kanban",
    show_help_icon: map.get("show_help_icon") !== "false",
  };
}

/**
 * Guarda una preferencia en la base de datos.
 */
export async function saveAppSettingToDb(
  db: IDatabase,
  key: AppSettingsKey,
  value: string | boolean
): Promise<void> {
  const v = typeof value === "boolean" ? String(value) : value;
  await db.execute(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, v]
  );
}

export { DEFAULTS };
