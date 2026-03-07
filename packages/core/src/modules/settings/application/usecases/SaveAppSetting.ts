/**
 * UseCase: Guardar una preferencia de aplicación.
 */

import type { IAppSettingsRepository } from "../../infrastructure/persistence/AppSettingsRepository";
import type { SaveAppSettingInput } from "../dtos/AppSettingsDTO";

export class SaveAppSetting {
  constructor(private readonly repository: IAppSettingsRepository) {}

  /**
   * @param input - Clave y valor (string o boolean).
   */
  async execute(input: SaveAppSettingInput): Promise<void> {
    const value = typeof input.value === "boolean" ? String(input.value) : input.value;
    await this.repository.set(input.key, value);
  }
}
