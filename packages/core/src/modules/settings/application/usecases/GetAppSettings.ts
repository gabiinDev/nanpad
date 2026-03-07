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
  mcp_enabled: false,
  mcp_port: 4242,
};

export class GetAppSettings {
  constructor(private readonly repository: IAppSettingsRepository) {}

  /**
   * @returns Preferencias actuales, con valores por defecto para claves ausentes.
   */
  async execute(): Promise<AppSettingsDTO> {
    const raw = await this.repository.getAll();
    const port = raw.mcp_port !== undefined ? parseInt(raw.mcp_port, 10) : DEFAULTS.mcp_port;
    return {
      theme: raw.theme === "light" ? "light" : "dark",
      high_performance: raw.high_performance === "true",
      default_task_view: raw.default_task_view === "list" ? "list" : "kanban",
      show_help_icon: raw.show_help_icon !== "false",
      mcp_enabled: raw.mcp_enabled === "true",
      mcp_port: Number.isFinite(port) && port > 0 && port < 65536 ? port : DEFAULTS.mcp_port,
    };
  }
}

export { DEFAULTS };
