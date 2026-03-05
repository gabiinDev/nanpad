/**
 * UseCase: Obtener el historial de cambios de una entidad específica.
 */

import type { IHistoryRepository } from "../../infrastructure/persistence/HistoryRepository";
import type { GetEntityHistoryInput, HistoryEntryDTO } from "../dtos/HistoryDTO";
import { historyEntryToDTO } from "../dtos/mappers";

/**
 * Recupera el historial de una entidad ordenado cronológicamente.
 */
export class GetEntityHistory {
  constructor(private readonly historyRepository: IHistoryRepository) {}

  /**
   * @param input - Tipo e ID de la entidad cuyo historial se consulta.
   * @returns Array de HistoryEntryDTO ordenados de más antiguo a más reciente.
   */
  async execute(input: GetEntityHistoryInput): Promise<HistoryEntryDTO[]> {
    const entries = await this.historyRepository.findByEntity(
      input.entityType,
      input.entityId
    );
    return entries.map(historyEntryToDTO);
  }
}
