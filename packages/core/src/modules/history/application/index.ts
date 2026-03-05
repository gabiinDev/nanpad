/**
 * API pública del módulo History.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 */

// ─── UseCases y Listener ─────────────────────────────────────────────────────
export { RecordChange } from "./usecases/RecordChange";
export { GetEntityHistory } from "./usecases/GetEntityHistory";
export { HistoryEventListener } from "./usecases/HistoryEventListener";

// ─── DTOs ────────────────────────────────────────────────────────────────────
export type {
  HistoryEntryDTO,
  RecordChangeInput,
  GetEntityHistoryInput,
} from "./dtos/HistoryDTO";

// ─── Tipos de dominio necesarios externamente ────────────────────────────────
export type { HistoryAction } from "../domain/entities/HistoryEntry";

// ─── Contrato del repositorio ────────────────────────────────────────────────
export type { IHistoryRepository } from "../infrastructure/persistence/HistoryRepository";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { HistorySqliteRepository } from "../infrastructure/persistence/sqlite/HistorySqliteRepository";
