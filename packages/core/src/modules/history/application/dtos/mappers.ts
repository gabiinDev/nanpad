/**
 * Funciones de mapeo entre entidades de dominio y DTOs del módulo History.
 */

import type { HistoryEntry } from "../../domain/entities/HistoryEntry";
import type { HistoryEntryDTO } from "./HistoryDTO";

/**
 * Convierte una entidad HistoryEntry a su DTO.
 * @param entry - Entidad de dominio.
 * @returns DTO serializable del registro de historial.
 */
export function historyEntryToDTO(entry: HistoryEntry): HistoryEntryDTO {
  return {
    id: entry.id,
    entityType: entry.entityType,
    entityId: entry.entityId,
    action: entry.action,
    fieldName: entry.fieldName,
    oldValue: entry.oldValue,
    newValue: entry.newValue,
    createdAt: entry.createdAt.toISOString(),
  };
}
