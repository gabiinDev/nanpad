/**
 * DTOs del módulo Settings (preferencias de aplicación).
 * Contrato entre el módulo y el resto de la app.
 */

/** Claves conocidas de preferencias. */
export type AppSettingsKey =
  | "theme"
  | "high_performance"
  | "default_task_view"
  | "show_help_icon";

/** Preferencias de aplicación tipadas. */
export interface AppSettingsDTO {
  theme: "light" | "dark";
  high_performance: boolean;
  default_task_view: "list" | "kanban";
  show_help_icon: boolean;
}

/** Input para SaveAppSetting. */
export interface SaveAppSettingInput {
  key: AppSettingsKey;
  value: string | boolean;
}
