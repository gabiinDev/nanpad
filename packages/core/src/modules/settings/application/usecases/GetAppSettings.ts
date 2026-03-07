/**
 * UseCase: Obtener las preferencias de aplicación.
 */

import type { IAppSettingsRepository } from "../../infrastructure/persistence/AppSettingsRepository";
import type { AppSettingsDTO } from "../dtos/AppSettingsDTO";

const DEFAULTS: AppSettingsDTO = {
  theme: "dark",
  high_performance: false,
  default_task_view: "kanban",
  show_help_icon: true,
};

export class GetAppSettings {
  constructor(private readonly repository: IAppSettingsRepository) {}

  /**
   * @returns Preferencias actuales, con valores por defecto para claves ausentes.
   */
  async execute(): Promise<AppSettingsDTO> {
    const raw = await this.repository.getAll();
    return {
      theme: raw.theme === "light" ? "light" : "dark",
      high_performance: raw.high_performance === "true",
      default_task_view: raw.default_task_view === "list" ? "list" : "kanban",
      show_help_icon: raw.show_help_icon !== "false",
    };
  }
}

export { DEFAULTS };
