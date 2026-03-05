/**
 * UseCase: Obtener el historial de cambios de una tarea.
 * Delega en IHistoryRepository del módulo History (inyectado desde el Composition Root).
 */

import type { IHistoryRepository } from "@modules/history/infrastructure/persistence/HistoryRepository.ts";
import type { HistoryEntryDTO } from "@modules/history/application/dtos/HistoryDTO.ts";
import { historyEntryToDTO } from "@modules/history/application/dtos/mappers.ts";

/**
 * Obtiene el historial de cambios de una tarea ordenado cronológicamente.
 */
export class GetTaskHistory {
  constructor(private readonly historyRepository: IHistoryRepository) {}

  /**
   * @param taskId - ID de la tarea.
   * @returns Array de HistoryEntryDTO ordenados de más antiguo a más reciente.
   */
  async execute(taskId: string): Promise<HistoryEntryDTO[]> {
    const entries = await this.historyRepository.findByEntity("task", taskId);
    return entries.map(historyEntryToDTO);
  }
}
