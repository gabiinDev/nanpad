/**
 * API pública del módulo History.
 * SOLO se exportan UseCases, DTOs y contratos necesarios para el exterior.
 */

// ─── UseCases y Listener ─────────────────────────────────────────────────────
export { RecordChange } from "./usecases/RecordChange.ts";
export { GetEntityHistory } from "./usecases/GetEntityHistory.ts";
export { HistoryEventListener } from "./usecases/HistoryEventListener.ts";

// ─── DTOs ────────────────────────────────────────────────────────────────────
export type {
  HistoryEntryDTO,
  RecordChangeInput,
  GetEntityHistoryInput,
} from "./dtos/HistoryDTO.ts";

// ─── Tipos de dominio necesarios externamente ────────────────────────────────
export type { HistoryAction } from "../domain/entities/HistoryEntry.ts";

// ─── Contrato del repositorio ────────────────────────────────────────────────
export type { IHistoryRepository } from "../infrastructure/persistence/HistoryRepository.ts";

// ─── Implementación SQLite (solo para el Composition Root) ───────────────────
export { HistorySqliteRepository } from "../infrastructure/persistence/sqlite/HistorySqliteRepository.ts";
