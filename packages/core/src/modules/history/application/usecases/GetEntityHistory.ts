/**
 * UseCase: Obtener el historial de cambios de una entidad específica.
 * Soporta paginación con limit y offset.
 */

import type { IHistoryRepository } from "../../infrastructure/persistence/HistoryRepository";
import type { GetEntityHistoryInput, GetEntityHistoryOutput } from "../dtos/HistoryDTO";
import { historyEntryToDTO } from "../dtos/mappers";

/**
 * Recupera el historial de una entidad ordenado cronológicamente.
 * Con limit/offset devuelve solo esa página y el total para paginación.
 */
export class GetEntityHistory {
  constructor(private readonly historyRepository: IHistoryRepository) {}

  /**
   * @param input - Tipo e ID de la entidad; opcionalmente limit y offset.
   * @returns Entradas de la página actual y total de registros.
   */
  async execute(input: GetEntityHistoryInput): Promise<GetEntityHistoryOutput> {
    const options =
      input.limit != null || (input.offset != null && input.offset > 0)
        ? { limit: input.limit, offset: input.offset ?? 0 }
        : undefined;
    const [entries, total] = await Promise.all([
      this.historyRepository.findByEntity(input.entityType, input.entityId, options),
      this.historyRepository.countByEntity(input.entityType, input.entityId),
    ]);
    return {
      entries: entries.map(historyEntryToDTO),
      total,
    };
  }
}
