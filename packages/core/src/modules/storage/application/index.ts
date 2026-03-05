/**
 * API pública del módulo Storage.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 */

// ─── UseCases ────────────────────────────────────────────────────────────────
export { ExportWorkspace } from "./usecases/ExportWorkspace.ts";
export { ImportWorkspace } from "./usecases/ImportWorkspace.ts";
export { BackupNow } from "./usecases/BackupNow.ts";

// ─── DTOs ─────────────────────────────────────────────────────────────────────
export type {
  WorkspaceSnapshot,
  ExportWorkspaceInput,
  ExportWorkspaceResult,
  ImportWorkspaceInput,
  ImportWorkspaceResult,
  BackupResult,
} from "./dtos/StorageDTO.ts";

// ─── Puerto de infraestructura (el Composition Root debe implementarlo) ───────
export type { IStoragePort } from "@modules/storage/infrastructure/IStoragePort.ts";
