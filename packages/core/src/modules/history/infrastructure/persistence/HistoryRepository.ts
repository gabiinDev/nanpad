/**
 * Interfaz del repositorio de historial.
 * Define el contrato de persistencia para el módulo History.
 */

import type { HistoryEntry } from "../../domain/entities/HistoryEntry.ts";
import type { EntityId } from "@shared/types/id.ts";

/**
 * Contrato del repositorio de registros de historial.
 * Los registros son inmutables: solo se insertan, nunca se modifican.
 */
export interface IHistoryRepository {
  /**
   * Persiste un nuevo registro de historial.
   * @param entry - Registro a guardar.
   */
  save(entry: HistoryEntry): Promise<void>;

  /**
   * Devuelve todos los registros de una entidad ordenados por fecha ascendente.
   * @param entityType - Tipo de entidad ("task", "category", "document", etc.).
   * @param entityId - ID de la entidad.
   * @returns Array de registros ordenados cronológicamente.
   */
  findByEntity(entityType: string, entityId: EntityId): Promise<HistoryEntry[]>;

  /**
   * Devuelve todos los registros de un tipo de entidad.
   * Útil para auditorías globales.
   * @param entityType - Tipo de entidad.
   * @returns Array de registros del tipo indicado.
   */
  findByEntityType(entityType: string): Promise<HistoryEntry[]>;
}
