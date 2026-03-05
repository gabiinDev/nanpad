/**
 * API pública del módulo Storage.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 */

// ─── UseCases ────────────────────────────────────────────────────────────────
export { ExportWorkspace } from "./usecases/ExportWorkspace";
export { ImportWorkspace } from "./usecases/ImportWorkspace";
export { BackupNow } from "./usecases/BackupNow";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export type {
  WorkspaceSnapshot,
  ExportWorkspaceInput,
  ExportWorkspaceResult,
  ImportWorkspaceInput,
  ImportWorkspaceResult,
  BackupResult,
} from "./dtos/StorageDTO";

// ─── Puerto de infraestructura (el Composition Root debe implementarlo) ───────
export type { IStoragePort } from "@modules/storage/infrastructure/IStoragePort";
