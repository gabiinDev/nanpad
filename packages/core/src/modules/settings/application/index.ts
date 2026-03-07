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

export type { IAppSettingsRepository } from "../infrastructure/persistence/AppSettingsRepository";
export { AppSettingsSqliteRepository } from "../infrastructure/persistence/sqlite/AppSettingsSqliteRepository";
