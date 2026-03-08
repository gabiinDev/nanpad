/**
 * API pública del módulo Settings.
 * Solo UseCases, DTOs y contrato del repositorio.
 */

export { GetAppSettings, DEFAULTS } from "./usecases/GetAppSettings";
export { SaveAppSetting } from "./usecases/SaveAppSetting";

export type {
  AppSettingsKey,
  AppSettingsDTO,
  SaveAppSettingInput,
} from "./dtos/AppSettingsDTO";

export type { IAppSettingsRepository } from "@modules/settings/infrastructure/persistence/AppSettingsRepository";
export { AppSettingsSqliteRepository } from "@modules/settings/infrastructure/persistence/sqlite/AppSettingsSqliteRepository";
